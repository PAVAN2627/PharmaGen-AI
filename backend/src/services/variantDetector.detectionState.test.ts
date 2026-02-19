import { VariantDetector } from './variantDetector';
import { VCFVariant } from '../types';
import { KnownVariant } from '../data/pharmacogenomicVariants';

describe('VariantDetector - Detection State Classification', () => {
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

  describe('classifyDetectionState', () => {
    it('should return no_variants_in_vcf when totalVariants is 0', () => {
      const state = VariantDetector.classifyDetectionState(0, 0, 0);
      expect(state).toBe('no_variants_in_vcf');
    });

    it('should return no_pgx_variants_detected when pgxVariants is 0 but totalVariants > 0', () => {
      const state = VariantDetector.classifyDetectionState(10, 0, 0);
      expect(state).toBe('no_pgx_variants_detected');
    });

    it('should return pgx_variants_found_none_matched when matchedVariants is 0 but pgxVariants > 0', () => {
      const state = VariantDetector.classifyDetectionState(10, 5, 0);
      expect(state).toBe('pgx_variants_found_none_matched');
    });

    it('should return pgx_variants_found_some_matched when matchedVariants < pgxVariants', () => {
      const state = VariantDetector.classifyDetectionState(10, 5, 3);
      expect(state).toBe('pgx_variants_found_some_matched');
    });

    it('should return pgx_variants_found_all_matched when matchedVariants equals pgxVariants', () => {
      const state = VariantDetector.classifyDetectionState(10, 5, 5);
      expect(state).toBe('pgx_variants_found_all_matched');
    });
  });

  describe('detectPharmacogenomicVariants', () => {
    it('should detect no_variants_in_vcf state with empty VCF', () => {
      const result = VariantDetector.detectPharmacogenomicVariants([], mockKnownVariants);
      
      expect(result.state).toBe('no_variants_in_vcf');
      expect(result.totalVcfVariants).toBe(0);
      expect(result.pgxVariantsFound).toBe(0);
      expect(result.matchedCount).toBe(0);
      expect(result.matched).toHaveLength(0);
      expect(result.unmatched).toHaveLength(0);
    });

    it('should detect no_pgx_variants_detected state with non-PGx variants', () => {
      const nonPgxVariants: VCFVariant[] = [
        {
          chromosome: '1',
          position: 12345,
          rsid: 'rs999999',
          ref: 'A',
          alt: 'G',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'BRCA1' }, // Non-PGx gene
          gene: 'BRCA1'
        }
      ];

      const result = VariantDetector.detectPharmacogenomicVariants(nonPgxVariants, mockKnownVariants);
      
      expect(result.state).toBe('no_pgx_variants_detected');
      expect(result.totalVcfVariants).toBe(1);
      expect(result.pgxVariantsFound).toBe(0);
      expect(result.matchedCount).toBe(0);
    });

    it('should detect pgx_variants_found_none_matched state with unmatched PGx variants', () => {
      const unmatchedPgxVariants: VCFVariant[] = [
        {
          chromosome: '22',
          position: 99999999, // Unknown position
          rsid: 'rs999999', // Unknown rsID
          ref: 'X',
          alt: 'Y',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2D6' },
          gene: 'CYP2D6'
        }
      ];

      const result = VariantDetector.detectPharmacogenomicVariants(unmatchedPgxVariants, mockKnownVariants);
      
      expect(result.state).toBe('pgx_variants_found_none_matched');
      expect(result.totalVcfVariants).toBe(1);
      expect(result.pgxVariantsFound).toBe(1);
      expect(result.matchedCount).toBe(0);
      expect(result.unmatched).toHaveLength(1);
    });

    it('should detect pgx_variants_found_some_matched state with partial matches', () => {
      const mixedVariants: VCFVariant[] = [
        {
          chromosome: '22',
          position: 42130692,
          rsid: 'rs3892097', // This will match
          ref: 'C',
          alt: 'T',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2D6' },
          gene: 'CYP2D6'
        },
        {
          chromosome: '22',
          position: 99999999, // This won't match
          rsid: 'rs999999',
          ref: 'X',
          alt: 'Y',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2D6' },
          gene: 'CYP2D6'
        }
      ];

      const result = VariantDetector.detectPharmacogenomicVariants(mixedVariants, mockKnownVariants);
      
      expect(result.state).toBe('pgx_variants_found_some_matched');
      expect(result.totalVcfVariants).toBe(2);
      expect(result.pgxVariantsFound).toBe(2);
      expect(result.matchedCount).toBe(1);
      expect(result.matched).toHaveLength(1);
      expect(result.unmatched).toHaveLength(1);
    });

    it('should detect pgx_variants_found_all_matched state with all matches', () => {
      const allMatchedVariants: VCFVariant[] = [
        {
          chromosome: '22',
          position: 42130692,
          rsid: 'rs3892097',
          ref: 'C',
          alt: 'T',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2D6' },
          gene: 'CYP2D6'
        },
        {
          chromosome: '10',
          position: 94781859,
          rsid: 'rs4244285',
          ref: 'G',
          alt: 'A',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2C19' },
          gene: 'CYP2C19'
        }
      ];

      const result = VariantDetector.detectPharmacogenomicVariants(allMatchedVariants, mockKnownVariants);
      
      expect(result.state).toBe('pgx_variants_found_all_matched');
      expect(result.totalVcfVariants).toBe(2);
      expect(result.pgxVariantsFound).toBe(2);
      expect(result.matchedCount).toBe(2);
      expect(result.matched).toHaveLength(2);
      expect(result.unmatched).toHaveLength(0);
    });

    it('should populate matched variants with correct metadata', () => {
      const variants: VCFVariant[] = [
        {
          chromosome: '22',
          position: 42130692,
          rsid: 'rs3892097',
          ref: 'C',
          alt: 'T',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2D6' },
          gene: 'CYP2D6',
          genotype: '0/1'
        }
      ];

      const result = VariantDetector.detectPharmacogenomicVariants(variants, mockKnownVariants);
      
      expect(result.matched).toHaveLength(1);
      const matched = result.matched[0];
      
      expect(matched.rsid).toBe('rs3892097');
      expect(matched.gene).toBe('CYP2D6');
      expect(matched.star_allele).toBe('*4');
      expect(matched.matchedBy).toBe('rsid');
      expect(matched.matchConfidence).toBe(0.95);
      expect(matched.evidenceLevel).toBe('A');
      expect(matched.functionalStatus).toBe('no_function');
      expect(matched.clinicalSignificance).toBe('Non-functional allele');
      expect(matched.genotype).toBe('0/1');
    });

    it('should correctly count variants across mixed PGx and non-PGx genes', () => {
      const mixedGeneVariants: VCFVariant[] = [
        {
          chromosome: '22',
          position: 42130692,
          rsid: 'rs3892097',
          ref: 'C',
          alt: 'T',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2D6' },
          gene: 'CYP2D6'
        },
        {
          chromosome: '1',
          position: 12345,
          rsid: 'rs888888',
          ref: 'A',
          alt: 'G',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'BRCA1' },
          gene: 'BRCA1'
        },
        {
          chromosome: '10',
          position: 94781859,
          rsid: 'rs4244285',
          ref: 'G',
          alt: 'A',
          quality: 30,
          filter: 'PASS',
          info: { GENE: 'CYP2C19' },
          gene: 'CYP2C19'
        }
      ];

      const result = VariantDetector.detectPharmacogenomicVariants(mixedGeneVariants, mockKnownVariants);
      
      expect(result.totalVcfVariants).toBe(3);
      expect(result.pgxVariantsFound).toBe(2); // Only CYP2D6 and CYP2C19
      expect(result.matchedCount).toBe(2);
      expect(result.state).toBe('pgx_variants_found_all_matched');
    });
  });
});
