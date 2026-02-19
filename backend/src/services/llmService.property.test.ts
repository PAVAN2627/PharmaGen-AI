import * as fc from 'fast-check';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { LLMService } from './llmService';
import { DetectedVariant, Phenotype, LLMExplanation } from '../types';

/**
 * Property-Based Tests for LLM Service
 * 
 * Feature: pharmagenai-quality-improvements
 * Property 12: Complete Variant Citation
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 * 
 * Property: For any explanation generated for detected PGx_Variants,
 * the LLM_Explainer should include citations containing the rsID (when available),
 * STAR allele (when available), and gene name for each variant.
 */

// Set up test environment
beforeAll(() => {
  // Set dummy API key for testing (we're only testing fallback and validation methods)
  if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = 'test-api-key-for-unit-tests';
  }
  if (!process.env.GEMINI_MODEL) {
    process.env.GEMINI_MODEL = 'gemini-1.5-flash';
  }
});

// ============================================================================
// Generators for LLM Service Components
// ============================================================================

/**
 * Generate valid rsID
 */
const rsidArb = fc.oneof(
  fc.constantFrom('rs3892097', 'rs4244285', 'rs1799853', 'rs4149056', 'rs1800462', 'rs3918290'),
  fc.string({ minLength: 2, maxLength: 10 }).map(s => `rs${s.replace(/[^0-9]/g, '')}`)
);

/**
 * Generate STAR allele
 */
const starAlleleArb = fc.oneof(
  fc.constantFrom('*1', '*2', '*3', '*4', '*5', '*10', '*17'),
  fc.integer({ min: 1, max: 20 }).map(n => `*${n}`)
);

/**
 * Generate gene name
 */
const geneArb = fc.constantFrom('CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD');

/**
 * Generate phenotype
 */
const phenotypeArb = fc.constantFrom<Phenotype>('PM', 'IM', 'NM', 'RM', 'URM', 'Unknown');

/**
 * Generate detected variant
 */
const detectedVariantArb = fc.record({
  rsid: rsidArb,
  chromosome: fc.constantFrom('1', '2', '10', '16', '22'),
  position: fc.integer({ min: 1000000, max: 100000000 }).map(String),
  ref: fc.constantFrom('A', 'C', 'G', 'T'),
  alt: fc.constantFrom('A', 'C', 'G', 'T'),
  genotype: fc.constantFrom('0/1', '1/1', '0/0'),
  gene: geneArb,
  star_allele: starAlleleArb,
  evidenceLevel: fc.constantFrom('A', 'B', 'C', 'D'),
  functionalStatus: fc.constantFrom('normal', 'decreased', 'increased', 'no_function')
});

/**
 * Generate array of detected variants
 */
const variantsArb = fc.array(detectedVariantArb, { minLength: 1, maxLength: 5 });

/**
 * Generate drug name
 */
const drugArb = fc.constantFrom('CODEINE', 'WARFARIN', 'CLOPIDOGREL', 'SIMVASTATIN', 'AZATHIOPRINE', 'FLUOROURACIL');

// ============================================================================
// Property Tests
// ============================================================================

describe('LLMService - Property-Based Tests', () => {
  describe('Property 12: Complete Variant Citation', () => {
    /**
     * **Property 12: Complete Variant Citation**
     * 
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
     * 
     * Property: For any explanation generated for detected PGx_Variants,
     * the LLM_Explainer should include citations containing the rsID (when available),
     * STAR allele (when available), and gene name for each variant.
     * 
     * This property ensures that:
     * 1. All variants with rsIDs are cited by their rsID
     * 2. All variants with STAR alleles are cited by their STAR allele
     * 3. All variants are cited with their gene name
     * 4. The validation method correctly detects missing citations
     */
    it('should validate that fallback explanations cite all variants', () => {
      fc.assert(
        fc.property(
          drugArb,
          geneArb,
          phenotypeArb,
          variantsArb,
          (drug: string, gene: string, phenotype: Phenotype, variants: DetectedVariant[]) => {
            // Create LLM service instance
            const llmService = new LLMService();
            
            // Generate fallback explanation (which we control)
            const explanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              phenotype,
              variants
            );
            
            // Validate the explanation
            const validation = llmService.validateExplanation(explanation, variants);
            
            // Property 1: All rsIDs should be cited
            // Check if each variant's rsID appears in the explanation text
            const fullText = `${explanation.summary} ${explanation.biological_mechanism} ${explanation.variant_interpretation} ${explanation.clinical_impact}`.toLowerCase();
            
            for (const variant of variants) {
              if (variant.rsid) {
                const rsidCited = fullText.includes(variant.rsid.toLowerCase());
                // Fallback explanations should cite variants
                expect(rsidCited).toBe(true);
              }
            }
            
            // Property 2: Citation completeness should be high for fallback
            // Fallback explanations are controlled and should have good citation
            expect(validation.citationCompleteness).toBeGreaterThanOrEqual(0.5);
            
            // Property 3: Validation should detect what's cited
            expect(validation).toHaveProperty('allRsidsCited');
            expect(validation).toHaveProperty('allStarAllelesCited');
            expect(validation).toHaveProperty('allGenesCited');
            expect(validation).toHaveProperty('citationCompleteness');
            expect(validation).toHaveProperty('missingCitations');
            
            // Property 4: Citation completeness should be between 0 and 1
            expect(validation.citationCompleteness).toBeGreaterThanOrEqual(0);
            expect(validation.citationCompleteness).toBeLessThanOrEqual(1);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Validation should correctly identify missing citations
     */
    it('should detect missing citations when variants are not mentioned', () => {
      fc.assert(
        fc.property(
          variantsArb,
          (variants: DetectedVariant[]) => {
            const llmService = new LLMService();
            
            // Create an explanation that deliberately doesn't cite variants
            const incompleteExplanation: LLMExplanation = {
              summary: 'The patient has a genetic variant.',
              biological_mechanism: 'The gene affects drug metabolism.',
              variant_interpretation: 'Genetic changes were detected.',
              clinical_impact: 'Dosing adjustments may be needed.'
            };
            
            // Validate the incomplete explanation
            const validation = llmService.validateExplanation(incompleteExplanation, variants);
            
            // Property: Should detect that citations are missing
            expect(validation.citationCompleteness).toBeLessThan(1.0);
            expect(validation.missingCitations.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 30, seed: 42 }
      );
    });

    /**
     * Property: Validation should handle empty variant lists
     */
    it('should handle validation with no variants', () => {
      const llmService = new LLMService();
      
      const explanation: LLMExplanation = {
        summary: 'No variants detected.',
        biological_mechanism: 'Normal enzyme function.',
        variant_interpretation: 'No genetic changes found.',
        clinical_impact: 'Standard dosing appropriate.'
      };
      
      const validation = llmService.validateExplanation(explanation, []);
      
      // Property: With no variants, citation completeness should be 1.0 (100%)
      expect(validation.citationCompleteness).toBe(1.0);
      expect(validation.missingCitations.length).toBe(0);
      expect(validation.allRsidsCited).toBe(true);
      expect(validation.allStarAllelesCited).toBe(true);
      expect(validation.allGenesCited).toBe(true);
    });

    /**
     * Property: Validation should be case-insensitive
     */
    it('should detect citations regardless of case', () => {
      fc.assert(
        fc.property(
          rsidArb,
          geneArb,
          starAlleleArb,
          (rsid: string, gene: string, starAllele: string) => {
            const llmService = new LLMService();
            
            const variant: DetectedVariant = {
              rsid,
              chromosome: '1',
              position: '12345',
              gene,
              star_allele: starAllele
            };
            
            // Create explanation with uppercase citations
            const explanation: LLMExplanation = {
              summary: `The variant ${rsid.toUpperCase()} was detected.`,
              biological_mechanism: `The ${gene.toUpperCase()} gene is affected.`,
              variant_interpretation: `The ${starAllele.toUpperCase()} allele was found.`,
              clinical_impact: 'Clinical implications exist.'
            };
            
            const validation = llmService.validateExplanation(explanation, [variant]);
            
            // Property: Should detect citations regardless of case
            expect(validation.allRsidsCited).toBe(true);
            expect(validation.allGenesCited).toBe(true);
            expect(validation.allStarAllelesCited).toBe(true);
            expect(validation.citationCompleteness).toBe(1.0);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Citation completeness should be proportional to cited variants
     */
    it('should calculate citation completeness proportionally', () => {
      fc.assert(
        fc.property(
          fc.array(detectedVariantArb, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (variants: DetectedVariant[], percentToCite: number) => {
            const llmService = new LLMService();
            
            // Cite only a percentage of variants
            const numToCite = Math.floor(variants.length * (percentToCite / 100));
            const variantsToCite = variants.slice(0, numToCite);
            
            // Build explanation citing only some variants
            const citedText = variantsToCite.map(v => 
              `${v.rsid} ${v.star_allele} ${v.gene}`
            ).join(' ');
            
            const explanation: LLMExplanation = {
              summary: citedText,
              biological_mechanism: 'Enzyme function is affected.',
              variant_interpretation: 'Variants were analyzed.',
              clinical_impact: 'Recommendations provided.'
            };
            
            const validation = llmService.validateExplanation(explanation, variants);
            
            // Property: Citation completeness should reflect the proportion cited
            // Allow some tolerance for partial matches
            if (numToCite === 0) {
              expect(validation.citationCompleteness).toBeLessThan(0.5);
            } else if (numToCite === variants.length) {
              expect(validation.citationCompleteness).toBeGreaterThan(0.5);
            }
            
            // Property: Missing citations should be tracked
            expect(validation.missingCitations).toBeDefined();
            expect(Array.isArray(validation.missingCitations)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Validation should handle variants with missing fields
     */
    it('should handle variants with optional fields missing', () => {
      fc.assert(
        fc.property(
          geneArb,
          (gene: string) => {
            const llmService = new LLMService();
            
            // Variant with only gene (no rsID or STAR allele)
            const variant: DetectedVariant = {
              rsid: '',
              chromosome: '1',
              position: '12345',
              gene
            };
            
            const explanation: LLMExplanation = {
              summary: `The ${gene} gene has a variant.`,
              biological_mechanism: 'Function is altered.',
              variant_interpretation: 'Changes detected.',
              clinical_impact: 'Monitoring needed.'
            };
            
            const validation = llmService.validateExplanation(explanation, [variant]);
            
            // Property: Should handle missing optional fields gracefully
            expect(validation.citationCompleteness).toBeGreaterThanOrEqual(0);
            expect(validation.citationCompleteness).toBeLessThanOrEqual(1);
            
            // Gene should be cited
            expect(validation.allGenesCited).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 30, seed: 42 }
      );
    });
  });

  describe('Property 13: Biological Mechanism Description', () => {
    /**
     * **Property 13: Biological Mechanism Description**
     * 
     * **Validates: Requirement 8.1**
     * 
     * Property: For any cited variant in an explanation, the LLM_Explainer
     * should describe the biological mechanism by which that variant affects
     * drug metabolism or transport.
     * 
     * This property ensures that:
     * 1. Explanations include a biological_mechanism section
     * 2. The mechanism describes how the gene affects the drug
     * 3. The mechanism explains how variants alter the pathway
     * 4. The mechanism is non-empty and substantive
     */
    it('should include biological mechanism in all explanations', () => {
      fc.assert(
        fc.property(
          drugArb,
          geneArb,
          phenotypeArb,
          variantsArb,
          (drug: string, gene: string, phenotype: Phenotype, variants: DetectedVariant[]) => {
            const llmService = new LLMService();
            
            // Generate fallback explanation
            const explanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              phenotype,
              variants
            );
            
            // Property 1: biological_mechanism field must exist
            expect(explanation).toHaveProperty('biological_mechanism');
            expect(typeof explanation.biological_mechanism).toBe('string');
            
            // Property 2: biological_mechanism must be non-empty
            expect(explanation.biological_mechanism.length).toBeGreaterThan(0);
            
            // Property 3: biological_mechanism should mention the gene
            expect(explanation.biological_mechanism.toLowerCase()).toContain(gene.toLowerCase());
            
            // Property 4: biological_mechanism should mention the drug
            expect(explanation.biological_mechanism.toLowerCase()).toContain(drug.toLowerCase());
            
            // Property 5: biological_mechanism should be substantive (>50 chars)
            expect(explanation.biological_mechanism.length).toBeGreaterThan(50);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Biological mechanism should describe enzyme/metabolic function
     */
    it('should describe metabolic or enzymatic function', () => {
      fc.assert(
        fc.property(
          drugArb,
          geneArb,
          phenotypeArb,
          variantsArb,
          (drug: string, gene: string, phenotype: Phenotype, variants: DetectedVariant[]) => {
            const llmService = new LLMService();
            
            const explanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              phenotype,
              variants
            );
            
            const mechanism = explanation.biological_mechanism.toLowerCase();
            
            // Property: Should contain metabolic/enzymatic terminology
            const hasMetabolicTerms = 
              mechanism.includes('enzyme') ||
              mechanism.includes('metabol') ||
              mechanism.includes('activity') ||
              mechanism.includes('function') ||
              mechanism.includes('pathway');
            
            expect(hasMetabolicTerms).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });

    /**
     * Property: Mechanism should differ based on phenotype
     */
    it('should describe different mechanisms for different phenotypes', () => {
      fc.assert(
        fc.property(
          drugArb,
          geneArb,
          variantsArb,
          (drug: string, gene: string, variants: DetectedVariant[]) => {
            const llmService = new LLMService();
            
            // Generate explanations for different phenotypes
            const nmExplanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              'NM' as Phenotype,
              variants
            );
            
            const pmExplanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              'PM' as Phenotype,
              variants
            );
            
            // Property: Mechanisms should differ for different phenotypes
            expect(nmExplanation.biological_mechanism).not.toBe(pmExplanation.biological_mechanism);
            
            // NM should mention normal activity
            const nmMechanism = nmExplanation.biological_mechanism.toLowerCase();
            expect(
              nmMechanism.includes('normal') || 
              nmMechanism.includes('typical')
            ).toBe(true);
            
            // PM should mention reduced/absent activity
            const pmMechanism = pmExplanation.biological_mechanism.toLowerCase();
            expect(
              pmMechanism.includes('reduce') || 
              pmMechanism.includes('eliminate') ||
              pmMechanism.includes('alter')
            ).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 30, seed: 42 }
      );
    });

    /**
     * Property: Mechanism should reference variants when present
     */
    it('should reference variants in mechanism when variants are detected', () => {
      fc.assert(
        fc.property(
          drugArb,
          geneArb,
          phenotypeArb,
          fc.array(detectedVariantArb, { minLength: 1, maxLength: 3 }),
          (drug: string, gene: string, phenotype: Phenotype, variants: DetectedVariant[]) => {
            const llmService = new LLMService();
            
            const explanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              phenotype,
              variants
            );
            
            const mechanism = explanation.biological_mechanism.toLowerCase();
            
            // Property: Should mention variants or genetic changes
            const mentionsVariants = 
              mechanism.includes('variant') ||
              mechanism.includes('genetic') ||
              mechanism.includes('allele') ||
              mechanism.includes('mutation');
            
            expect(mentionsVariants).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 30, seed: 42 }
      );
    });

    /**
     * Property: All explanation sections should be present
     */
    it('should include all four required sections', () => {
      fc.assert(
        fc.property(
          drugArb,
          geneArb,
          phenotypeArb,
          variantsArb,
          (drug: string, gene: string, phenotype: Phenotype, variants: DetectedVariant[]) => {
            const llmService = new LLMService();
            
            const explanation = (llmService as any).getEnhancedFallbackExplanation(
              drug,
              gene,
              phenotype,
              variants
            );
            
            // Property: All four sections must exist
            expect(explanation).toHaveProperty('summary');
            expect(explanation).toHaveProperty('biological_mechanism');
            expect(explanation).toHaveProperty('variant_interpretation');
            expect(explanation).toHaveProperty('clinical_impact');
            
            // Property: All sections must be non-empty strings
            expect(typeof explanation.summary).toBe('string');
            expect(typeof explanation.biological_mechanism).toBe('string');
            expect(typeof explanation.variant_interpretation).toBe('string');
            expect(typeof explanation.clinical_impact).toBe('string');
            
            expect(explanation.summary.length).toBeGreaterThan(0);
            expect(explanation.biological_mechanism.length).toBeGreaterThan(0);
            expect(explanation.variant_interpretation.length).toBeGreaterThan(0);
            expect(explanation.clinical_impact.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50, seed: 42 }
      );
    });
  });
});
