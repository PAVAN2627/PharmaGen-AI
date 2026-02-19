import { ContradictionDetector } from './contradictionDetector';
import { DetectedVariant } from '../types';

describe('ContradictionDetector - Unit Tests', () => {
  let detector: ContradictionDetector;

  beforeEach(() => {
    detector = new ContradictionDetector();
  });

  describe('extractBiologicalClaims', () => {
    it('should extract enzyme activity increase claims', () => {
      const explanation = 'The CYP2D6 enzyme activity is increased by rs1234567.';
      const claims = detector.extractBiologicalClaims(explanation);

      expect(claims.length).toBeGreaterThan(0);
      const enzymeClaim = claims.find(c => c.type === 'enzyme_activity');
      expect(enzymeClaim).toBeDefined();
      expect(enzymeClaim?.direction).toBe('increase');
      expect(enzymeClaim?.subject).toBe('CYP2D6');
      expect(enzymeClaim?.variantMentioned).toBe('rs1234567');
    });

    it('should extract enzyme activity decrease claims', () => {
      const explanation = 'The variant *2 reduces CYP2C19 enzyme activity significantly.';
      const claims = detector.extractBiologicalClaims(explanation);

      expect(claims.length).toBeGreaterThan(0);
      const enzymeClaim = claims.find(c => c.type === 'enzyme_activity');
      expect(enzymeClaim).toBeDefined();
      expect(enzymeClaim?.direction).toBe('decrease');
      expect(enzymeClaim?.variantMentioned).toBe('*2');
    });

    it('should extract enzyme activity elimination claims', () => {
      const explanation = 'This variant eliminates TPMT enzyme function completely.';
      const claims = detector.extractBiologicalClaims(explanation);

      expect(claims.length).toBeGreaterThan(0);
      const enzymeClaim = claims.find(c => c.type === 'enzyme_activity');
      expect(enzymeClaim).toBeDefined();
      expect(enzymeClaim?.direction).toBe('eliminate');
      expect(enzymeClaim?.subject).toBe('TPMT');
    });

    it('should extract drug efficacy claims', () => {
      const explanation = 'The efficacy of codeine is decreased in patients with this variant.';
      const claims = detector.extractBiologicalClaims(explanation);

      expect(claims.length).toBeGreaterThan(0);
      const efficacyClaim = claims.find(c => c.type === 'drug_efficacy');
      expect(efficacyClaim).toBeDefined();
      expect(efficacyClaim?.direction).toBe('decrease');
      expect(efficacyClaim?.subject).toContain('codeine');
    });

    it('should extract multiple claims from complex explanation', () => {
      const explanation = 
        'The variant rs1234567 in CYP2D6 decreases enzyme activity. ' +
        'This leads to reduced efficacy of codeine. ' +
        'Another variant rs7654321 increases CYP2C19 metabolism.';
      
      const claims = detector.extractBiologicalClaims(explanation);

      expect(claims.length).toBeGreaterThanOrEqual(3);
      expect(claims.filter(c => c.type === 'enzyme_activity').length).toBeGreaterThanOrEqual(2);
      expect(claims.filter(c => c.type === 'drug_efficacy').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle explanation with no biological claims', () => {
      const explanation = 'This is a general statement about genetics.';
      const claims = detector.extractBiologicalClaims(explanation);

      expect(claims.length).toBe(0);
    });
  });

  describe('checkEnzymeActivityConsistency', () => {
    it('should detect contradiction for no_function variant claimed to increase activity', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '22',
        position: '42126611',
        gene: 'CYP2D6',
        functionalStatus: 'no_function'
      };

      const explanation = 'The variant rs1234567 in CYP2D6 increases enzyme activity.';
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkEnzymeActivityConsistency(claims, [variant]);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].type).toBe('enzyme_activity_mismatch');
      expect(contradictions[0].severity).toBe('high');
      expect(contradictions[0].affectedVariant).toBe('rs1234567');
    });

    it('should detect contradiction for decreased variant claimed to increase activity', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '10',
        position: '96522463',
        gene: 'CYP2C19',
        functionalStatus: 'decreased'
      };

      const explanation = 'The CYP2C19 enzyme activity is increased by rs1234567.';
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkEnzymeActivityConsistency(claims, [variant]);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].type).toBe('enzyme_activity_mismatch');
      expect(contradictions[0].severity).toBe('medium');
    });

    it('should detect contradiction for increased variant claimed to decrease activity', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '10',
        position: '96522463',
        gene: 'CYP2C19',
        star_allele: '*17',
        functionalStatus: 'increased'
      };

      const explanation = 'The variant *17 in CYP2C19 decreases enzyme activity.';
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkEnzymeActivityConsistency(claims, [variant]);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].type).toBe('enzyme_activity_mismatch');
      // Should match either rsid or star_allele
      expect(['rs1234567', '*17']).toContain(contradictions[0].affectedVariant);
    });

    it('should not detect contradiction when functional status matches claim', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '10',
        position: '96522463',
        gene: 'CYP2C19',
        functionalStatus: 'decreased'
      };

      const explanation = 'The variant rs1234567 in CYP2C19 decreases enzyme activity.';
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkEnzymeActivityConsistency(claims, [variant]);

      expect(contradictions.length).toBe(0);
    });

    it('should handle multiple variants correctly', () => {
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs1234567',
          chromosome: '22',
          position: '42126611',
          gene: 'CYP2D6',
          functionalStatus: 'no_function'
        },
        {
          rsid: 'rs7654321',
          chromosome: '10',
          position: '96522463',
          gene: 'CYP2C19',
          functionalStatus: 'decreased'
        }
      ];

      const explanation = 
        'The variant rs1234567 in CYP2D6 increases enzyme activity. ' +
        'The variant rs7654321 in CYP2C19 decreases enzyme activity.';
      
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkEnzymeActivityConsistency(claims, variants);

      // Should detect contradiction for rs1234567 but not rs7654321
      expect(contradictions.length).toBe(1);
      expect(contradictions[0].affectedVariant).toBe('rs1234567');
    });
  });

  describe('checkInternalConsistency', () => {
    it('should detect contradiction when same variant has opposing effects', () => {
      const explanation = 
        'The variant rs1234567 increases CYP2D6 enzyme activity. ' +
        'However, rs1234567 also decreases CYP2D6 enzyme activity.';
      
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkInternalConsistency(claims);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].type).toBe('internal_contradiction');
      expect(contradictions[0].severity).toBe('high');
      expect(contradictions[0].affectedVariant).toBe('rs1234567');
    });

    it('should detect contradiction when same gene has opposing effects', () => {
      const explanation = 
        'CYP2D6 enzyme activity is increased by genetic variants. ' +
        'CYP2D6 metabolism is also decreased in this patient.';
      
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkInternalConsistency(claims);

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].type).toBe('internal_contradiction');
    });

    it('should not detect contradiction for consistent claims', () => {
      const explanation = 
        'The variant rs1234567 decreases CYP2D6 enzyme activity. ' +
        'This reduced activity leads to impaired metabolism.';
      
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkInternalConsistency(claims);

      expect(contradictions.length).toBe(0);
    });

    it('should not detect contradiction for different variants with different effects', () => {
      const explanation = 
        'The variant rs1234567 increases CYP2D6 enzyme activity. ' +
        'The variant rs7654321 decreases CYP2C19 enzyme activity.';
      
      const claims = detector.extractBiologicalClaims(explanation);
      const contradictions = detector.checkInternalConsistency(claims);

      expect(contradictions.length).toBe(0);
    });
  });

  describe('detectContradictions', () => {
    it('should return no contradictions for consistent explanation', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '22',
        position: '42126611',
        gene: 'CYP2D6',
        functionalStatus: 'decreased'
      };

      const explanation = 
        'The variant rs1234567 in CYP2D6 decreases enzyme activity. ' +
        'This leads to reduced metabolism of codeine and decreased drug efficacy.';
      
      const result = detector.detectContradictions(explanation, [variant]);

      expect(result.hasContradictions).toBe(false);
      expect(result.contradictions.length).toBe(0);
      expect(result.claimsAnalyzed).toBeGreaterThan(0);
    });

    it('should detect enzyme activity contradictions', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '22',
        position: '42126611',
        gene: 'CYP2D6',
        functionalStatus: 'no_function'
      };

      const explanation = 'The variant rs1234567 in CYP2D6 increases enzyme activity significantly.';
      
      const result = detector.detectContradictions(explanation, [variant]);

      expect(result.hasContradictions).toBe(true);
      expect(result.contradictions.length).toBeGreaterThan(0);
      expect(result.contradictions[0].type).toBe('enzyme_activity_mismatch');
    });

    it('should detect internal contradictions', () => {
      const explanation = 
        'The variant rs1234567 increases CYP2D6 enzyme activity. ' +
        'The same variant rs1234567 also decreases CYP2D6 activity.';
      
      const result = detector.detectContradictions(explanation, []);

      expect(result.hasContradictions).toBe(true);
      expect(result.contradictions.length).toBeGreaterThan(0);
      expect(result.contradictions[0].type).toBe('internal_contradiction');
    });

    it('should detect multiple types of contradictions', () => {
      const variant: DetectedVariant = {
        rsid: 'rs1234567',
        chromosome: '22',
        position: '42126611',
        gene: 'CYP2D6',
        functionalStatus: 'no_function'
      };

      const explanation = 
        'The variant rs1234567 in CYP2D6 increases enzyme activity. ' +
        'However, rs1234567 also decreases enzyme activity.';
      
      const result = detector.detectContradictions(explanation, [variant]);

      expect(result.hasContradictions).toBe(true);
      expect(result.contradictions.length).toBeGreaterThanOrEqual(2);
      
      const types = result.contradictions.map(c => c.type);
      expect(types).toContain('enzyme_activity_mismatch');
      expect(types).toContain('internal_contradiction');
    });

    it('should handle explanation with no biological claims', () => {
      const explanation = 'This is a general statement about genetics without specific claims.';
      
      const result = detector.detectContradictions(explanation, []);

      expect(result.hasContradictions).toBe(false);
      expect(result.contradictions.length).toBe(0);
      expect(result.claimsAnalyzed).toBe(0);
    });

    it('should handle empty variants array', () => {
      const explanation = 'The CYP2D6 enzyme activity is increased by genetic variants.';
      
      const result = detector.detectContradictions(explanation, []);

      // Should still extract claims and check internal consistency
      expect(result.claimsAnalyzed).toBeGreaterThan(0);
      // May or may not have contradictions depending on internal consistency
    });
  });
});
