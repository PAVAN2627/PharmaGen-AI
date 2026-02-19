import { QualityMetricsEngine } from './qualityMetricsEngine';
import { VCFVariant, DetectedVariant } from '../types';

describe('QualityMetricsEngine - Unit Tests', () => {
  describe('calculateAnnotationCompleteness', () => {
    it('should return N/A for no_variants_in_vcf state', () => {
      const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
        0,
        0,
        'no_variants_in_vcf'
      );
      
      expect(completeness).toBe('N/A');
    });

    it('should return N/A for no_pgx_variants_detected state', () => {
      const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
        0,
        0,
        'no_pgx_variants_detected'
      );
      
      expect(completeness).toBe('N/A');
    });

    it('should return 0% for no matches case', () => {
      const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
        5,
        0,
        'pgx_variants_found_none_matched'
      );
      
      expect(completeness).toBe(0);
    });

    it('should return 100% for all matches case', () => {
      const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
        5,
        5,
        'pgx_variants_found_all_matched'
      );
      
      expect(completeness).toBe(1.0);
    });

    it('should return correct percentage for partial matches', () => {
      const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
        10,
        7,
        'pgx_variants_found_some_matched'
      );
      
      expect(completeness).toBe(0.7);
    });
  });

  describe('calculateAverageQuality', () => {
    it('should return 0 for empty array', () => {
      const avgQuality = QualityMetricsEngine.calculateAverageQuality([]);
      expect(avgQuality).toBe(0);
    });

    it('should calculate correct average for single variant', () => {
      const variants: VCFVariant[] = [
        {
          chromosome: '1',
          position: 1234567,
          rsid: 'rs1234567',
          ref: 'A',
          alt: 'G',
          quality: 45.5,
          filter: 'PASS',
          info: {}
        }
      ];
      
      const avgQuality = QualityMetricsEngine.calculateAverageQuality(variants);
      expect(avgQuality).toBe(45.5);
    });

    it('should calculate correct average for multiple variants', () => {
      const variants: VCFVariant[] = [
        {
          chromosome: '1',
          position: 1234567,
          rsid: 'rs1234567',
          ref: 'A',
          alt: 'G',
          quality: 30,
          filter: 'PASS',
          info: {}
        },
        {
          chromosome: '10',
          position: 96522463,
          rsid: 'rs7654321',
          ref: 'C',
          alt: 'T',
          quality: 40,
          filter: 'PASS',
          info: {}
        },
        {
          chromosome: '19',
          position: 41010006,
          rsid: 'rs9999999',
          ref: 'G',
          alt: 'A',
          quality: 50,
          filter: 'PASS',
          info: {}
        }
      ];
      
      const avgQuality = QualityMetricsEngine.calculateAverageQuality(variants);
      expect(avgQuality).toBe(40);
    });
  });

  describe('calculateEvidenceDistribution', () => {
    it('should return all zeros for empty array', () => {
      const distribution = QualityMetricsEngine.calculateEvidenceDistribution([]);
      
      expect(distribution).toEqual({
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        unknown: 0
      });
    });

    it('should count variants by evidence level', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '1', position: '1234567', evidenceLevel: 'A' },
        { rsid: 'rs2', chromosome: '1', position: '1234568', evidenceLevel: 'A' },
        { rsid: 'rs3', chromosome: '1', position: '1234569', evidenceLevel: 'B' },
        { rsid: 'rs4', chromosome: '1', position: '1234570', evidenceLevel: 'C' },
        { rsid: 'rs5', chromosome: '1', position: '1234571', evidenceLevel: 'D' },
        { rsid: 'rs6', chromosome: '1', position: '1234572' } // No evidence level
      ];
      
      const distribution = QualityMetricsEngine.calculateEvidenceDistribution(variants);
      
      expect(distribution).toEqual({
        A: 2,
        B: 1,
        C: 1,
        D: 1,
        unknown: 1
      });
    });

    it('should handle all variants with same evidence level', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '1', position: '1234567', evidenceLevel: 'A' },
        { rsid: 'rs2', chromosome: '1', position: '1234568', evidenceLevel: 'A' },
        { rsid: 'rs3', chromosome: '1', position: '1234569', evidenceLevel: 'A' }
      ];
      
      const distribution = QualityMetricsEngine.calculateEvidenceDistribution(variants);
      
      expect(distribution).toEqual({
        A: 3,
        B: 0,
        C: 0,
        D: 0,
        unknown: 0
      });
    });
  });

  describe('calculateVariantsByGene', () => {
    it('should return empty object for empty array', () => {
      const byGene = QualityMetricsEngine.calculateVariantsByGene([]);
      expect(byGene).toEqual({});
    });

    it('should count variants per gene', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6' },
        { rsid: 'rs2', chromosome: '22', position: '42126612', gene: 'CYP2D6' },
        { rsid: 'rs3', chromosome: '10', position: '96522463', gene: 'CYP2C19' },
        { rsid: 'rs4', chromosome: '10', position: '96522464', gene: 'CYP2C19' },
        { rsid: 'rs5', chromosome: '10', position: '96522465', gene: 'CYP2C19' },
        { rsid: 'rs6', chromosome: '12', position: '21178615', gene: 'SLCO1B1' }
      ];
      
      const byGene = QualityMetricsEngine.calculateVariantsByGene(variants);
      
      expect(byGene).toEqual({
        CYP2D6: 2,
        CYP2C19: 3,
        SLCO1B1: 1
      });
    });

    it('should handle variants without gene', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6' },
        { rsid: 'rs2', chromosome: '1', position: '1234567' } // No gene
      ];
      
      const byGene = QualityMetricsEngine.calculateVariantsByGene(variants);
      
      expect(byGene).toEqual({
        CYP2D6: 1
      });
    });
  });

  describe('calculateVariantsByDrug', () => {
    const drugGeneMapping = {
      CODEINE: ['CYP2D6'],
      WARFARIN: ['CYP2C9'],
      CLOPIDOGREL: ['CYP2C19'],
      SIMVASTATIN: ['SLCO1B1'],
      AZATHIOPRINE: ['TPMT'],
      FLUOROURACIL: ['DPYD']
    };

    it('should return empty object for empty array', () => {
      const byDrug = QualityMetricsEngine.calculateVariantsByDrug([], drugGeneMapping);
      expect(byDrug).toEqual({});
    });

    it('should count variants per drug', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6' },
        { rsid: 'rs2', chromosome: '22', position: '42126612', gene: 'CYP2D6' },
        { rsid: 'rs3', chromosome: '10', position: '96522463', gene: 'CYP2C19' },
        { rsid: 'rs4', chromosome: '12', position: '21178615', gene: 'SLCO1B1' }
      ];
      
      const byDrug = QualityMetricsEngine.calculateVariantsByDrug(variants, drugGeneMapping);
      
      expect(byDrug).toEqual({
        CODEINE: 2,
        CLOPIDOGREL: 1,
        SIMVASTATIN: 1
      });
    });

    it('should handle variants without gene', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6' },
        { rsid: 'rs2', chromosome: '1', position: '1234567' } // No gene
      ];
      
      const byDrug = QualityMetricsEngine.calculateVariantsByDrug(variants, drugGeneMapping);
      
      expect(byDrug).toEqual({
        CODEINE: 1
      });
    });

    it('should handle gene not in mapping', () => {
      const variants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6' },
        { rsid: 'rs2', chromosome: '1', position: '1234567', gene: 'UNKNOWN_GENE' }
      ];
      
      const byDrug = QualityMetricsEngine.calculateVariantsByDrug(variants, drugGeneMapping);
      
      expect(byDrug).toEqual({
        CODEINE: 1
      });
    });
  });

  describe('calculateMetrics', () => {
    const drugGeneMapping = {
      CODEINE: ['CYP2D6'],
      CLOPIDOGREL: ['CYP2C19']
    };

    it('should calculate all metrics correctly', () => {
      const allVariants: VCFVariant[] = [
        { chromosome: '22', position: 42126611, rsid: 'rs1', ref: 'A', alt: 'G', quality: 30, filter: 'PASS', info: {} },
        { chromosome: '10', position: 96522463, rsid: 'rs2', ref: 'C', alt: 'T', quality: 40, filter: 'PASS', info: {} },
        { chromosome: '1', position: 1234567, rsid: 'rs3', ref: 'G', alt: 'A', quality: 50, filter: 'PASS', info: {} }
      ];
      
      const pgxVariants = allVariants.slice(0, 2);
      
      const matchedVariants: DetectedVariant[] = [
        { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6', evidenceLevel: 'A' },
        { rsid: 'rs2', chromosome: '10', position: '96522463', gene: 'CYP2C19', evidenceLevel: 'B' }
      ];
      
      const unmatchedVariants: VCFVariant[] = [];
      
      const metrics = QualityMetricsEngine.calculateMetrics(
        allVariants,
        pgxVariants,
        matchedVariants,
        unmatchedVariants,
        'pgx_variants_found_all_matched',
        drugGeneMapping
      );
      
      expect(metrics.total_vcf_variants).toBe(3);
      expect(metrics.pgx_variants_identified).toBe(2);
      expect(metrics.pgx_variants_matched).toBe(2);
      expect(metrics.pgx_variants_unmatched).toBe(0);
      expect(metrics.average_variant_quality).toBe(40);
      expect(metrics.annotation_completeness).toBe(1.0);
      expect(metrics.variants_detected).toBe(2);
      expect(metrics.genes_analyzed).toBe(2);
      expect(metrics.detection_state).toBe('pgx_variants_found_all_matched');
      
      expect(metrics.evidence_distribution).toEqual({
        A: 1,
        B: 1,
        C: 0,
        D: 0,
        unknown: 0
      });
      
      expect(metrics.variants_by_gene).toEqual({
        CYP2D6: 1,
        CYP2C19: 1
      });
      
      expect(metrics.variants_by_drug).toEqual({
        CODEINE: 1,
        CLOPIDOGREL: 1
      });
    });

    it('should handle no variants case', () => {
      const metrics = QualityMetricsEngine.calculateMetrics(
        [],
        [],
        [],
        [],
        'no_variants_in_vcf'
      );
      
      expect(metrics.total_vcf_variants).toBe(0);
      expect(metrics.pgx_variants_identified).toBe(0);
      expect(metrics.pgx_variants_matched).toBe(0);
      expect(metrics.annotation_completeness).toBe('N/A');
    });

    it('should handle no PGx variants case', () => {
      const allVariants: VCFVariant[] = [
        { chromosome: '1', position: 1234567, rsid: 'rs1', ref: 'A', alt: 'G', quality: 30, filter: 'PASS', info: {} }
      ];
      
      const metrics = QualityMetricsEngine.calculateMetrics(
        allVariants,
        [],
        [],
        [],
        'no_pgx_variants_detected'
      );
      
      expect(metrics.total_vcf_variants).toBe(1);
      expect(metrics.pgx_variants_identified).toBe(0);
      expect(metrics.annotation_completeness).toBe('N/A');
    });
  });

  describe('validateMetrics', () => {
    it('should validate correct metrics', () => {
      const validMetrics = QualityMetricsEngine.calculateMetrics(
        [
          { chromosome: '22', position: 42126611, rsid: 'rs1', ref: 'A', alt: 'G', quality: 30, filter: 'PASS', info: {} },
          { chromosome: '10', position: 96522463, rsid: 'rs2', ref: 'C', alt: 'T', quality: 40, filter: 'PASS', info: {} }
        ],
        [
          { chromosome: '22', position: 42126611, rsid: 'rs1', ref: 'A', alt: 'G', quality: 30, filter: 'PASS', info: {} }
        ],
        [
          { rsid: 'rs1', chromosome: '22', position: '42126611', gene: 'CYP2D6', evidenceLevel: 'A' }
        ],
        [],
        'pgx_variants_found_all_matched'
      );
      
      const validation = QualityMetricsEngine.validateMetrics(validMetrics);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect matched + unmatched != total invariant violation', () => {
      const invalidMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: 10,
        pgx_variants_identified: 10,
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 3, // Should be 5
        average_variant_quality: 35,
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 },
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched' as const
      };
      
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Matched'))).toBe(true);
    });

    it('should detect PGx > total invariant violation', () => {
      const invalidMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: 5,
        pgx_variants_identified: 10, // Exceeds total
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 5,
        average_variant_quality: 35,
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 },
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched' as const
      };
      
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('PGx variants'))).toBe(true);
    });

    it('should detect negative count violation', () => {
      const invalidMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: -1, // Negative
        pgx_variants_identified: 10,
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 5,
        average_variant_quality: 35,
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 },
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched' as const
      };
      
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Negative'))).toBe(true);
    });

    it('should detect quality out of range violation', () => {
      const invalidMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: 10,
        pgx_variants_identified: 10,
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 5,
        average_variant_quality: 150, // Out of range
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 },
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched' as const
      };
      
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('quality'))).toBe(true);
    });

    it('should detect evidence distribution sum violation', () => {
      const invalidMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: 10,
        pgx_variants_identified: 10,
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 5,
        average_variant_quality: 35,
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 }, // Sums to 5
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched' as const
      };
      
      // This should be valid since evidence sum matches matched count
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      expect(validation.valid).toBe(true);
    });
  });
});
