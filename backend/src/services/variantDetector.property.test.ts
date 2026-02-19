import * as fc from 'fast-check';
import { VariantDetector } from './variantDetector';
import { VCFVariant } from '../types';
import { KnownVariant, KNOWN_PGX_VARIANTS } from '../data/pharmacogenomicVariants';

/**
 * Property-Based Tests for Variant Detector
 * 
 * Feature: pharmagenai-quality-improvements
 * Property 4: Database Matching Attempt
 * 
 * **Validates: Requirements 3.2**
 * 
 * Property: For any detected pharmacogenomic variant, the Variant_Detector should
 * attempt to match it against the PGx_Database using GENE, STAR, and RS identifiers.
 */

// ============================================================================
// Generators for VCF Variants
// ============================================================================

/**
 * Generate valid chromosome identifiers
 */
const chromosomeArb = fc.oneof(
  fc.integer({ min: 1, max: 22 }).map((n: number) => n.toString()),
  fc.constantFrom('X', 'Y', 'MT', '1', '6', '10', '12', '22')
);

/**
 * Generate valid genomic positions
 */
const positionArb = fc.integer({ min: 1, max: 250000000 });

/**
 * Generate valid rsID identifiers
 */
const rsidArb = fc.oneof(
  fc.integer({ min: 1, max: 999999999 }).map((n: number) => `rs${n}`),
  fc.constant('.'),
  fc.constant('')
);

/**
 * Generate valid nucleotide bases
 */
const nucleotideArb = fc.constantFrom('A', 'C', 'G', 'T');

/**
 * Generate valid quality scores (PHRED scale)
 */
const qualityArb = fc.double({ min: 0, max: 100, noNaN: true });

/**
 * Generate pharmacogenomic gene names
 */
const pgxGeneArb = fc.constantFrom(
  'CYP2D6',
  'CYP2C19',
  'CYP2C9',
  'SLCO1B1',
  'TPMT',
  'DPYD'
);

/**
 * Generate STAR allele designations
 */
const starAlleleArb = fc.oneof(
  fc.integer({ min: 1, max: 100 }).map((n: number) => `*${n}`),
  fc.integer({ min: 1, max: 100 }).map((n: number) => `*${n}A`),
  fc.integer({ min: 1, max: 100 }).map((n: number) => `*${n}B`)
);

/**
 * Generate a VCF variant with pharmacogenomic gene annotation
 */
const pgxVcfVariantArb = fc.record({
  chromosome: chromosomeArb,
  position: positionArb,
  rsid: rsidArb,
  ref: nucleotideArb,
  alt: nucleotideArb,
  quality: qualityArb,
  filter: fc.constantFrom('PASS', 'FAIL', '.'),
  gene: pgxGeneArb,
  starAllele: fc.option(starAlleleArb, { nil: undefined }),
  rsIdentifier: fc.option(rsidArb.filter((rs: string) => rs !== '.' && rs !== ''), { nil: undefined })
}).map((variant: any): VCFVariant => {
  // Build INFO object
  const info: Record<string, string> = {};
  
  if (variant.gene) {
    info.GENE = variant.gene;
  }
  if (variant.starAllele) {
    info.STAR = variant.starAllele;
  }
  if (variant.rsIdentifier) {
    info.RS = variant.rsIdentifier;
  }
  
  return {
    chromosome: variant.chromosome,
    position: variant.position,
    rsid: variant.rsid,
    ref: variant.ref,
    alt: variant.alt,
    quality: variant.quality,
    filter: variant.filter,
    info,
    gene: variant.gene,
    starAllele: variant.starAllele,
    rsIdentifier: variant.rsIdentifier
  };
});

/**
 * Generate a VCF variant based on a known variant (for testing matching)
 */
const knownVariantBasedVcfArb = fc.constantFrom(...KNOWN_PGX_VARIANTS).map((kv: KnownVariant): VCFVariant => {
  return {
    chromosome: kv.chromosome,
    position: kv.position,
    rsid: kv.rsid,
    ref: kv.ref,
    alt: kv.alt,
    quality: 35.0,
    filter: 'PASS',
    info: {
      GENE: kv.gene,
      STAR: kv.star_allele,
      RS: kv.rsid
    },
    gene: kv.gene,
    starAllele: kv.star_allele,
    rsIdentifier: kv.rsid
  };
});

// ============================================================================
// Property Tests
// ============================================================================

describe('VariantDetector - Property-Based Tests', () => {
  describe('Property 4: Database Matching Attempt', () => {
    /**
     * Property: For any detected pharmacogenomic variant, the Variant_Detector should
     * attempt to match it against the PGx_Database using GENE, STAR, and RS identifiers.
     * 
     * This test verifies that:
     * 1. Every PGx variant goes through the matching process
     * 2. The matching algorithm attempts all strategies (rsID, position, STAR+gene)
     * 3. Variants are categorized as either matched or unmatched
     * 4. No PGx variant is ignored or skipped
     */
    it('should attempt to match every pharmacogenomic variant against the database', () => {
      fc.assert(
        fc.property(
          fc.array(pgxVcfVariantArb, { minLength: 1, maxLength: 20 }),
          (vcfVariants: VCFVariant[]) => {
            // Run detection
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // Property 1: Every PGx variant should be processed
            // The sum of matched + unmatched should equal the number of PGx variants found
            const totalProcessed = result.matched.length + result.unmatched.length;
            expect(totalProcessed).toBe(result.pgxVariantsFound);
            
            // Property 2: No variant should be lost
            // All PGx variants should be accounted for (either matched or unmatched)
            expect(result.pgxVariantsFound).toBeGreaterThanOrEqual(0);
            expect(result.pgxVariantsFound).toBeLessThanOrEqual(vcfVariants.length);
            
            // Property 3: Matched count should equal the length of matched array
            expect(result.matchedCount).toBe(result.matched.length);
            
            // Property 4: Every matched variant should have matching metadata
            for (const matched of result.matched) {
              // Should have a matching strategy recorded
              expect(matched.matchedBy).not.toBeNull();
              expect(['rsid', 'position', 'star_allele']).toContain(matched.matchedBy);
              
              // Should have a confidence score
              expect(matched.matchConfidence).toBeGreaterThan(0);
              expect(matched.matchConfidence).toBeLessThanOrEqual(1);
              
              // Should have gene information
              expect(matched.gene).toBeDefined();
              expect(matched.gene).not.toBe('');
            }
            
            // Property 5: Detection state should be consistent with counts
            if (vcfVariants.length === 0) {
              expect(result.state).toBe('no_variants_in_vcf');
            } else if (result.pgxVariantsFound === 0) {
              expect(result.state).toBe('no_pgx_variants_detected');
            } else if (result.matchedCount === 0) {
              expect(result.state).toBe('pgx_variants_found_none_matched');
            } else if (result.matchedCount < result.pgxVariantsFound) {
              expect(result.state).toBe('pgx_variants_found_some_matched');
            } else {
              expect(result.state).toBe('pgx_variants_found_all_matched');
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: When a variant has an rsID that matches a known variant,
     * the matching should succeed with high confidence.
     */
    it('should successfully match variants by rsID with high confidence', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 10 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // All variants should be matched (they're based on known variants)
            expect(result.matchedCount).toBe(vcfVariants.length);
            expect(result.unmatched.length).toBe(0);
            
            // All should be matched by rsID with high confidence
            for (const matched of result.matched) {
              expect(matched.matchedBy).toBe('rsid');
              expect(matched.matchConfidence).toBe(0.95);
            }
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: When a variant has position + ref + alt that matches a known variant,
     * the matching should succeed even without rsID.
     */
    it('should match variants by position when rsID is missing', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 10 }),
          (vcfVariants: VCFVariant[]) => {
            // Remove rsID to force position-based matching
            const variantsWithoutRsid = vcfVariants.map(v => {
              const newInfo = { ...v.info };
              delete newInfo.RS;
              return {
                ...v,
                rsid: '.',
                info: newInfo,
                rsIdentifier: undefined
              };
            });
            
            const result = VariantDetector.detectPharmacogenomicVariants(
              variantsWithoutRsid,
              KNOWN_PGX_VARIANTS
            );
            
            // All variants should still be matched (by position)
            expect(result.matchedCount).toBe(variantsWithoutRsid.length);
            
            // All should be matched by position
            for (const matched of result.matched) {
              expect(matched.matchedBy).toBe('position');
              expect(matched.matchConfidence).toBe(0.85);
            }
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: When a variant has STAR allele + gene that matches a known variant,
     * the matching should succeed.
     */
    it('should match variants by STAR allele and gene', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 10 }),
          (vcfVariants: VCFVariant[]) => {
            // Remove rsID and alter position to force STAR-based matching
            const variantsWithStarOnly = vcfVariants.map(v => ({
              ...v,
              rsid: '.',
              position: v.position + 1000, // Change position to prevent position match
              ref: 'A', // Change ref/alt to prevent position match
              alt: 'G',
              info: {
                GENE: v.gene!,
                STAR: v.starAllele!
              },
              rsIdentifier: undefined
            }));
            
            const result = VariantDetector.detectPharmacogenomicVariants(
              variantsWithStarOnly,
              KNOWN_PGX_VARIANTS
            );
            
            // All variants should be matched by STAR allele
            expect(result.matchedCount).toBe(variantsWithStarOnly.length);
            
            // All should be matched by star_allele
            for (const matched of result.matched) {
              expect(matched.matchedBy).toBe('star_allele');
              expect(matched.matchConfidence).toBe(0.70);
            }
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: The matching algorithm should try multiple strategies in order
     * of confidence (rsID > position > STAR > gene proximity).
     */
    it('should attempt multiple matching strategies in priority order', () => {
      fc.assert(
        fc.property(
          fc.array(pgxVcfVariantArb, { minLength: 5, maxLength: 15 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // Verify confidence scores match expected strategies
            for (const matched of result.matched) {
              switch (matched.matchedBy) {
                case 'rsid':
                  expect(matched.matchConfidence).toBe(0.95);
                  break;
                case 'position':
                  expect(matched.matchConfidence).toBeGreaterThanOrEqual(0.50);
                  expect(matched.matchConfidence).toBeLessThanOrEqual(0.85);
                  break;
                case 'star_allele':
                  expect(matched.matchConfidence).toBe(0.70);
                  break;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Unmatched variants should not have matching metadata.
     */
    it('should properly categorize unmatched variants', () => {
      fc.assert(
        fc.property(
          fc.array(pgxVcfVariantArb, { minLength: 5, maxLength: 15 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // Unmatched variants should be VCFVariants, not DetectedVariants
            for (const unmatched of result.unmatched) {
              // Should have basic VCF fields
              expect(unmatched.chromosome).toBeDefined();
              expect(unmatched.position).toBeDefined();
              expect(unmatched.ref).toBeDefined();
              expect(unmatched.alt).toBeDefined();
              
              // Should have gene annotation (since we filtered for PGx genes)
              expect(unmatched.gene || unmatched.info.GENE).toBeDefined();
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: The total number of VCF variants should always be >= PGx variants found.
     */
    it('should correctly count total VCF variants vs PGx variants', () => {
      fc.assert(
        fc.property(
          fc.array(pgxVcfVariantArb, { minLength: 0, maxLength: 20 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // Total VCF variants should be >= PGx variants
            expect(result.totalVcfVariants).toBeGreaterThanOrEqual(result.pgxVariantsFound);
            
            // Total VCF variants should match input
            expect(result.totalVcfVariants).toBe(vcfVariants.length);
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Every pharmacogenomic variant should be attempted for matching,
     * regardless of whether it ultimately matches or not.
     */
    it('should attempt matching for all PGx variants without skipping any', () => {
      fc.assert(
        fc.property(
          fc.array(pgxVcfVariantArb, { minLength: 1, maxLength: 20 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // Critical property: matched + unmatched = total PGx variants
            const accountedFor = result.matched.length + result.unmatched.length;
            expect(accountedFor).toBe(result.pgxVariantsFound);
            
            // No variant should be lost in the process
            expect(result.pgxVariantsFound).toBeGreaterThanOrEqual(0);
            
            // If we have PGx variants, they should all be accounted for
            if (result.pgxVariantsFound > 0) {
              expect(accountedFor).toBeGreaterThan(0);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Matched variants should have all required metadata fields populated.
     */
    it('should populate all metadata fields for matched variants', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 10 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // All variants should be matched
            expect(result.matchedCount).toBeGreaterThan(0);
            
            // Check all required metadata fields
            for (const matched of result.matched) {
              // Matching metadata
              expect(matched.matchedBy).not.toBeNull();
              expect(matched.matchConfidence).toBeGreaterThan(0);
              
              // Core variant data
              expect(matched.rsid).toBeDefined();
              expect(matched.chromosome).toBeDefined();
              expect(matched.position).toBeDefined();
              expect(matched.gene).toBeDefined();
              expect(matched.star_allele).toBeDefined();
              
              // Clinical data from database
              expect(matched.evidenceLevel).toBeDefined();
              expect(['A', 'B', 'C', 'D']).toContain(matched.evidenceLevel);
              
              expect(matched.functionalStatus).toBeDefined();
              expect(['normal', 'decreased', 'increased', 'no_function']).toContain(matched.functionalStatus);
              
              expect(matched.clinicalSignificance).toBeDefined();
              expect(matched.clinicalSignificance).not.toBe('');
            }
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });
  });

  describe('Property 5: Drug Interaction Data Retrieval', () => {
    /**
     * Property: For any variant that successfully matches a PGx_Database entry,
     * the Variant_Detector should retrieve the associated drug interaction data
     * including functional status and clinical significance.
     * 
     * **Validates: Requirements 3.3**
     * 
     * This test verifies that:
     * 1. Every matched variant includes drug interaction data from the database
     * 2. Evidence level (CPIC guideline level) is retrieved
     * 3. Functional status is retrieved
     * 4. Clinical significance is retrieved
     * 5. CPIC guideline information is available
     * 6. Drugs affected by the variant are available
     */
    it('should retrieve drug interaction data for all matched variants', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 15 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // All variants should be matched (they're based on known variants)
            expect(result.matchedCount).toBeGreaterThan(0);
            expect(result.matched.length).toBe(vcfVariants.length);
            
            // Property 1: Every matched variant must have evidence level
            for (const matched of result.matched) {
              expect(matched.evidenceLevel).toBeDefined();
              expect(['A', 'B', 'C', 'D']).toContain(matched.evidenceLevel);
            }
            
            // Property 2: Every matched variant must have functional status
            for (const matched of result.matched) {
              expect(matched.functionalStatus).toBeDefined();
              expect(['normal', 'decreased', 'increased', 'no_function']).toContain(
                matched.functionalStatus
              );
            }
            
            // Property 3: Every matched variant must have clinical significance
            for (const matched of result.matched) {
              expect(matched.clinicalSignificance).toBeDefined();
              expect(matched.clinicalSignificance).not.toBe('');
              expect(typeof matched.clinicalSignificance).toBe('string');
            }
            
            // Property 4: Drug interaction data should match the database entry
            for (const matched of result.matched) {
              const knownVariant = KNOWN_PGX_VARIANTS.find(kv => kv.rsid === matched.rsid);
              expect(knownVariant).toBeDefined();
              
              if (knownVariant) {
                // Verify data was correctly retrieved from database
                expect(matched.evidenceLevel).toBe(knownVariant.evidence_level);
                expect(matched.functionalStatus).toBe(knownVariant.functional_status);
                expect(matched.clinicalSignificance).toBe(knownVariant.clinical_significance);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Matched variants should have complete drug interaction metadata
     * that can be used for clinical decision making.
     */
    it('should provide complete drug interaction metadata for clinical use', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 10 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // All matched variants should have complete metadata
            for (const matched of result.matched) {
              // Core identification
              expect(matched.rsid).toBeDefined();
              expect(matched.gene).toBeDefined();
              expect(matched.star_allele).toBeDefined();
              
              // Drug interaction data
              expect(matched.evidenceLevel).toBeDefined();
              expect(matched.functionalStatus).toBeDefined();
              expect(matched.clinicalSignificance).toBeDefined();
              
              // Matching metadata
              expect(matched.matchedBy).not.toBeNull();
              expect(matched.matchConfidence).toBeGreaterThan(0);
              
              // Verify we can look up additional drug information
              const knownVariant = KNOWN_PGX_VARIANTS.find(kv => kv.rsid === matched.rsid);
              expect(knownVariant).toBeDefined();
              
              if (knownVariant) {
                // Verify CPIC guideline is available
                expect(knownVariant.cpic_guideline).toBeDefined();
                expect(knownVariant.cpic_guideline).not.toBe('');
                
                // Verify drugs affected list is available
                expect(knownVariant.drugs_affected).toBeDefined();
                expect(Array.isArray(knownVariant.drugs_affected)).toBe(true);
                expect(knownVariant.drugs_affected.length).toBeGreaterThan(0);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Evidence levels should be valid CPIC levels (A, B, C, or D).
     */
    it('should retrieve valid CPIC evidence levels', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 20 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            const validEvidenceLevels = ['A', 'B', 'C', 'D'];
            
            for (const matched of result.matched) {
              expect(validEvidenceLevels).toContain(matched.evidenceLevel);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Functional status should be one of the valid categories.
     */
    it('should retrieve valid functional status categories', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 20 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            const validFunctionalStatuses = ['normal', 'decreased', 'increased', 'no_function'];
            
            for (const matched of result.matched) {
              expect(validFunctionalStatuses).toContain(matched.functionalStatus);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Drug interaction data should be consistent across different
     * matching strategies (rsID, position, STAR allele).
     */
    it('should retrieve same drug interaction data regardless of matching strategy', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...KNOWN_PGX_VARIANTS),
          (knownVariant: KnownVariant) => {
            // Create three variants based on the same known variant
            // but force different matching strategies
            
            // Variant 1: Match by rsID
            const variantByRsid: VCFVariant = {
              chromosome: knownVariant.chromosome,
              position: knownVariant.position,
              rsid: knownVariant.rsid,
              ref: knownVariant.ref,
              alt: knownVariant.alt,
              quality: 35.0,
              filter: 'PASS',
              info: { GENE: knownVariant.gene },
              gene: knownVariant.gene
            };
            
            // Variant 2: Match by position (no rsID)
            const variantByPosition: VCFVariant = {
              chromosome: knownVariant.chromosome,
              position: knownVariant.position,
              rsid: '.',
              ref: knownVariant.ref,
              alt: knownVariant.alt,
              quality: 35.0,
              filter: 'PASS',
              info: { GENE: knownVariant.gene },
              gene: knownVariant.gene
            };
            
            // Variant 3: Match by STAR allele (different position)
            const variantByStarAllele: VCFVariant = {
              chromosome: knownVariant.chromosome,
              position: knownVariant.position + 1000, // Different position
              rsid: '.',
              ref: 'A',
              alt: 'G',
              quality: 35.0,
              filter: 'PASS',
              info: {
                GENE: knownVariant.gene,
                STAR: knownVariant.star_allele
              },
              gene: knownVariant.gene,
              starAllele: knownVariant.star_allele
            };
            
            // Test each matching strategy
            const result1 = VariantDetector.detectPharmacogenomicVariants(
              [variantByRsid],
              KNOWN_PGX_VARIANTS
            );
            const result2 = VariantDetector.detectPharmacogenomicVariants(
              [variantByPosition],
              KNOWN_PGX_VARIANTS
            );
            const result3 = VariantDetector.detectPharmacogenomicVariants(
              [variantByStarAllele],
              KNOWN_PGX_VARIANTS
            );
            
            // All should match
            expect(result1.matchedCount).toBe(1);
            expect(result2.matchedCount).toBe(1);
            expect(result3.matchedCount).toBe(1);
            
            // All should retrieve the same drug interaction data
            const matched1 = result1.matched[0];
            const matched2 = result2.matched[0];
            const matched3 = result3.matched[0];
            
            // Evidence level should be the same
            expect(matched1.evidenceLevel).toBe(knownVariant.evidence_level);
            expect(matched2.evidenceLevel).toBe(knownVariant.evidence_level);
            expect(matched3.evidenceLevel).toBe(knownVariant.evidence_level);
            
            // Functional status should be the same
            expect(matched1.functionalStatus).toBe(knownVariant.functional_status);
            expect(matched2.functionalStatus).toBe(knownVariant.functional_status);
            expect(matched3.functionalStatus).toBe(knownVariant.functional_status);
            
            // Clinical significance should be the same
            expect(matched1.clinicalSignificance).toBe(knownVariant.clinical_significance);
            expect(matched2.clinicalSignificance).toBe(knownVariant.clinical_significance);
            expect(matched3.clinicalSignificance).toBe(knownVariant.clinical_significance);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Unmatched variants should NOT have drug interaction data.
     */
    it('should not populate drug interaction data for unmatched variants', () => {
      fc.assert(
        fc.property(
          fc.array(pgxVcfVariantArb, { minLength: 5, maxLength: 15 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            // Unmatched variants should be plain VCFVariants
            // They should not have the enhanced DetectedVariant fields
            for (const unmatched of result.unmatched) {
              // Should have basic VCF fields
              expect(unmatched.chromosome).toBeDefined();
              expect(unmatched.position).toBeDefined();
              
              // Should NOT have drug interaction metadata
              // (TypeScript types prevent this, but we verify at runtime)
              expect((unmatched as any).evidenceLevel).toBeUndefined();
              expect((unmatched as any).functionalStatus).toBeUndefined();
              expect((unmatched as any).clinicalSignificance).toBeUndefined();
              expect((unmatched as any).matchedBy).toBeUndefined();
              expect((unmatched as any).matchConfidence).toBeUndefined();
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: All matched variants should have non-empty clinical significance.
     */
    it('should retrieve non-empty clinical significance for all matched variants', () => {
      fc.assert(
        fc.property(
          fc.array(knownVariantBasedVcfArb, { minLength: 1, maxLength: 15 }),
          (vcfVariants: VCFVariant[]) => {
            const result = VariantDetector.detectPharmacogenomicVariants(
              vcfVariants,
              KNOWN_PGX_VARIANTS
            );
            
            for (const matched of result.matched) {
              expect(matched.clinicalSignificance).toBeDefined();
              expect(matched.clinicalSignificance).not.toBe('');
              
              // Should be a meaningful description
              if (matched.clinicalSignificance) {
                expect(matched.clinicalSignificance.length).toBeGreaterThan(0);
                expect(typeof matched.clinicalSignificance).toBe('string');
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });
  });
});
