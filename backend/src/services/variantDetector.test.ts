import { VariantDetector } from './variantDetector';
import { VCFVariant } from '../types';
import { KnownVariant } from '../data/pharmacogenomicVariants';

describe('VariantDetector - matchVariant', () => {
  const mockKnownVariants: KnownVariant[] = [
    {
      rsid: 'rs3892097',
      gene: 'CYP2D6',
      star_allele: '*4',
      chromosome: '22',
      position: 42130692,
      ref: 'C',
      alt: 'T',
      functional_status: 'no_function',
      clinical_significance: 'Non-functional allele',
      evidence_level: 'A',
      cpic_guideline: 'CPIC Guideline for CYP2D6',
      drugs_affected: ['codeine']
    },
    {
      rsid: 'rs4244285',
      gene: 'CYP2C19',
      star_allele: '*2',
      chromosome: '10',
      position: 94781859,
      ref: 'G',
      alt: 'A',
      functional_status: 'no_function',
      clinical_significance: 'Loss of function',
      evidence_level: 'A',
      cpic_guideline: 'CPIC Guideline for CYP2C19',
      drugs_affected: ['clopidogrel']
    }
  ];

  describe('Strategy 1: rsID matching', () => {
    it('should match by exact rsID with confidence 0.95', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '22',
        position: 42130692,
        rsid: 'rs3892097',
        ref: 'C',
        alt: 'T',
        quality: 30,
        filter: 'PASS',
        info: {}
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      expect(result.matched).toBe(true);
      expect(result.matchedBy).toBe('rsid');
      expect(result.confidence).toBe(0.95);
      expect(result.knownVariant?.rsid).toBe('rs3892097');
    });

    it('should not match when rsID is "."', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '22',
        position: 42130692,
        rsid: '.',
        ref: 'C',
        alt: 'T',
        quality: 30,
        filter: 'PASS',
        info: {}
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      // Should fall through to position matching
      expect(result.matched).toBe(true);
      expect(result.matchedBy).toBe('position');
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('Strategy 2: Position + ref + alt matching', () => {
    it('should match by position+ref+alt with confidence 0.85', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '10',
        position: 94781859,
        rsid: '.',
        ref: 'G',
        alt: 'A',
        quality: 30,
        filter: 'PASS',
        info: {}
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      expect(result.matched).toBe(true);
      expect(result.matchedBy).toBe('position');
      expect(result.confidence).toBe(0.85);
      expect(result.knownVariant?.rsid).toBe('rs4244285');
    });
  });

  describe('Strategy 3: STAR allele + gene matching', () => {
    it('should match by STAR allele and gene with confidence 0.70', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '22',
        position: 99999999, // Different position
        rsid: '.',
        ref: 'X',
        alt: 'Y',
        quality: 30,
        filter: 'PASS',
        info: {
          GENE: 'CYP2D6',
          STAR: '*4'
        },
        gene: 'CYP2D6',
        starAllele: '*4'
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      expect(result.matched).toBe(true);
      expect(result.matchedBy).toBe('star_allele');
      expect(result.confidence).toBe(0.70);
      expect(result.knownVariant?.star_allele).toBe('*4');
    });
  });

  describe('Strategy 4: Gene + position proximity matching', () => {
    it('should match by gene and position proximity with confidence 0.50', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '22',
        position: 42130695, // Within 10bp of 42130692
        rsid: '.',
        ref: 'X',
        alt: 'Y',
        quality: 30,
        filter: 'PASS',
        info: {
          GENE: 'CYP2D6'
        },
        gene: 'CYP2D6'
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      expect(result.matched).toBe(true);
      expect(result.matchedBy).toBe('position');
      expect(result.confidence).toBe(0.50);
      expect(result.knownVariant?.gene).toBe('CYP2D6');
    });

    it('should not match if position is too far away', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '22',
        position: 42130702, // More than 10bp away
        rsid: '.',
        ref: 'X',
        alt: 'Y',
        quality: 30,
        filter: 'PASS',
        info: {
          GENE: 'CYP2D6'
        },
        gene: 'CYP2D6'
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      expect(result.matched).toBe(false);
      expect(result.matchedBy).toBe(null);
      expect(result.confidence).toBe(0);
    });
  });

  describe('No match scenarios', () => {
    it('should return no match when variant does not match any strategy', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '99',
        position: 99999999,
        rsid: 'rs99999999',
        ref: 'X',
        alt: 'Y',
        quality: 30,
        filter: 'PASS',
        info: {}
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      expect(result.matched).toBe(false);
      expect(result.matchedBy).toBe(null);
      expect(result.confidence).toBe(0);
      expect(result.knownVariant).toBeUndefined();
    });
  });

  describe('Strategy priority', () => {
    it('should prefer rsID match over position match', () => {
      const vcfVariant: VCFVariant = {
        chromosome: '22',
        position: 42130692,
        rsid: 'rs3892097',
        ref: 'C',
        alt: 'T',
        quality: 30,
        filter: 'PASS',
        info: {}
      };

      const result = VariantDetector.matchVariant(vcfVariant, mockKnownVariants);

      // Should match by rsID (0.95) not position (0.85)
      expect(result.matchedBy).toBe('rsid');
      expect(result.confidence).toBe(0.95);
    });
  });
});
