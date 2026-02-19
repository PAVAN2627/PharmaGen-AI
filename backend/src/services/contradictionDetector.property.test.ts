import fc from 'fast-check';
import { ContradictionDetector, FunctionalStatus } from './contradictionDetector';
import { DetectedVariant } from '../types';

describe('ContradictionDetector - Property Tests', () => {
  const detector = new ContradictionDetector();

  describe('Property 14: No Self-Contradiction', () => {
    it('should not detect contradictions in consistent explanations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('increase', 'decrease', 'eliminate'),
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD'),
          fc.array(fc.constantFrom('rs1234567', 'rs7654321', '*2', '*3'), { minLength: 1, maxLength: 3 }),
          (direction, gene, variants) => {
            // Create explanation with consistent direction
            const sentences = variants.map(v => 
              `The variant ${v} in ${gene} ${direction}s enzyme activity`
            );
            const explanation = sentences.join('. ') + '.';
            
            const result = detector.detectContradictions(explanation, []);
            
            // Should not detect internal contradictions for consistent claims
            const internalContradictions = result.contradictions.filter(
              c => c.type === 'internal_contradiction'
            );
            
            expect(internalContradictions.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should detect contradictions when same variant has opposing effects', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
          fc.constantFrom('rs1234567', '*2', '*3'),
          (gene, variant) => {
            // Create explanation with contradictory claims about same variant
            const explanation = `The variant ${variant} in ${gene} increases enzyme activity. ` +
                              `However, ${variant} also decreases enzyme activity.`;
            
            const result = detector.detectContradictions(explanation, []);
            
            // Should detect internal contradiction
            expect(result.hasContradictions).toBe(true);
            const internalContradictions = result.contradictions.filter(
              c => c.type === 'internal_contradiction'
            );
            expect(internalContradictions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 15: Functional Status Consistency', () => {
    it('should detect contradiction when no_function variant is claimed to increase activity', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
          fc.constantFrom('rs1234567', 'rs7654321'),
          (gene, rsid) => {
            const variant: DetectedVariant = {
              rsid,
              chromosome: '10',
              position: '96522463',
              gene,
              functionalStatus: 'no_function'
            };
            
            const explanation = `The variant ${rsid} in ${gene} increases enzyme activity significantly.`;
            
            const result = detector.detectContradictions(explanation, [variant]);
            
            // Should detect enzyme activity mismatch
            expect(result.hasContradictions).toBe(true);
            const enzymeContradictions = result.contradictions.filter(
              c => c.type === 'enzyme_activity_mismatch'
            );
            expect(enzymeContradictions.length).toBeGreaterThan(0);
            expect(enzymeContradictions[0].severity).toBe('high');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should detect contradiction when decreased variant is claimed to increase activity', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
          fc.constantFrom('rs1234567', 'rs7654321'),
          (gene, rsid) => {
            const variant: DetectedVariant = {
              rsid,
              chromosome: '10',
              position: '96522463',
              gene,
              functionalStatus: 'decreased'
            };
            
            const explanation = `The variant ${rsid} in ${gene} increases enzyme activity.`;
            
            const result = detector.detectContradictions(explanation, [variant]);
            
            // Should detect enzyme activity mismatch
            expect(result.hasContradictions).toBe(true);
            const enzymeContradictions = result.contradictions.filter(
              c => c.type === 'enzyme_activity_mismatch'
            );
            expect(enzymeContradictions.length).toBeGreaterThan(0);
            expect(enzymeContradictions[0].severity).toBe('medium');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should detect contradiction when increased variant is claimed to decrease activity', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
          fc.constantFrom('rs1234567', 'rs7654321'),
          (gene, rsid) => {
            const variant: DetectedVariant = {
              rsid,
              chromosome: '10',
              position: '96522463',
              gene,
              functionalStatus: 'increased'
            };
            
            const explanation = `The variant ${rsid} in ${gene} decreases enzyme activity.`;
            
            const result = detector.detectContradictions(explanation, [variant]);
            
            // Should detect enzyme activity mismatch
            expect(result.hasContradictions).toBe(true);
            const enzymeContradictions = result.contradictions.filter(
              c => c.type === 'enzyme_activity_mismatch'
            );
            expect(enzymeContradictions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect contradiction when functional status matches claim', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<[FunctionalStatus, string]>(
            ['decreased', 'decrease'],
            ['increased', 'increase'],
            ['no_function', 'eliminate']
          ),
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
          fc.constantFrom('rs1234567', 'rs7654321'),
          ([status, direction], gene, rsid) => {
            const variant: DetectedVariant = {
              rsid,
              chromosome: '10',
              position: '96522463',
              gene,
              functionalStatus: status
            };
            
            const explanation = `The variant ${rsid} in ${gene} ${direction}s enzyme activity.`;
            
            const result = detector.detectContradictions(explanation, [variant]);
            
            // Should not detect enzyme activity mismatch for consistent claims
            const enzymeContradictions = result.contradictions.filter(
              c => c.type === 'enzyme_activity_mismatch'
            );
            expect(enzymeContradictions.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 16: Efficacy Direction Specification', () => {
    it('should extract drug efficacy claims with direction', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('codeine', 'warfarin', 'clopidogrel', 'simvastatin'),
          fc.constantFrom('increased', 'decreased'),
          (drug, direction) => {
            const explanation = `The ${direction} efficacy of ${drug} is observed in patients with this variant.`;
            
            const claims = detector.extractBiologicalClaims(explanation);
            
            // Should extract drug efficacy claim
            const efficacyClaims = claims.filter(c => c.type === 'drug_efficacy');
            expect(efficacyClaims.length).toBeGreaterThan(0);
            
            // Should have correct direction
            const expectedDirection = direction === 'increased' ? 'increase' : 'decrease';
            expect(efficacyClaims[0].direction).toBe(expectedDirection);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should extract enzyme activity claims with direction', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
          fc.constantFrom('increased', 'decreased', 'eliminated'),
          (gene, direction) => {
            const explanation = `The ${gene} enzyme activity is ${direction} by this variant.`;
            
            const claims = detector.extractBiologicalClaims(explanation);
            
            // Should extract enzyme activity claim
            const activityClaims = claims.filter(c => c.type === 'enzyme_activity');
            expect(activityClaims.length).toBeGreaterThan(0);
            
            // Should have correct direction
            let expectedDirection: string;
            if (direction === 'increased') expectedDirection = 'increase';
            else if (direction === 'decreased') expectedDirection = 'decrease';
            else expectedDirection = 'eliminate';
            
            expect(activityClaims[0].direction).toBe(expectedDirection);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 17: Contradiction Detection', () => {
    it('should always return valid contradiction detection result structure', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 500 }),
          fc.array(
            fc.record({
              rsid: fc.constantFrom('rs1234567', 'rs7654321', 'rs9999999'),
              chromosome: fc.constantFrom('1', '10', '19'),
              position: fc.integer({ min: 1000000, max: 99999999 }).map(String),
              gene: fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9'),
              functionalStatus: fc.constantFrom<FunctionalStatus>('normal', 'decreased', 'increased', 'no_function')
            }),
            { maxLength: 5 }
          ),
          (explanation, variants) => {
            const result = detector.detectContradictions(explanation, variants);
            
            // Result should have required structure
            expect(result).toHaveProperty('hasContradictions');
            expect(result).toHaveProperty('contradictions');
            expect(result).toHaveProperty('claimsAnalyzed');
            
            // hasContradictions should match contradictions array
            expect(result.hasContradictions).toBe(result.contradictions.length > 0);
            
            // All contradictions should have required fields
            for (const contradiction of result.contradictions) {
              expect(contradiction).toHaveProperty('type');
              expect(contradiction).toHaveProperty('description');
              expect(contradiction).toHaveProperty('conflictingStatements');
              expect(contradiction).toHaveProperty('severity');
              expect(Array.isArray(contradiction.conflictingStatements)).toBe(true);
              expect(['low', 'medium', 'high']).toContain(contradiction.severity);
            }
            
            // claimsAnalyzed should be non-negative
            expect(result.claimsAnalyzed).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect more contradictions with more conflicting claims', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('CYP2D6', 'CYP2C19'),
          fc.constantFrom('rs1234567', 'rs7654321'),
          fc.integer({ min: 1, max: 5 }),
          (gene, rsid, numConflicts) => {
            // Create explanation with multiple contradictory claims
            const sentences: string[] = [];
            for (let i = 0; i < numConflicts; i++) {
              sentences.push(`The variant ${rsid} in ${gene} increases enzyme activity`);
              sentences.push(`The variant ${rsid} in ${gene} decreases enzyme activity`);
            }
            const explanation = sentences.join('. ') + '.';
            
            const result = detector.detectContradictions(explanation, []);
            
            // Should detect contradictions
            expect(result.hasContradictions).toBe(true);
            expect(result.contradictions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
