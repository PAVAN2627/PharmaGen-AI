import { describe, it, expect, beforeAll } from '@jest/globals';
import { LLMService } from './llmService';
import { DetectedVariant, LLMExplanation } from '../types';

/**
 * Unit Tests for LLM Service Enhancements
 * 
 * Feature: pharmagenai-quality-improvements
 * Task 5.6: Write unit tests for LLM service enhancements
 * 
 * **Validates: Requirements 7.5, 9.1**
 */

// Set up test environment
beforeAll(() => {
  if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = 'test-api-key-for-unit-tests';
  }
  if (!process.env.GEMINI_MODEL) {
    process.env.GEMINI_MODEL = 'gemini-1.5-flash';
  }
});

describe('LLMService - Unit Tests', () => {
  describe('Enhanced Fallback Explanation', () => {
    it('should include all variant citations in fallback explanation', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs3892097',
          chromosome: '22',
          position: '42130692',
          gene: 'CYP2D6',
          star_allele: '*4',
          evidenceLevel: 'A',
          functionalStatus: 'no_function'
        },
        {
          rsid: 'rs1065852',
          chromosome: '22',
          position: '42126611',
          gene: 'CYP2D6',
          star_allele: '*10',
          evidenceLevel: 'A',
          functionalStatus: 'decreased'
        }
      ];
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'CODEINE',
        'CYP2D6',
        'PM',
        variants
      );
      
      // Should cite both rsIDs
      expect(explanation.summary).toContain('rs3892097');
      expect(explanation.summary).toContain('rs1065852');
      
      // Should cite both STAR alleles
      const fullText = `${explanation.summary} ${explanation.variant_interpretation}`;
      expect(fullText).toContain('*4');
      expect(fullText).toContain('*10');
      
      // Should mention the gene
      expect(fullText).toContain('CYP2D6');
    });

    it('should handle no variants detected case', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'WARFARIN',
        'CYP2C9',
        'NM',
        []
      );
      
      // Should indicate no variants
      expect(
        explanation.variant_interpretation.toLowerCase().includes('no') ||
        explanation.variant_interpretation.toLowerCase().includes('wild-type')
      ).toBe(true);
      
      // Should still have all sections
      expect(explanation.summary).toBeTruthy();
      expect(explanation.biological_mechanism).toBeTruthy();
      expect(explanation.variant_interpretation).toBeTruthy();
      expect(explanation.clinical_impact).toBeTruthy();
    });

    it('should include evidence levels when available', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs4244285',
          chromosome: '10',
          position: '94781859',
          gene: 'CYP2C19',
          star_allele: '*2',
          evidenceLevel: 'A',
          functionalStatus: 'no_function'
        }
      ];
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'CLOPIDOGREL',
        'CYP2C19',
        'PM',
        variants
      );
      
      // Should mention evidence level
      const fullText = `${explanation.summary} ${explanation.biological_mechanism} ${explanation.variant_interpretation} ${explanation.clinical_impact}`;
      expect(fullText.toLowerCase()).toContain('evidence');
      expect(fullText).toContain('A');
    });

    it('should describe functional status when available', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs1799853',
          chromosome: '10',
          position: '94942290',
          gene: 'CYP2C9',
          star_allele: '*2',
          evidenceLevel: 'A',
          functionalStatus: 'decreased'
        }
      ];
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'WARFARIN',
        'CYP2C9',
        'IM',
        variants
      );
      
      // Should mention functional status
      expect(explanation.biological_mechanism.toLowerCase()).toContain('decreased');
    });

    it('should generate appropriate explanation for NM phenotype', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'SIMVASTATIN',
        'SLCO1B1',
        'NM',
        []
      );
      
      // Should indicate normal function
      expect(explanation.summary.toLowerCase()).toContain('normal');
      expect(explanation.summary.toLowerCase()).toContain('standard');
      
      // Should not suggest dosage adjustments
      expect(explanation.clinical_impact.toLowerCase()).toContain('standard');
    });

    it('should generate appropriate explanation for PM phenotype', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs3918290',
          chromosome: '1',
          position: '97450058',
          gene: 'DPYD',
          star_allele: '*2A',
          evidenceLevel: 'A',
          functionalStatus: 'no_function'
        }
      ];
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'FLUOROURACIL',
        'DPYD',
        'PM',
        variants
      );
      
      // Should indicate reduced/absent function
      const fullText = explanation.summary.toLowerCase();
      expect(
        fullText.includes('poor') ||
        fullText.includes('reduced') ||
        fullText.includes('absent')
      ).toBe(true);
      
      // Should suggest dosage adjustments or alternatives
      expect(
        explanation.clinical_impact.toLowerCase().includes('dose') ||
        explanation.clinical_impact.toLowerCase().includes('alternative') ||
        explanation.clinical_impact.toLowerCase().includes('reduction')
      ).toBe(true);
    });
  });

  describe('Explanation Validation', () => {
    it('should detect all citations when variants are properly cited', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs4149056',
          chromosome: '12',
          position: '21178615',
          gene: 'SLCO1B1',
          star_allele: '*5'
        }
      ];
      
      const explanation: LLMExplanation = {
        summary: 'The patient has rs4149056 variant.',
        biological_mechanism: 'The SLCO1B1 gene affects drug transport.',
        variant_interpretation: 'The *5 allele reduces function.',
        clinical_impact: 'Dosing adjustments recommended.'
      };
      
      const validation = llmService.validateExplanation(explanation, variants);
      
      expect(validation.allRsidsCited).toBe(true);
      expect(validation.allStarAllelesCited).toBe(true);
      expect(validation.allGenesCited).toBe(true);
      expect(validation.citationCompleteness).toBe(1.0);
      expect(validation.missingCitations.length).toBe(0);
    });

    it('should detect missing rsID citations', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs1800462',
          chromosome: '6',
          position: '18139228',
          gene: 'TPMT',
          star_allele: '*2'
        }
      ];
      
      const explanation: LLMExplanation = {
        summary: 'The patient has a TPMT variant.',
        biological_mechanism: 'The gene affects drug metabolism.',
        variant_interpretation: 'The *2 allele was detected.',
        clinical_impact: 'Monitoring needed.'
      };
      
      const validation = llmService.validateExplanation(explanation, variants);
      
      expect(validation.allRsidsCited).toBe(false);
      expect(validation.missingCitations).toContain('rs1800462');
      expect(validation.citationCompleteness).toBeLessThan(1.0);
    });

    it('should detect missing STAR allele citations', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs12248560',
          chromosome: '10',
          position: '94852738',
          gene: 'CYP2C19',
          star_allele: '*17'
        }
      ];
      
      const explanation: LLMExplanation = {
        summary: 'The patient has rs12248560 variant.',
        biological_mechanism: 'The CYP2C19 gene affects metabolism.',
        variant_interpretation: 'A genetic variant was found.',
        clinical_impact: 'Dosing may need adjustment.'
      };
      
      const validation = llmService.validateExplanation(explanation, variants);
      
      expect(validation.allStarAllelesCited).toBe(false);
      expect(validation.missingCitations).toContain('*17');
    });

    it('should detect missing gene citations', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs1057910',
          chromosome: '10',
          position: '94947869',
          gene: 'CYP2C9',
          star_allele: '*3'
        }
      ];
      
      const explanation: LLMExplanation = {
        summary: 'The patient has rs1057910 variant.',
        biological_mechanism: 'A gene affects drug metabolism.',
        variant_interpretation: 'The *3 allele reduces function.',
        clinical_impact: 'Dosing adjustments needed.'
      };
      
      const validation = llmService.validateExplanation(explanation, variants);
      
      expect(validation.allGenesCited).toBe(false);
      expect(validation.missingCitations).toContain('CYP2C9');
    });

    it('should handle validation with multiple variants', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs3892097',
          chromosome: '22',
          position: '42130692',
          gene: 'CYP2D6',
          star_allele: '*4'
        },
        {
          rsid: 'rs1065852',
          chromosome: '22',
          position: '42126611',
          gene: 'CYP2D6',
          star_allele: '*10'
        },
        {
          rsid: 'rs28371725',
          chromosome: '22',
          position: '42128945',
          gene: 'CYP2D6',
          star_allele: '*41'
        }
      ];
      
      const explanation: LLMExplanation = {
        summary: 'The patient has rs3892097, rs1065852, and rs28371725 variants in CYP2D6.',
        biological_mechanism: 'The CYP2D6 gene encodes an enzyme.',
        variant_interpretation: 'The *4, *10, and *41 alleles affect function.',
        clinical_impact: 'Dosing adjustments recommended.'
      };
      
      const validation = llmService.validateExplanation(explanation, variants);
      
      expect(validation.allRsidsCited).toBe(true);
      expect(validation.allStarAllelesCited).toBe(true);
      expect(validation.allGenesCited).toBe(true);
      expect(validation.citationCompleteness).toBe(1.0);
      expect(validation.missingCitations.length).toBe(0);
    });

    it('should calculate partial citation completeness correctly', () => {
      const llmService = new LLMService();
      
      const variants: DetectedVariant[] = [
        {
          rsid: 'rs4244285',
          chromosome: '10',
          position: '94781859',
          gene: 'CYP2C19',
          star_allele: '*2'
        },
        {
          rsid: 'rs4986893',
          chromosome: '10',
          position: '94781858',
          gene: 'CYP2C19',
          star_allele: '*3'
        }
      ];
      
      // Only cite first variant
      const explanation: LLMExplanation = {
        summary: 'The patient has rs4244285 variant in CYP2C19.',
        biological_mechanism: 'The gene affects metabolism.',
        variant_interpretation: 'The *2 allele was detected.',
        clinical_impact: 'Dosing may need adjustment.'
      };
      
      const validation = llmService.validateExplanation(explanation, variants);
      
      // Should detect partial citation
      expect(validation.citationCompleteness).toBeGreaterThan(0);
      expect(validation.citationCompleteness).toBeLessThan(1.0);
      expect(validation.missingCitations.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Explanation Structure', () => {
    it('should have all four required sections', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'CODEINE',
        'CYP2D6',
        'IM',
        []
      );
      
      expect(explanation).toHaveProperty('summary');
      expect(explanation).toHaveProperty('biological_mechanism');
      expect(explanation).toHaveProperty('variant_interpretation');
      expect(explanation).toHaveProperty('clinical_impact');
      
      expect(typeof explanation.summary).toBe('string');
      expect(typeof explanation.biological_mechanism).toBe('string');
      expect(typeof explanation.variant_interpretation).toBe('string');
      expect(typeof explanation.clinical_impact).toBe('string');
    });

    it('should have non-empty sections', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'WARFARIN',
        'CYP2C9',
        'PM',
        []
      );
      
      expect(explanation.summary.length).toBeGreaterThan(0);
      expect(explanation.biological_mechanism.length).toBeGreaterThan(0);
      expect(explanation.variant_interpretation.length).toBeGreaterThan(0);
      expect(explanation.clinical_impact.length).toBeGreaterThan(0);
    });

    it('should mention drug and gene in summary', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'CLOPIDOGREL',
        'CYP2C19',
        'RM',
        []
      );
      
      expect(explanation.summary).toContain('CYP2C19');
      expect(explanation.summary).toContain('CLOPIDOGREL');
    });

    it('should describe biological mechanism', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'SIMVASTATIN',
        'SLCO1B1',
        'PM',
        []
      );
      
      const mechanism = explanation.biological_mechanism.toLowerCase();
      expect(
        mechanism.includes('enzyme') ||
        mechanism.includes('metabol') ||
        mechanism.includes('transport') ||
        mechanism.includes('function')
      ).toBe(true);
    });

    it('should provide clinical recommendations', () => {
      const llmService = new LLMService();
      
      const explanation = (llmService as any).getEnhancedFallbackExplanation(
        'AZATHIOPRINE',
        'TPMT',
        'PM',
        []
      );
      
      const impact = explanation.clinical_impact.toLowerCase();
      expect(
        impact.includes('dos') ||
        impact.includes('alternative') ||
        impact.includes('monitor') ||
        impact.includes('adjust')
      ).toBe(true);
    });
  });
});
