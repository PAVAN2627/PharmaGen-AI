import fc from 'fast-check';
import { QualityMetricsEngine } from './qualityMetricsEngine';
import { DetectionState, EvidenceLevel, QualityMetrics } from '../types';

describe('QualityMetricsEngine - Property Tests', () => {
  // Arbitraries for generating test data
  const detectionStateArb = fc.constantFrom<DetectionState>(
    'no_variants_in_vcf',
    'no_pgx_variants_detected',
    'pgx_variants_found_none_matched',
    'pgx_variants_found_some_matched',
    'pgx_variants_found_all_matched'
  );

  const evidenceLevelArb = fc.constantFrom<EvidenceLevel>('A', 'B', 'C', 'D');

  const vcfVariantArb = fc.record({
    chromosome: fc.constantFrom('1', '10', '19', '22'),
    position: fc.integer({ min: 1000000, max: 99999999 }),
    rsid: fc.string({ minLength: 7, maxLength: 10 }).map(s => `rs${s}`),
    ref: fc.constantFrom('A', 'C', 'G', 'T'),
    alt: fc.constantFrom('A', 'C', 'G', 'T'),
    quality: fc.float({ min: 0, max: 100, noNaN: true }),
    filter: fc.constantFrom('PASS', 'FAIL'),
    info: fc.constant({}),
    genotype: fc.constantFrom('0/1', '1/1', '0/0')
  });

  const detectedVariantArb = fc.record({
    rsid: fc.string({ minLength: 7, maxLength: 10 }).map(s => `rs${s}`),
    chromosome: fc.constantFrom('1', '10', '19', '22'),
    position: fc.integer({ min: 1000000, max: 99999999 }).map(String),
    gene: fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD'),
    evidenceLevel: fc.option(evidenceLevelArb, { nil: undefined })
  });

  describe('Property 18: Annotation Completeness Formula', () => {
    it('should calculate annotation completeness as matched/total for normal cases', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          (pgxCount, matchedCount) => {
            // Ensure matched <= pgxCount
            const actualMatched = Math.min(matchedCount, pgxCount);
            
            const state: DetectionState = actualMatched === 0
              ? 'pgx_variants_found_none_matched'
              : actualMatched === pgxCount
              ? 'pgx_variants_found_all_matched'
              : 'pgx_variants_found_some_matched';
            
            const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
              pgxCount,
              actualMatched,
              state
            );
            
            // Should be a number for normal cases
            expect(typeof completeness).toBe('number');
            
            // Should match formula
            const expected = actualMatched / pgxCount;
            expect(completeness).toBeCloseTo(expected, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return N/A for no_variants_in_vcf state', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          (pgxCount, matchedCount) => {
            const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
              pgxCount,
              matchedCount,
              'no_variants_in_vcf'
            );
            
            expect(completeness).toBe('N/A');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return N/A for no_pgx_variants_detected state', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          (pgxCount, matchedCount) => {
            const completeness = QualityMetricsEngine.calculateAnnotationCompleteness(
              pgxCount,
              matchedCount,
              'no_pgx_variants_detected'
            );
            
            expect(completeness).toBe('N/A');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 19: Comprehensive Metrics Reporting', () => {
    it('should include all required metric fields', () => {
      fc.assert(
        fc.property(
          fc.array(vcfVariantArb, { minLength: 0, maxLength: 20 }),
          fc.array(vcfVariantArb, { minLength: 0, maxLength: 10 }),
          fc.array(detectedVariantArb, { minLength: 0, maxLength: 10 }),
          detectionStateArb,
          (allVariants, pgxVariants, matchedVariants, state) => {
            // Ensure pgxVariants is subset of allVariants
            const actualPgxVariants = pgxVariants.slice(0, Math.min(pgxVariants.length, allVariants.length));
            
            // Calculate unmatched
            const unmatchedVariants = actualPgxVariants.slice(matchedVariants.length);
            
            const metrics = QualityMetricsEngine.calculateMetrics(
              allVariants,
              actualPgxVariants,
              matchedVariants,
              unmatchedVariants,
              state
            );
            
            // Check all required fields exist
            expect(metrics).toHaveProperty('vcf_parsing_success');
            expect(metrics).toHaveProperty('annotation_completeness');
            expect(metrics).toHaveProperty('variants_detected');
            expect(metrics).toHaveProperty('genes_analyzed');
            expect(metrics).toHaveProperty('total_vcf_variants');
            expect(metrics).toHaveProperty('pgx_variants_identified');
            expect(metrics).toHaveProperty('pgx_variants_matched');
            expect(metrics).toHaveProperty('pgx_variants_unmatched');
            expect(metrics).toHaveProperty('average_variant_quality');
            expect(metrics).toHaveProperty('evidence_distribution');
            expect(metrics).toHaveProperty('variants_by_gene');
            expect(metrics).toHaveProperty('variants_by_drug');
            expect(metrics).toHaveProperty('detection_state');
            
            // Check evidence distribution structure
            expect(metrics.evidence_distribution).toHaveProperty('A');
            expect(metrics.evidence_distribution).toHaveProperty('B');
            expect(metrics.evidence_distribution).toHaveProperty('C');
            expect(metrics.evidence_distribution).toHaveProperty('D');
            expect(metrics.evidence_distribution).toHaveProperty('unknown');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should report correct variant counts', () => {
      fc.assert(
        fc.property(
          fc.array(vcfVariantArb, { minLength: 1, maxLength: 20 }),
          fc.array(detectedVariantArb, { minLength: 0, maxLength: 10 }),
          detectionStateArb,
          (allVariants, matchedVariants, state) => {
            const pgxVariants = allVariants.slice(0, Math.min(allVariants.length, matchedVariants.length + 3));
            const unmatchedVariants = pgxVariants.slice(matchedVariants.length);
            
            const metrics = QualityMetricsEngine.calculateMetrics(
              allVariants,
              pgxVariants,
              matchedVariants,
              unmatchedVariants,
              state
            );
            
            // Verify counts
            expect(metrics.total_vcf_variants).toBe(allVariants.length);
            expect(metrics.pgx_variants_identified).toBe(pgxVariants.length);
            expect(metrics.pgx_variants_matched).toBe(matchedVariants.length);
            expect(metrics.pgx_variants_unmatched).toBe(unmatchedVariants.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Variant Count Invariant', () => {
    it('should satisfy matched + unmatched = total PGx variants', () => {
      fc.assert(
        fc.property(
          fc.array(vcfVariantArb, { minLength: 0, maxLength: 20 }),
          fc.array(detectedVariantArb, { minLength: 0, maxLength: 10 }),
          detectionStateArb,
          (allVariants, matchedVariants, state) => {
            // Ensure pgxVariants is subset of allVariants and contains at least matchedVariants
            const minPgxCount = Math.min(allVariants.length, matchedVariants.length);
            const maxPgxCount = Math.min(allVariants.length, matchedVariants.length + 5);
            const pgxCount = Math.max(minPgxCount, Math.min(maxPgxCount, allVariants.length));
            const pgxVariants = allVariants.slice(0, pgxCount);
            
            // Ensure matchedVariants doesn't exceed pgxVariants
            const actualMatchedVariants = matchedVariants.slice(0, pgxVariants.length);
            const unmatchedVariants = pgxVariants.slice(actualMatchedVariants.length);
            
            const metrics = QualityMetricsEngine.calculateMetrics(
              allVariants,
              pgxVariants,
              actualMatchedVariants,
              unmatchedVariants,
              state
            );
            
            // Invariant: matched + unmatched = total PGx
            expect(metrics.pgx_variants_matched + metrics.pgx_variants_unmatched)
              .toBe(metrics.pgx_variants_identified);
            
            // Validate using validation method
            const validation = QualityMetricsEngine.validateMetrics(metrics);
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect invariant violations', () => {
      // Create metrics with intentional violation
      const invalidMetrics: QualityMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: 10,
        pgx_variants_identified: 8,
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 2, // Should be 3 to satisfy invariant
        average_variant_quality: 35,
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 },
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched'
      };
      
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Property 21: PGx Subset Invariant', () => {
    it('should satisfy PGx variants <= total variants', () => {
      fc.assert(
        fc.property(
          fc.array(vcfVariantArb, { minLength: 0, maxLength: 20 }),
          fc.array(detectedVariantArb, { minLength: 0, maxLength: 10 }),
          detectionStateArb,
          (allVariants, matchedVariants, state) => {
            // Ensure pgxVariants is subset of allVariants and contains at least matchedVariants
            const minPgxCount = Math.min(allVariants.length, matchedVariants.length);
            const maxPgxCount = Math.min(allVariants.length, matchedVariants.length + 3);
            const pgxCount = Math.max(minPgxCount, Math.min(maxPgxCount, allVariants.length));
            const pgxVariants = allVariants.slice(0, pgxCount);
            
            // Ensure matchedVariants doesn't exceed pgxVariants
            const actualMatchedVariants = matchedVariants.slice(0, pgxVariants.length);
            const unmatchedVariants = pgxVariants.slice(actualMatchedVariants.length);
            
            const metrics = QualityMetricsEngine.calculateMetrics(
              allVariants,
              pgxVariants,
              actualMatchedVariants,
              unmatchedVariants,
              state
            );
            
            // Invariant: PGx variants <= total variants
            expect(metrics.pgx_variants_identified).toBeLessThanOrEqual(metrics.total_vcf_variants);
            
            // Validate using validation method
            const validation = QualityMetricsEngine.validateMetrics(metrics);
            expect(validation.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect when PGx variants exceed total variants', () => {
      // Create metrics with intentional violation
      const invalidMetrics: QualityMetrics = {
        vcf_parsing_success: true,
        annotation_completeness: 0.5,
        variants_detected: 5,
        genes_analyzed: 3,
        total_vcf_variants: 5,
        pgx_variants_identified: 10, // Exceeds total variants
        pgx_variants_matched: 5,
        pgx_variants_unmatched: 5,
        average_variant_quality: 35,
        evidence_distribution: { A: 2, B: 2, C: 1, D: 0, unknown: 0 },
        variants_by_gene: {},
        variants_by_drug: {},
        detection_state: 'pgx_variants_found_some_matched'
      };
      
      const validation = QualityMetricsEngine.validateMetrics(invalidMetrics);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('PGx variants'))).toBe(true);
    });
  });

  describe('Evidence Distribution', () => {
    it('should sum evidence distribution to matched count', () => {
      fc.assert(
        fc.property(
          fc.array(detectedVariantArb, { minLength: 0, maxLength: 20 }),
          (variants) => {
            const distribution = QualityMetricsEngine.calculateEvidenceDistribution(variants);
            
            const sum = distribution.A + distribution.B + distribution.C + distribution.D + distribution.unknown;
            expect(sum).toBe(variants.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Average Quality Calculation', () => {
    it('should return 0 for empty variant array', () => {
      const avgQuality = QualityMetricsEngine.calculateAverageQuality([]);
      expect(avgQuality).toBe(0);
    });

    it('should calculate correct average', () => {
      fc.assert(
        fc.property(
          fc.array(vcfVariantArb, { minLength: 1, maxLength: 20 }),
          (variants) => {
            const avgQuality = QualityMetricsEngine.calculateAverageQuality(variants);
            
            const expectedAvg = variants.reduce((sum, v) => sum + v.quality, 0) / variants.length;
            expect(avgQuality).toBeCloseTo(expectedAvg, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Variants By Gene', () => {
    it('should count variants per gene correctly', () => {
      fc.assert(
        fc.property(
          fc.array(detectedVariantArb, { minLength: 0, maxLength: 20 }),
          (variants) => {
            const byGene = QualityMetricsEngine.calculateVariantsByGene(variants);
            
            // Verify counts
            const totalCounted = Object.values(byGene).reduce((sum, count) => sum + count, 0);
            const variantsWithGene = variants.filter(v => v.gene).length;
            expect(totalCounted).toBe(variantsWithGene);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
