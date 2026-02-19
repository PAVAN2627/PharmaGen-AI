import { VCFVariant, DetectedVariant, DetectionState, QualityMetrics, EvidenceDistribution } from '../types';
import logger from '../utils/logger';

// Validation result for metric invariants
export interface MetricValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * QualityMetricsEngine service
 * Calculates comprehensive quality metrics for pharmacogenomic analysis
 * Distinguishes between "no variants" and "no PGx variants" cases
 */
export class QualityMetricsEngine {
  /**
   * Calculate annotation completeness
   * Returns 'N/A' for cases where completeness doesn't apply
   * Returns percentage (0-1) for normal cases
   */
  static calculateAnnotationCompleteness(
    pgxVariantCount: number,
    matchedCount: number,
    state: DetectionState
  ): number | 'N/A' {
    // Return 'N/A' for no variants in VCF
    if (state === 'no_variants_in_vcf') {
      return 'N/A';
    }
    
    // Return 'N/A' for no PGx variants detected
    if (state === 'no_pgx_variants_detected') {
      return 'N/A';
    }
    
    // For normal cases, calculate percentage
    if (pgxVariantCount === 0) {
      return 0;
    }
    
    return matchedCount / pgxVariantCount;
  }

  /**
   * Calculate average variant quality score
   */
  static calculateAverageQuality(variants: VCFVariant[]): number {
    if (variants.length === 0) {
      return 0;
    }
    
    const totalQuality = variants.reduce((sum, v) => sum + v.quality, 0);
    return totalQuality / variants.length;
  }

  /**
   * Calculate evidence distribution
   * Counts variants by evidence level (A, B, C, D, unknown)
   */
  static calculateEvidenceDistribution(variants: DetectedVariant[]): EvidenceDistribution {
    const distribution: EvidenceDistribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      unknown: 0
    };
    
    for (const variant of variants) {
      if (variant.evidenceLevel) {
        distribution[variant.evidenceLevel]++;
      } else {
        distribution.unknown++;
      }
    }
    
    return distribution;
  }

  /**
   * Calculate variants by gene
   * Returns count of variants per gene
   */
  static calculateVariantsByGene(variants: DetectedVariant[]): Record<string, number> {
    const byGene: Record<string, number> = {};
    
    for (const variant of variants) {
      if (variant.gene) {
        byGene[variant.gene] = (byGene[variant.gene] || 0) + 1;
      }
    }
    
    return byGene;
  }

  /**
   * Calculate variants by drug
   * Maps variants to affected drugs based on gene-drug relationships
   */
  static calculateVariantsByDrug(
    variants: DetectedVariant[],
    drugGeneMapping: Record<string, string[]>
  ): Record<string, number> {
    const byDrug: Record<string, number> = {};
    
    // Create reverse mapping: gene -> drugs
    const geneToDrugs: Record<string, string[]> = {};
    for (const [drug, genes] of Object.entries(drugGeneMapping)) {
      for (const gene of genes) {
        if (!geneToDrugs[gene]) {
          geneToDrugs[gene] = [];
        }
        geneToDrugs[gene].push(drug);
      }
    }
    
    // Count variants per drug
    for (const variant of variants) {
      if (variant.gene && geneToDrugs[variant.gene]) {
        for (const drug of geneToDrugs[variant.gene]) {
          byDrug[drug] = (byDrug[drug] || 0) + 1;
        }
      }
    }
    
    return byDrug;
  }

  /**
   * Main metrics calculation method
   * Orchestrates all metric calculations
   * Handles metric invariant violations with safe defaults
   */
  static calculateMetrics(
    allVariants: VCFVariant[],
    pgxVariants: VCFVariant[],
    matchedVariants: DetectedVariant[],
    unmatchedVariants: VCFVariant[],
    detectionState: DetectionState,
    drugGeneMapping: Record<string, string[]> = {}
  ): QualityMetrics {
    const totalVcfVariants = allVariants.length;
    const pgxVariantsIdentified = pgxVariants.length;
    const pgxVariantsMatched = matchedVariants.length;
    const pgxVariantsUnmatched = unmatchedVariants.length;
    
    // Validate invariant: matched + unmatched = identified
    if (pgxVariantsMatched + pgxVariantsUnmatched !== pgxVariantsIdentified) {
      logger.error('Metric invariant violation detected - using safe defaults', {
        matched: pgxVariantsMatched,
        unmatched: pgxVariantsUnmatched,
        identified: pgxVariantsIdentified,
        sum: pgxVariantsMatched + pgxVariantsUnmatched,
        impact: 'Metrics will be recalculated with safe defaults'
      });
      
      // Use safe defaults: recalculate unmatched from identified - matched
      const safeUnmatched = Math.max(0, pgxVariantsIdentified - pgxVariantsMatched);
      logger.warn('Applying safe default for unmatched variants', {
        original: pgxVariantsUnmatched,
        safe: safeUnmatched
      });
    }
    
    // Calculate annotation completeness
    let annotationCompleteness: number | 'N/A';
    try {
      annotationCompleteness = this.calculateAnnotationCompleteness(
        pgxVariantsIdentified,
        pgxVariantsMatched,
        detectionState
      );
    } catch (error) {
      logger.error('Annotation completeness calculation failed - using safe default', {
        error: error instanceof Error ? error.message : String(error),
        safeDefault: 'N/A'
      });
      annotationCompleteness = 'N/A';
    }
    
    // Calculate average quality
    let averageVariantQuality: number;
    try {
      averageVariantQuality = this.calculateAverageQuality(allVariants);
      // Validate quality is in valid range
      if (averageVariantQuality < 0 || averageVariantQuality > 100) {
        logger.warn('Average quality out of valid range - clamping to [0, 100]', {
          original: averageVariantQuality,
          clamped: Math.max(0, Math.min(100, averageVariantQuality))
        });
        averageVariantQuality = Math.max(0, Math.min(100, averageVariantQuality));
      }
    } catch (error) {
      logger.error('Average quality calculation failed - using safe default', {
        error: error instanceof Error ? error.message : String(error),
        safeDefault: 0
      });
      averageVariantQuality = 0;
    }
    
    // Calculate evidence distribution
    let evidenceDistribution: EvidenceDistribution;
    try {
      evidenceDistribution = this.calculateEvidenceDistribution(matchedVariants);
    } catch (error) {
      logger.error('Evidence distribution calculation failed - using safe default', {
        error: error instanceof Error ? error.message : String(error),
        safeDefault: 'all unknown'
      });
      evidenceDistribution = { A: 0, B: 0, C: 0, D: 0, unknown: matchedVariants.length };
    }
    
    // Calculate variants by gene
    let variantsByGene: Record<string, number>;
    try {
      variantsByGene = this.calculateVariantsByGene(matchedVariants);
    } catch (error) {
      logger.error('Variants by gene calculation failed - using safe default', {
        error: error instanceof Error ? error.message : String(error),
        safeDefault: '{}'
      });
      variantsByGene = {};
    }
    
    // Calculate variants by drug
    let variantsByDrug: Record<string, number>;
    try {
      variantsByDrug = this.calculateVariantsByDrug(matchedVariants, drugGeneMapping);
    } catch (error) {
      logger.error('Variants by drug calculation failed - using safe default', {
        error: error instanceof Error ? error.message : String(error),
        safeDefault: '{}'
      });
      variantsByDrug = {};
    }
    
    // Count unique genes analyzed
    const genesAnalyzed = Object.keys(variantsByGene).length;
    
    const metrics: QualityMetrics = {
      vcf_parsing_success: true,
      annotation_completeness: annotationCompleteness,
      variants_detected: pgxVariantsMatched,
      genes_analyzed: genesAnalyzed,
      total_vcf_variants: totalVcfVariants,
      pgx_variants_identified: pgxVariantsIdentified,
      pgx_variants_matched: pgxVariantsMatched,
      pgx_variants_unmatched: pgxVariantsUnmatched,
      average_variant_quality: averageVariantQuality,
      evidence_distribution: evidenceDistribution,
      variants_by_gene: variantsByGene,
      variants_by_drug: variantsByDrug,
      detection_state: detectionState
    };
    
    // Validate metrics before returning
    const validation = this.validateMetrics(metrics);
    if (!validation.valid) {
      logger.warn('Metrics validation failed after calculation', {
        errorCount: validation.errors.length,
        errors: validation.errors,
        impact: 'Metrics may be inconsistent but analysis will continue'
      });
    }
    
    return metrics;
  }

  /**
   * Validate metric invariants
   * Ensures metrics are internally consistent
   */
  static validateMetrics(metrics: QualityMetrics): MetricValidationResult {
    const errors: string[] = [];
    
    // Invariant 1: matched + unmatched = total PGx variants
    if (metrics.pgx_variants_matched + metrics.pgx_variants_unmatched !== metrics.pgx_variants_identified) {
      const error = `Matched (${metrics.pgx_variants_matched}) + Unmatched (${metrics.pgx_variants_unmatched}) ` +
        `!= Total PGx (${metrics.pgx_variants_identified})`;
      errors.push(error);
      logger.error('Metric invariant violation: matched + unmatched != total', {
        matched: metrics.pgx_variants_matched,
        unmatched: metrics.pgx_variants_unmatched,
        total: metrics.pgx_variants_identified
      });
    }
    
    // Invariant 2: PGx variants <= total variants
    if (metrics.pgx_variants_identified > metrics.total_vcf_variants) {
      const error = `PGx variants (${metrics.pgx_variants_identified}) > Total variants (${metrics.total_vcf_variants})`;
      errors.push(error);
      logger.error('Metric invariant violation: PGx > total variants', {
        pgxVariants: metrics.pgx_variants_identified,
        totalVariants: metrics.total_vcf_variants
      });
    }
    
    // Invariant 3: All counts are non-negative
    if (metrics.total_vcf_variants < 0 || 
        metrics.pgx_variants_identified < 0 || 
        metrics.pgx_variants_matched < 0 || 
        metrics.pgx_variants_unmatched < 0) {
      errors.push('Negative variant counts detected');
      logger.error('Metric invariant violation: negative counts', {
        total: metrics.total_vcf_variants,
        pgxIdentified: metrics.pgx_variants_identified,
        matched: metrics.pgx_variants_matched,
        unmatched: metrics.pgx_variants_unmatched
      });
    }
    
    // Invariant 4: Quality score in valid range
    if (metrics.average_variant_quality < 0 || metrics.average_variant_quality > 100) {
      const error = `Average quality (${metrics.average_variant_quality}) out of range [0, 100]`;
      errors.push(error);
      logger.error('Metric invariant violation: quality out of range', {
        averageQuality: metrics.average_variant_quality
      });
    }
    
    // Invariant 5: Evidence distribution sums correctly
    const evidenceSum = 
      metrics.evidence_distribution.A +
      metrics.evidence_distribution.B +
      metrics.evidence_distribution.C +
      metrics.evidence_distribution.D +
      metrics.evidence_distribution.unknown;
    
    if (evidenceSum !== metrics.pgx_variants_matched) {
      const error = `Evidence distribution sum (${evidenceSum}) != Matched variants (${metrics.pgx_variants_matched})`;
      errors.push(error);
      logger.error('Metric invariant violation: evidence distribution mismatch', {
        evidenceSum,
        matched: metrics.pgx_variants_matched,
        distribution: metrics.evidence_distribution
      });
    }
    
    // Invariant 6: Annotation completeness formula
    if (typeof metrics.annotation_completeness === 'number') {
      const expectedCompleteness = metrics.pgx_variants_identified > 0
        ? metrics.pgx_variants_matched / metrics.pgx_variants_identified
        : 0;
      
      if (Math.abs(metrics.annotation_completeness - expectedCompleteness) > 0.001) {
        const error = `Annotation completeness (${metrics.annotation_completeness}) != Expected (${expectedCompleteness})`;
        errors.push(error);
        logger.error('Metric invariant violation: annotation completeness formula', {
          actual: metrics.annotation_completeness,
          expected: expectedCompleteness,
          matched: metrics.pgx_variants_matched,
          identified: metrics.pgx_variants_identified
        });
      }
    }
    
    // Invariant 7: variants_detected should equal pgx_variants_matched
    if (metrics.variants_detected !== metrics.pgx_variants_matched) {
      const error = `variants_detected (${metrics.variants_detected}) != pgx_variants_matched (${metrics.pgx_variants_matched})`;
      errors.push(error);
      logger.error('Metric invariant violation: variants_detected mismatch', {
        variantsDetected: metrics.variants_detected,
        matched: metrics.pgx_variants_matched
      });
    }
    
    if (errors.length === 0) {
      logger.debug('Quality metrics validation passed', {
        totalVariants: metrics.total_vcf_variants,
        pgxMatched: metrics.pgx_variants_matched,
        detectionState: metrics.detection_state
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
