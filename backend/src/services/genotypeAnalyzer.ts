import { VCFVariant, DetectedVariant, GeneVariantData, Phenotype } from '../types';
import { getVariantByRsid } from '../data/pharmacogenomicVariants';
import logger from '../utils/logger';

/**
 * Analyzes genotypes and determines phenotypes
 */
export class GenotypeAnalyzer {
  /**
   * Analyze variants for a specific gene
   */
  static analyzeGene(gene: string, vcfVariants: VCFVariant[]): GeneVariantData {
    logger.info(`Analyzing gene: ${gene}`);

    const detectedVariants: DetectedVariant[] = [];
    const starAlleles: string[] = [];

    // Match VCF variants with known pharmacogenomic variants
    for (const vcfVariant of vcfVariants) {
      const knownVariant = getVariantByRsid(vcfVariant.rsid);
      
      if (knownVariant && knownVariant.gene === gene) {
        detectedVariants.push({
          rsid: vcfVariant.rsid,
          chromosome: vcfVariant.chromosome,
          position: vcfVariant.position.toString(),
          ref: vcfVariant.ref,
          alt: vcfVariant.alt,
          genotype: vcfVariant.genotype,
          gene: knownVariant.gene,
          star_allele: knownVariant.star_allele
        });

        // Track star alleles
        if (knownVariant.star_allele && !starAlleles.includes(knownVariant.star_allele)) {
          starAlleles.push(knownVariant.star_allele);
        }
      }
    }

    // Determine diplotype and phenotype
    const diplotype = this.determineDiplotype(gene, detectedVariants, starAlleles);
    const phenotype = this.determinePhenotype(gene, diplotype, detectedVariants);

    logger.info(`Gene ${gene}: Diplotype=${diplotype}, Phenotype=${phenotype}`);

    return {
      gene,
      variants: detectedVariants,
      diplotype,
      phenotype,
      star_alleles: starAlleles
    };
  }

  /**
   * Determine diplotype from detected variants
   */
  private static determineDiplotype(
    _gene: string, 
    variants: DetectedVariant[], 
    _starAlleles: string[]
  ): string {
    logger.debug('Starting diplotype determination', {
      variantCount: variants.length,
      variantDetails: variants.map(v => ({
        rsid: v.rsid,
        star_allele: v.star_allele,
        genotype: v.genotype
      }))
    });

    if (variants.length === 0) {
      logger.info('No variants detected - assuming wild-type');
      return '*1/*1'; // Wild-type
    }

    // Count alleles based on genotype
    const alleleCount: Record<string, number> = {};
    
    for (const variant of variants) {
      const allele = variant.star_allele || '*1';
      const genotype = variant.genotype || '0/0';
      
      // Parse genotype (e.g., "0/1", "1/1", "0|1")
      const [allele1, allele2] = genotype.split(/[/|]/);
      
      logger.debug('Counting alleles', {
        rsid: variant.rsid,
        allele,
        genotype,
        allele1,
        allele2
      });
      
      // Count each allele copy (0 = reference, 1 = alternate)
      if (allele1 === '1') {
        alleleCount[allele] = (alleleCount[allele] || 0) + 1;
      }
      if (allele2 === '1') {
        alleleCount[allele] = (alleleCount[allele] || 0) + 1;
      }
    }
    
    logger.debug('Final allele counts', { alleleCount });

    // Build diplotype
    const alleles = Object.keys(alleleCount);
    
    if (alleles.length === 0) {
      logger.warn('No alleles found in variant genotypes - assuming wild-type');
      return '*1/*1';
    } else if (alleles.length === 1) {
      const allele = alleles[0];
      const count = alleleCount[allele];
      // If count is 2, it's homozygous for this allele
      const diplotype = count >= 2 ? `${allele}/${allele}` : `*1/${allele}`;
      logger.info('Single allele detected', { allele, count, diplotype });
      return diplotype;
    } else if (alleles.length === 2) {
      const sortedAlleles = alleles.sort();
      const diplotype = `${sortedAlleles[0]}/${sortedAlleles[1]}`;
      logger.info('Two alleles detected', { alleles: sortedAlleles, diplotype });
      return diplotype;
    }

    // More than two alleles detected without phasing: return most common allele combination
    logger.warn('More than 2 distinct alleles detected - possible complex case', {
      alleleCount,
      alleles
    });
    
    // Fallback: use the two most common alleles
    const sortedByCount = Object.entries(alleleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([allele]) => allele)
      .sort();
    
    if (sortedByCount.length === 2) {
      const fallbackDiplotype = `${sortedByCount[0]}/${sortedByCount[1]}`;
      logger.info('Using fallback diplotype from 2 most common alleles', { fallbackDiplotype });
      return fallbackDiplotype;
    } else if (sortedByCount.length === 1) {
      const fallbackDiplotype = `${sortedByCount[0]}/${sortedByCount[0]}`;
      logger.info('Using fallback homozygous diplotype', { fallbackDiplotype });
      return fallbackDiplotype;
    }

    logger.error('Could not determine any diplotype - returning Unknown', { alleleCount });
    return 'Unknown';
  }

  /**
   * Determine phenotype from diplotype
   */
  private static determinePhenotype(
    gene: string, 
    diplotype: string, 
    variants: DetectedVariant[]
  ): Phenotype {
    logger.info('Determining phenotype', {
      gene,
      diplotype,
      variantCount: variants.length
    });

    // If no variants detected, assume wild-type normal metabolizer
    if (!variants || variants.length === 0) {
      logger.info('No variants detected - assuming Normal Metabolizer (NM)', { gene });
      return 'NM';
    }

    // If diplotype could not be determined, try to infer from diplotype structure
    if (diplotype === 'Unknown' || !diplotype) {
      logger.warn('Cannot determine phenotype - unknown diplotype, defaulting to NM', {
        gene,
        diplotype,
        variantCount: variants.length
      });
      return 'NM'; // Default to Normal Metabolizer when uncertain
    }

    const alleles = diplotype.split('/');
    
    // Get functional status of each allele
    const functionalStatuses = alleles.map(allele => 
      this.getAlleleFunctionalStatus(gene, allele, variants)
    );

    logger.debug('Allele functional statuses', { alleles, functionalStatuses });

    // Calculate activity score
    const activityScore = functionalStatuses.reduce((sum, status) => {
      switch (status) {
        case 'normal': return sum + 1;
        case 'decreased': return sum + 0.5;
        case 'increased': return sum + 1.5;
        case 'no_function': return sum + 0;
        default: return sum + 1;
      }
    }, 0);

    logger.info('Activity score calculated', { activityScore, functionalStatuses });

    // Determine phenotype based on activity score
    if (activityScore === 0) {
      return 'PM'; // Poor Metabolizer
    } else if (activityScore <= 1) {
      return 'IM'; // Intermediate Metabolizer
    } else if (activityScore <= 2) {
      return 'NM'; // Normal Metabolizer
    } else if (activityScore <= 2.5) {
      return 'RM'; // Rapid Metabolizer
    } else {
      return 'URM'; // Ultra-Rapid Metabolizer
    }
  }

  /**
   * Get functional status of an allele
   */
  private static getAlleleFunctionalStatus(
    _gene: string, 
    allele: string, 
    variants: DetectedVariant[]
  ): 'normal' | 'decreased' | 'increased' | 'no_function' {
    if (allele === '*1') {
      return 'normal'; // Wild-type
    }

    // Find variant with this star allele
    const variant = variants.find(v => v.star_allele === allele);
    if (!variant) {
      return 'normal';
    }

    // Get known variant data
    const knownVariant = getVariantByRsid(variant.rsid);
    if (!knownVariant) {
      return 'normal';
    }

    return knownVariant.functional_status;
  }

  /**
   * Calculate confidence score based on variant quality and coverage
   */
  static calculateConfidence(variants: DetectedVariant[], vcfVariants: VCFVariant[]): number {
    if (variants.length === 0) {
      return 0.5; // Low confidence when no variants detected
    }

    let totalQuality = 0;
    let count = 0;

    for (const variant of variants) {
      const vcfVariant = vcfVariants.find(v => v.rsid === variant.rsid);
      if (vcfVariant && vcfVariant.quality > 0) {
        // Normalize quality score (assuming PHRED scale, max ~100)
        const normalizedQuality = Math.min(vcfVariant.quality / 100, 1);
        totalQuality += normalizedQuality;
        count++;
      }
    }

    if (count === 0) {
      return 0.7; // Medium confidence when variants detected but no quality scores
    }

    const avgQuality = totalQuality / count;
    
    // Boost confidence if multiple variants detected
    const variantBonus = Math.min(variants.length * 0.05, 0.2);
    
    return Math.min(avgQuality + variantBonus, 0.99);
  }

  /**
   * Calculate annotation completeness
   */
  static calculateAnnotationCompleteness(
    detectedVariants: DetectedVariant[], 
    totalVariants: number
  ): number {
    if (totalVariants === 0) return 0;
    
    const annotatedCount = detectedVariants.filter(v => 
      v.gene && v.star_allele
    ).length;

    return Math.min(annotatedCount / Math.max(totalVariants, 1), 1);
  }
}
