import * as fc from 'fast-check';
import { describe, it, expect } from '@jest/globals';
import { VCFParser } from './vcfParser';

/**
 * Property-Based Tests for VCF Parser
 * 
 * Feature: pharmagenai-quality-improvements
 * Property 1: INFO Tag Extraction Completeness
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
 * 
 * Property: For any valid VCF file containing INFO tags with GENE, STAR, or RS annotations,
 * the VCF_Parser should extract all such annotations with 100% accuracy.
 */

// ============================================================================
// Generators for VCF Components
// ============================================================================

/**
 * Generate valid chromosome identifiers
 */
const chromosomeArb = fc.oneof(
  fc.integer({ min: 1, max: 22 }).map((n: number) => n.toString()),
  fc.constantFrom('X', 'Y', 'MT')
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
  fc.constant('.')
);

/**
 * Generate valid nucleotide bases
 */
const nucleotideArb = fc.constantFrom('A', 'C', 'G', 'T');

/**
 * Generate valid quality scores (PHRED scale)
 */
const qualityArb = fc.oneof(
  fc.double({ min: 0, max: 100, noNaN: true }),
  fc.constant('.')
);

/**
 * Generate valid filter values
 */
const filterArb = fc.constantFrom('PASS', 'FAIL', 'LowQual', '.');

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
 * Generate CPIC evidence levels
 */
const cpicLevelArb = fc.constantFrom('A', 'B', 'C', 'D');

/**
 * Generate a complete INFO field with specified tags
 */
interface InfoFieldSpec {
  includeGene: boolean;
  includeStar: boolean;
  includeRs: boolean;
  includeCpic: boolean;
  includeAdditional: boolean;
}

/**
 * Generate a complete VCF variant line
 */
const vcfVariantLineArb = (spec: InfoFieldSpec) => {
  return fc.record({
    chromosome: chromosomeArb,
    position: positionArb,
    rsid: rsidArb,
    ref: nucleotideArb,
    alt: nucleotideArb,
    quality: qualityArb,
    filter: filterArb,
    gene: spec.includeGene ? pgxGeneArb : fc.constant(undefined),
    star: spec.includeStar ? starAlleleArb : fc.constant(undefined),
    rs: spec.includeRs ? rsidArb.filter((rs: string) => rs !== '.') : fc.constant(undefined),
    cpic: spec.includeCpic ? cpicLevelArb : fc.constant(undefined)
  }).map((variant: any) => {
    // Build INFO field
    const infoParts: string[] = [];
    
    if (variant.gene) {
      const tagName = Math.random() > 0.5 ? 'GENE' : 'GENEINFO';
      infoParts.push(`${tagName}=${variant.gene}`);
    }
    if (variant.star) {
      const tagName = Math.random() > 0.5 ? 'STAR' : 'STAR_ALLELE';
      infoParts.push(`${tagName}=${variant.star}`);
    }
    if (variant.rs) {
      const tagName = Math.random() > 0.5 ? 'RS' : 'RSID';
      infoParts.push(`${tagName}=${variant.rs}`);
    }
    if (variant.cpic) {
      const tagName = Math.random() > 0.5 ? 'CPIC' : 'CPIC_LEVEL';
      infoParts.push(`${tagName}=${variant.cpic}`);
    }
    
    // Add some additional tags
    if (spec.includeAdditional) {
      infoParts.push('DP=100', 'AF=0.5');
    }
    
    const infoField = infoParts.join(';');
    const qualityStr = typeof variant.quality === 'number' ? variant.quality.toFixed(1) : '.';
    
    return {
      line: `${variant.chromosome}\t${variant.position}\t${variant.rsid}\t${variant.ref}\t${variant.alt}\t${qualityStr}\t${variant.filter}\t${infoField}`,
      expected: {
        gene: variant.gene,
        star: variant.star,
        rs: variant.rs,
        cpic: variant.cpic
      }
    };
  });
};

/**
 * Generate a complete VCF file with header and variants
 */
const vcfFileArb = (numVariants: number, infoSpec: InfoFieldSpec) => {
  return fc.array(vcfVariantLineArb(infoSpec), { 
    minLength: numVariants, 
    maxLength: numVariants 
  }).map((variants: any[]) => {
    const header = `##fileformat=VCFv4.2
##reference=GRCh38
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">
##INFO=<ID=GENEINFO,Number=1,Type=String,Description="Gene information">
##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele designation">
##INFO=<ID=STAR_ALLELE,Number=1,Type=String,Description="Star allele">
##INFO=<ID=RS,Number=1,Type=String,Description="dbSNP rsID">
##INFO=<ID=RSID,Number=1,Type=String,Description="rsID">
##INFO=<ID=CPIC,Number=1,Type=String,Description="CPIC evidence level">
##INFO=<ID=CPIC_LEVEL,Number=1,Type=String,Description="CPIC level">
##INFO=<ID=DP,Number=1,Type=Integer,Description="Read depth">
##INFO=<ID=AF,Number=1,Type=Float,Description="Allele frequency">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO`;
    
    const variantLines = variants.map((v: any) => v.line).join('\n');
    const expectedTags = variants.map((v: any) => v.expected);
    
    return {
      content: `${header}\n${variantLines}`,
      expectedTags
    };
  });
};

// ============================================================================
// Property Tests
// ============================================================================

describe('VCFParser - Property-Based Tests', () => {
  describe('Property 1: INFO Tag Extraction Completeness', () => {
    /**
     * Property: For any valid VCF file containing INFO tags with GENE annotations,
     * the VCF_Parser should extract all GENE values with 100% accuracy.
     */
    it('should extract all GENE tags with 100% accuracy', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: true, 
            includeStar: false, 
            includeRs: false, 
            includeCpic: false,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const variants = VCFParser.parseVCF(vcfData.content);
            
            // Verify we parsed the expected number of variants
            expect(variants.length).toBe(vcfData.expectedTags.length);
            
            // Verify each variant has the correct GENE tag extracted
            for (let i = 0; i < variants.length; i++) {
              const variant = variants[i];
              const expected = vcfData.expectedTags[i];
              
              expect(variant.gene).toBe(expected.gene);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: For any valid VCF file containing INFO tags with STAR annotations,
     * the VCF_Parser should extract all STAR values with 100% accuracy.
     */
    it('should extract all STAR tags with 100% accuracy', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: false, 
            includeStar: true, 
            includeRs: false, 
            includeCpic: false,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const variants = VCFParser.parseVCF(vcfData.content);
            
            expect(variants.length).toBe(vcfData.expectedTags.length);
            
            for (let i = 0; i < variants.length; i++) {
              const variant = variants[i];
              const expected = vcfData.expectedTags[i];
              
              expect(variant.starAllele).toBe(expected.star);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: For any valid VCF file containing INFO tags with RS annotations,
     * the VCF_Parser should extract all RS values with 100% accuracy.
     */
    it('should extract all RS tags with 100% accuracy', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: false, 
            includeStar: false, 
            includeRs: true, 
            includeCpic: false,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const variants = VCFParser.parseVCF(vcfData.content);
            
            expect(variants.length).toBe(vcfData.expectedTags.length);
            
            for (let i = 0; i < variants.length; i++) {
              const variant = variants[i];
              const expected = vcfData.expectedTags[i];
              
              expect(variant.rsIdentifier).toBe(expected.rs);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: For any valid VCF file containing INFO tags with CPIC annotations,
     * the VCF_Parser should extract all CPIC values with 100% accuracy.
     */
    it('should extract all CPIC tags with 100% accuracy', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: false, 
            includeStar: false, 
            includeRs: false, 
            includeCpic: true,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const variants = VCFParser.parseVCF(vcfData.content);
            
            expect(variants.length).toBe(vcfData.expectedTags.length);
            
            for (let i = 0; i < variants.length; i++) {
              const variant = variants[i];
              const expected = vcfData.expectedTags[i];
              
              expect(variant.cpicLevel).toBe(expected.cpic);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: For any valid VCF file containing ALL INFO tags (GENE, STAR, RS, CPIC),
     * the VCF_Parser should extract all annotations with 100% accuracy.
     * 
     * This is the comprehensive test that validates the complete property.
     */
    it('should extract all INFO tags (GENE, STAR, RS, CPIC) with 100% accuracy', () => {
      fc.assert(
        fc.property(
          vcfFileArb(10, { 
            includeGene: true, 
            includeStar: true, 
            includeRs: true, 
            includeCpic: true,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const variants = VCFParser.parseVCF(vcfData.content);
            
            // Verify we parsed the expected number of variants
            expect(variants.length).toBe(vcfData.expectedTags.length);
            
            // Verify each variant has ALL tags extracted correctly
            for (let i = 0; i < variants.length; i++) {
              const variant = variants[i];
              const expected = vcfData.expectedTags[i];
              
              // All tags should be extracted with 100% accuracy
              expect(variant.gene).toBe(expected.gene);
              expect(variant.starAllele).toBe(expected.star);
              expect(variant.rsIdentifier).toBe(expected.rs);
              expect(variant.cpicLevel).toBe(expected.cpic);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: For any valid VCF file with mixed INFO tags (some variants have all tags,
     * some have partial tags), the VCF_Parser should extract present tags accurately
     * and leave absent tags as undefined.
     */
    it('should handle mixed INFO tags correctly across multiple variants', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              includeGene: fc.boolean(),
              includeStar: fc.boolean(),
              includeRs: fc.boolean(),
              includeCpic: fc.boolean()
            }),
            { minLength: 3, maxLength: 10 }
          ).chain((specs: any[]) => {
            // Generate variants with different INFO tag combinations
            return fc.tuple(
              ...specs.map((spec: any) => 
                vcfVariantLineArb({ ...spec, includeAdditional: true })
              )
            ).map((variants: any[]) => {
              const header = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO`;
              const variantLines = variants.map((v: any) => v.line).join('\n');
              const expectedTags = variants.map((v: any) => v.expected);
              
              return {
                content: `${header}\n${variantLines}`,
                expectedTags
              };
            });
          }),
          (vcfData: any) => {
            const variants = VCFParser.parseVCF(vcfData.content);
            
            expect(variants.length).toBe(vcfData.expectedTags.length);
            
            for (let i = 0; i < variants.length; i++) {
              const variant = variants[i];
              const expected = vcfData.expectedTags[i];
              
              // Check each tag - should match expected or be undefined
              if (expected.gene !== undefined) {
                expect(variant.gene).toBe(expected.gene);
              } else {
                expect(variant.gene).toBeUndefined();
              }
              
              if (expected.star !== undefined) {
                expect(variant.starAllele).toBe(expected.star);
              } else {
                expect(variant.starAllele).toBeUndefined();
              }
              
              if (expected.rs !== undefined) {
                expect(variant.rsIdentifier).toBe(expected.rs);
              } else {
                expect(variant.rsIdentifier).toBeUndefined();
              }
              
              if (expected.cpic !== undefined) {
                expect(variant.cpicLevel).toBe(expected.cpic);
              } else {
                expect(variant.cpicLevel).toBeUndefined();
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });
  });

  /**
   * Property 2: VCF Round-Trip Preservation
   * 
   * **Validates: Requirements 2.2, 2.3, 2.4**
   * 
   * Property: For any valid VCF file, parsing then serializing then parsing should
   * produce equivalent variant data, including all INFO tags and quality scores.
   */
  describe('Property 2: VCF Round-Trip Preservation', () => {
    /**
     * Property: For any valid VCF file, round-trip (parse → serialize → parse)
     * should preserve all variant data with 100% accuracy.
     */
    it('should preserve all variant data through round-trip (parse → serialize → parse)', () => {
      fc.assert(
        fc.property(
          vcfFileArb(10, { 
            includeGene: true, 
            includeStar: true, 
            includeRs: true, 
            includeCpic: true,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            // Parse original VCF
            const originalVariants = VCFParser.parseVCF(vcfData.content);
            
            // Extract header
            const header = VCFParser.extractHeader(vcfData.content);
            
            // Serialize back to VCF format
            const serialized = VCFParser.serializeToVCF(originalVariants, header);
            
            // Parse the serialized content
            const roundTripVariants = VCFParser.parseVCF(serialized);
            
            // Verify variant count is preserved
            expect(roundTripVariants.length).toBe(originalVariants.length);
            
            // Verify each variant is preserved exactly
            for (let i = 0; i < originalVariants.length; i++) {
              const orig = originalVariants[i];
              const rt = roundTripVariants[i];
              
              // Core fields must match exactly
              expect(rt.chromosome).toBe(orig.chromosome);
              expect(rt.position).toBe(orig.position);
              expect(rt.ref).toBe(orig.ref);
              expect(rt.alt).toBe(orig.alt);
              
              // Quality scores must match (within floating point tolerance)
              expect(Math.abs(rt.quality - orig.quality)).toBeLessThan(0.01);
              
              // INFO tags must be preserved
              expect(rt.gene).toBe(orig.gene);
              expect(rt.starAllele).toBe(orig.starAllele);
              expect(rt.rsIdentifier).toBe(orig.rsIdentifier);
              expect(rt.cpicLevel).toBe(orig.cpicLevel);
              
              // INFO object must be preserved
              expect(Object.keys(rt.info).sort()).toEqual(Object.keys(orig.info).sort());
              for (const key of Object.keys(orig.info)) {
                expect(rt.info[key]).toBe(orig.info[key]);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Round-trip validation should report success for valid VCF files
     * with complete INFO tags.
     */
    it('should report successful round-trip validation for valid VCF files', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: true, 
            includeStar: true, 
            includeRs: true, 
            includeCpic: true,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const result = VCFParser.validateRoundTrip(vcfData.content);
            
            // Round-trip should succeed
            expect(result.success).toBe(true);
            
            // Variant counts should match
            expect(result.roundTripVariantCount).toBe(result.originalVariantCount);
            
            // INFO tags should be preserved
            expect(result.infoTagsPreserved).toBe(true);
            
            // Quality scores should be preserved
            expect(result.qualityScoresPreserved).toBe(true);
            
            // No errors should be reported
            expect(result.errors).toEqual([]);
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Round-trip should preserve INFO tags even when some tags are missing.
     */
    it('should preserve partial INFO tags through round-trip', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              includeGene: fc.boolean(),
              includeStar: fc.boolean(),
              includeRs: fc.boolean(),
              includeCpic: fc.boolean()
            }),
            { minLength: 3, maxLength: 8 }
          ).chain((specs: any[]) => {
            return fc.tuple(
              ...specs.map((spec: any) => 
                vcfVariantLineArb({ ...spec, includeAdditional: true })
              )
            ).map((variants: any[]) => {
              const header = `##fileformat=VCFv4.2
##reference=GRCh38
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">
##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">
##INFO=<ID=RS,Number=1,Type=String,Description="rsID">
##INFO=<ID=CPIC,Number=1,Type=String,Description="CPIC level">
##INFO=<ID=DP,Number=1,Type=Integer,Description="Read depth">
##INFO=<ID=AF,Number=1,Type=Float,Description="Allele frequency">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO`;
              const variantLines = variants.map((v: any) => v.line).join('\n');
              
              return `${header}\n${variantLines}`;
            });
          }),
          (vcfContent: string) => {
            // Parse original
            const originalVariants = VCFParser.parseVCF(vcfContent);
            
            // Round-trip
            const header = VCFParser.extractHeader(vcfContent);
            const serialized = VCFParser.serializeToVCF(originalVariants, header);
            const roundTripVariants = VCFParser.parseVCF(serialized);
            
            // Verify preservation
            expect(roundTripVariants.length).toBe(originalVariants.length);
            
            for (let i = 0; i < originalVariants.length; i++) {
              const orig = originalVariants[i];
              const rt = roundTripVariants[i];
              
              // All fields should match, including undefined values
              expect(rt.gene).toBe(orig.gene);
              expect(rt.starAllele).toBe(orig.starAllele);
              expect(rt.rsIdentifier).toBe(orig.rsIdentifier);
              expect(rt.cpicLevel).toBe(orig.cpicLevel);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Round-trip should preserve quality scores accurately.
     */
    it('should preserve quality scores through round-trip', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: true, 
            includeStar: false, 
            includeRs: false, 
            includeCpic: false,
            includeAdditional: false 
          }),
          (vcfData: any) => {
            const originalVariants = VCFParser.parseVCF(vcfData.content);
            const header = VCFParser.extractHeader(vcfData.content);
            const serialized = VCFParser.serializeToVCF(originalVariants, header);
            const roundTripVariants = VCFParser.parseVCF(serialized);
            
            // Check quality scores are preserved
            for (let i = 0; i < originalVariants.length; i++) {
              const orig = originalVariants[i];
              const rt = roundTripVariants[i];
              
              // Quality scores should match within floating point tolerance
              const qualityDiff = Math.abs(rt.quality - orig.quality);
              expect(qualityDiff).toBeLessThan(0.01);
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Round-trip should preserve all INFO fields, not just extracted tags.
     */
    it('should preserve all INFO fields including additional annotations', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: true, 
            includeStar: true, 
            includeRs: true, 
            includeCpic: true,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const originalVariants = VCFParser.parseVCF(vcfData.content);
            const header = VCFParser.extractHeader(vcfData.content);
            const serialized = VCFParser.serializeToVCF(originalVariants, header);
            const roundTripVariants = VCFParser.parseVCF(serialized);
            
            // Check all INFO fields are preserved
            for (let i = 0; i < originalVariants.length; i++) {
              const orig = originalVariants[i];
              const rt = roundTripVariants[i];
              
              // INFO object should have same keys
              const origKeys = Object.keys(orig.info).sort();
              const rtKeys = Object.keys(rt.info).sort();
              expect(rtKeys).toEqual(origKeys);
              
              // All INFO values should match
              for (const key of origKeys) {
                expect(rt.info[key]).toBe(orig.info[key]);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100, seed: 42 }
      );
    });

    /**
     * Property: Multiple round-trips should produce identical results (idempotency).
     */
    it('should be idempotent - multiple round-trips produce identical results', () => {
      fc.assert(
        fc.property(
          vcfFileArb(5, { 
            includeGene: true, 
            includeStar: true, 
            includeRs: true, 
            includeCpic: true,
            includeAdditional: true 
          }),
          (vcfData: any) => {
            const header = VCFParser.extractHeader(vcfData.content);
            
            // First round-trip
            const variants1 = VCFParser.parseVCF(vcfData.content);
            const serialized1 = VCFParser.serializeToVCF(variants1, header);
            const roundTrip1 = VCFParser.parseVCF(serialized1);
            
            // Second round-trip
            const serialized2 = VCFParser.serializeToVCF(roundTrip1, header);
            const roundTrip2 = VCFParser.parseVCF(serialized2);
            
            // Third round-trip
            const serialized3 = VCFParser.serializeToVCF(roundTrip2, header);
            const roundTrip3 = VCFParser.parseVCF(serialized3);
            
            // All round-trips should produce identical results
            expect(roundTrip2.length).toBe(roundTrip1.length);
            expect(roundTrip3.length).toBe(roundTrip1.length);
            
            for (let i = 0; i < roundTrip1.length; i++) {
              const rt1 = roundTrip1[i];
              const rt2 = roundTrip2[i];
              const rt3 = roundTrip3[i];
              
              // All core fields should match
              expect(rt2.chromosome).toBe(rt1.chromosome);
              expect(rt3.chromosome).toBe(rt1.chromosome);
              expect(rt2.position).toBe(rt1.position);
              expect(rt3.position).toBe(rt1.position);
              
              // All INFO tags should match
              expect(rt2.gene).toBe(rt1.gene);
              expect(rt3.gene).toBe(rt1.gene);
              expect(rt2.starAllele).toBe(rt1.starAllele);
              expect(rt3.starAllele).toBe(rt1.starAllele);
            }
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });
  });
});
