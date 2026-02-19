import { VCFVariant } from '../types';
import { KnownVariant } from '../data/pharmacogenomicVariants';
import logger from '../utils/logger';

/**
 * Detection state classification
 * Distinguishes between different scenarios of variant detection
 */
export type DetectionState = 
  | 'no_variants_in_vcf'
  | 'no_pgx_variants_detected'
  | 'pgx_variants_found_none_matched'
  | 'pgx_variants_found_some_matched'
  | 'pgx_variants_found_all_matched';

/**
 * Evidence level from CPIC guidelines
 */
export type EvidenceLevel = 'A' | 'B' | 'C' | 'D';

/**
 * Enhanced DetectedVariant with matching metadata
 */
export interface DetectedVariant {
  rsid: string;
  chromosome: string;
  position: string;
  ref?: string;
  alt?: string;
  genotype?: string;
  gene?: string;
  star_allele?: string;
  // New fields for matching metadata
  matchedBy: 'rsid' | 'position' | 'star_allele' | null;
  matchConfidence: number;
  evidenceLevel?: EvidenceLevel;
  functionalStatus?: 'normal' | 'decreased' | 'increased' | 'no_function';
  clinicalSignificance?: string;
}

/**
 * Result of matching a single variant
 */
export interface MatchResult {
  matched: boolean;
  knownVariant?: KnownVariant;
  matchedBy: 'rsid' | 'position' | 'star_allele' | null;
  confidence: number;
}

/**
 * Result of detecting pharmacogenomic variants
 */
export interface DetectionResult {
  matched: DetectedVariant[];
  unmatched: VCFVariant[];
  totalVcfVariants: number;
  pgxVariantsFound: number;
  matchedCount: number;
  state: DetectionState;
}

/**
 * VariantDetector service
 * Matches VCF variants against pharmacogenomic database using multiple strategies
 */
export class VariantDetector {
  /**
   * Detect and match pharmacogenomic variants from VCF data
   * Handles database matching failures without failing analysis
   * 
   * @param vcfVariants - Parsed variants from VCF file
   * @param knownVariants - Database of known pharmacogenomic variants
   * @returns DetectionResult with matched/unmatched variants and state
   */
  static detectPharmacogenomicVariants(
    vcfVariants: VCFVariant[],
    knownVariants: KnownVariant[]
  ): DetectionResult {
    logger.info(`Starting variant detection with ${vcfVariants.length} VCF variants`);

    const matched: DetectedVariant[] = [];
    const unmatched: VCFVariant[] = [];

    // Handle empty database gracefully
    if (!knownVariants || knownVariants.length === 0) {
      logger.warn('Database matching failure: known variants database is empty', {
        vcfVariantCount: vcfVariants.length,
        impact: 'All variants will be unmatched, analysis will continue with reduced confidence'
      });
    }

    // Filter for pharmacogenomic genes
    const pgxGenes = ['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD'];
    const pgxVariants = vcfVariants.filter(variant => {
      const gene = variant.gene || variant.info.GENE || variant.info.GENEINFO;
      if (!gene) return false;
      return pgxGenes.some(pgxGene => gene.toUpperCase().includes(pgxGene));
    });

    logger.info(`Found ${pgxVariants.length} pharmacogenomic variants`);

    // Match each PGx variant against database
    for (const vcfVariant of pgxVariants) {
      try {
        const matchResult = this.matchVariant(vcfVariant, knownVariants || []);

        if (matchResult.matched && matchResult.knownVariant) {
          // Create DetectedVariant with matching metadata
          const detectedVariant: DetectedVariant = {
            rsid: vcfVariant.rsid || matchResult.knownVariant.rsid,
            chromosome: vcfVariant.chromosome,
            position: vcfVariant.position.toString(),
            ref: vcfVariant.ref,
            alt: vcfVariant.alt,
            genotype: vcfVariant.genotype,
            gene: matchResult.knownVariant.gene,
            star_allele: matchResult.knownVariant.star_allele,
            matchedBy: matchResult.matchedBy,
            matchConfidence: matchResult.confidence,
            evidenceLevel: matchResult.knownVariant.evidence_level,
            functionalStatus: matchResult.knownVariant.functional_status,
            clinicalSignificance: matchResult.knownVariant.clinical_significance
          };
          matched.push(detectedVariant);
          logger.debug('Variant matched successfully', {
            rsid: vcfVariant.rsid,
            position: `${vcfVariant.chromosome}:${vcfVariant.position}`,
            matchedBy: matchResult.matchedBy,
            confidence: matchResult.confidence,
            gene: matchResult.knownVariant.gene,
            starAllele: matchResult.knownVariant.star_allele,
            evidenceLevel: matchResult.knownVariant.evidence_level
          });
        } else {
          unmatched.push(vcfVariant);
          logger.warn('Variant matching failed', {
            rsid: vcfVariant.rsid || 'unknown',
            position: `${vcfVariant.chromosome}:${vcfVariant.position}`,
            ref: vcfVariant.ref,
            alt: vcfVariant.alt,
            gene: vcfVariant.gene || vcfVariant.info.GENE || 'unknown',
            reason: 'No match found in database using any strategy (rsID, position, star allele, or proximity)',
            impact: 'Variant will be tracked as unmatched, analysis continues'
          });
        }
      } catch (error) {
        // Handle matching errors gracefully - don't fail entire analysis
        logger.error('Error during variant matching', {
          rsid: vcfVariant.rsid || 'unknown',
          position: `${vcfVariant.chromosome}:${vcfVariant.position}`,
          error: error instanceof Error ? error.message : String(error),
          impact: 'Variant will be treated as unmatched, analysis continues'
        });
        unmatched.push(vcfVariant);
      }
    }

    // Classify detection state
    const state = this.classifyDetectionState(
      vcfVariants.length,
      pgxVariants.length,
      matched.length
    );

    logger.info(`Detection complete: ${matched.length} matched, ${unmatched.length} unmatched, state: ${state}`);

    return {
      matched,
      unmatched,
      totalVcfVariants: vcfVariants.length,
      pgxVariantsFound: pgxVariants.length,
      matchedCount: matched.length,
      state
    };
  }

  /**
   * Match a single VCF variant against known variants using multiple strategies
   * 
   * Strategy priority (highest to lowest confidence):
   * 1. Exact rsID match (0.95)
   * 2. Position + ref + alt match (0.85)
   * 3. STAR allele + gene match (0.70)
   * 4. Gene + position proximity match (0.50)
   * 
   * @param vcfVariant - Variant from VCF file
   * @param knownVariants - Database of known variants
   * @returns MatchResult with matched variant and confidence
   */
  static matchVariant(
    vcfVariant: VCFVariant,
    knownVariants: KnownVariant[]
  ): MatchResult {
    // Strategy 1: Exact rsID match (highest confidence)
    if (vcfVariant.rsid && vcfVariant.rsid !== '.' && vcfVariant.rsid !== '') {
      const match = knownVariants.find(kv => kv.rsid === vcfVariant.rsid);
      if (match) {
        return {
          matched: true,
          knownVariant: match,
          matchedBy: 'rsid',
          confidence: 0.95
        };
      }
    }

    // Strategy 2: Position + ref + alt match (high confidence)
    const positionMatch = knownVariants.find(kv =>
      kv.chromosome === vcfVariant.chromosome &&
      kv.position === vcfVariant.position &&
      kv.ref === vcfVariant.ref &&
      kv.alt === vcfVariant.alt
    );
    if (positionMatch) {
      return {
        matched: true,
        knownVariant: positionMatch,
        matchedBy: 'position',
        confidence: 0.85
      };
    }

    // Strategy 3: STAR allele + gene match (medium confidence)
    const starAllele = vcfVariant.starAllele || vcfVariant.info.STAR || vcfVariant.info.STAR_ALLELE;
    const gene = vcfVariant.gene || vcfVariant.info.GENE || vcfVariant.info.GENEINFO;
    
    if (starAllele && gene) {
      const starMatch = knownVariants.find(kv =>
        kv.gene === gene &&
        kv.star_allele === starAllele
      );
      if (starMatch) {
        return {
          matched: true,
          knownVariant: starMatch,
          matchedBy: 'star_allele',
          confidence: 0.70
        };
      }
    }

    // Strategy 4: Gene + position proximity match (low confidence)
    if (gene) {
      const geneMatch = knownVariants.find(kv =>
        kv.gene === gene &&
        Math.abs(kv.position - vcfVariant.position) < 10
      );
      if (geneMatch) {
        return {
          matched: true,
          knownVariant: geneMatch,
          matchedBy: 'position',
          confidence: 0.50
        };
      }
    }

    // No match found
    return {
      matched: false,
      matchedBy: null,
      confidence: 0
    };
  }

  /**
   * Classify the detection state based on variant counts
   * 
   * @param totalVariants - Total variants in VCF file
   * @param pgxVariants - Pharmacogenomic variants found
   * @param matchedVariants - Successfully matched variants
   * @returns DetectionState classification
   */
  static classifyDetectionState(
    totalVariants: number,
    pgxVariants: number,
    matchedVariants: number
  ): DetectionState {
    // No variants at all in VCF
    if (totalVariants === 0) {
      return 'no_variants_in_vcf';
    }

    // Variants exist but none in PGx genes
    if (pgxVariants === 0) {
      return 'no_pgx_variants_detected';
    }

    // PGx variants found but none matched database
    if (matchedVariants === 0) {
      return 'pgx_variants_found_none_matched';
    }

    // Some PGx variants matched
    if (matchedVariants < pgxVariants) {
      return 'pgx_variants_found_some_matched';
    }

    // All PGx variants matched
    return 'pgx_variants_found_all_matched';
  }
}
