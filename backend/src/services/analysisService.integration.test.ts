/**
 * Integration tests for complete analysis pipeline
 * Tests end-to-end flow with test VCF files
 */

import { AnalysisService } from './analysisService';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('AnalysisService Integration Tests', () => {
  let analysisService: AnalysisService;

  beforeEach(() => {
    analysisService = new AnalysisService();
  });

  describe('End-to-End Analysis with Test VCF Files', () => {
    test('should analyze CYP2D6 variants correctly', async () => {
      // Read test VCF file
      const vcfPath = join(__dirname, '../../test-data/test-cyp2d6-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-cyp2d6-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_001'
      };

      const results = await analysisService.analyzeVCF(request);

      // Verify results
      expect(results).toHaveLength(1);
      const result = results[0];

      // Verify basic structure
      expect(result.patient_id).toBe('TEST_PATIENT_001');
      expect(result.drug).toBe('CODEINE');
      expect(result.pharmacogenomic_profile.primary_gene).toBe('CYP2D6');

      // Verify quality metrics
      expect(result.quality_metrics.vcf_parsing_success).toBe(true);
      expect(result.quality_metrics.total_vcf_variants).toBe(3);
      expect(result.quality_metrics.pgx_variants_identified).toBe(3);
      expect(result.quality_metrics.pgx_variants_matched).toBe(3);
      expect(result.quality_metrics.detection_state).toBe('pgx_variants_found_all_matched');
      expect(result.quality_metrics.annotation_completeness).toBe(1.0);

      // Verify confidence score is not default 50%
      expect(result.risk_assessment.confidence_score).not.toBe(0.5);
      expect(result.risk_assessment.confidence_score).toBeGreaterThan(0.7);

      // Verify variants are detected
      expect(result.pharmacogenomic_profile.detected_variants.length).toBeGreaterThan(0);
    });

    test('should analyze all genes VCF correctly', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-all-genes.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-all-genes.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE', 'CLOPIDOGREL', 'WARFARIN', 'SIMVASTATIN', 'AZATHIOPRINE', 'FLUOROURACIL'],
        patientId: 'TEST_PATIENT_002'
      };

      const results = await analysisService.analyzeVCF(request);

      // Verify all drugs analyzed
      expect(results).toHaveLength(6);

      // Verify each result has proper structure
      results.forEach(result => {
        expect(result.quality_metrics.vcf_parsing_success).toBe(true);
        expect(result.quality_metrics.total_vcf_variants).toBe(6);
        expect(result.quality_metrics.pgx_variants_identified).toBe(6);
        expect(result.quality_metrics.detection_state).toBe('pgx_variants_found_all_matched');
        expect(result.risk_assessment.confidence_score).toBeGreaterThan(0.7);
      });
    });

    test('should handle no variants VCF correctly', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-no-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-no-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_003'
      };

      const results = await analysisService.analyzeVCF(request);

      expect(results).toHaveLength(1);
      const result = results[0];

      // Verify detection state
      expect(result.quality_metrics.detection_state).toBe('no_variants_in_vcf');
      expect(result.quality_metrics.total_vcf_variants).toBe(0);
      expect(result.quality_metrics.pgx_variants_identified).toBe(0);
      expect(result.quality_metrics.annotation_completeness).toBe('N/A');
    });

    test('should handle no PGx variants VCF correctly', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-no-pgx-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-no-pgx-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_004'
      };

      const results = await analysisService.analyzeVCF(request);

      expect(results).toHaveLength(1);
      const result = results[0];

      // Verify detection state
      expect(result.quality_metrics.detection_state).toBe('no_pgx_variants_detected');
      expect(result.quality_metrics.total_vcf_variants).toBe(3);
      expect(result.quality_metrics.pgx_variants_identified).toBe(0);
      expect(result.quality_metrics.annotation_completeness).toBe('N/A');
    });

    test('should analyze Evidence Level A variants with high confidence', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-evidence-level-a.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-evidence-level-a.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_005'
      };

      const results = await analysisService.analyzeVCF(request);

      expect(results).toHaveLength(1);
      const result = results[0];

      // Verify high confidence for Evidence Level A
      expect(result.risk_assessment.confidence_score).toBeGreaterThan(0.80);
      expect(result.quality_metrics.annotation_completeness).toBe(1.0);
      
      // Verify evidence distribution
      expect(result.quality_metrics.evidence_distribution.A).toBeGreaterThan(0);
    });
  });

  describe('Component Execution Order', () => {
    test('should execute all components in correct order', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-cyp2d6-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-cyp2d6-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_006'
      };

      const results = await analysisService.analyzeVCF(request);
      const result = results[0];

      // Verify VCF Parser executed
      expect(result.quality_metrics.vcf_parsing_success).toBe(true);

      // Verify Variant Detector executed
      expect(result.quality_metrics.detection_state).toBeDefined();
      expect(result.quality_metrics.pgx_variants_matched).toBeDefined();

      // Verify Genotype Analyzer executed
      expect(result.pharmacogenomic_profile.diplotype).toBeDefined();
      expect(result.pharmacogenomic_profile.phenotype).toBeDefined();

      // Verify Confidence Calculator executed (not default 50%)
      expect(result.risk_assessment.confidence_score).not.toBe(0.5);

      // Verify LLM Explainer executed
      expect(result.llm_generated_explanation).toBeDefined();
      expect(result.llm_generated_explanation.summary).toBeDefined();

      // Verify Quality Metrics Engine executed
      expect(result.quality_metrics.average_variant_quality).toBeDefined();
      expect(result.quality_metrics.evidence_distribution).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    test('should handle malformed VCF gracefully', async () => {
      const malformedVCF = Buffer.from('This is not a valid VCF file');

      const request = {
        vcfFile: {
          buffer: malformedVCF,
          originalname: 'malformed.vcf',
          mimetype: 'text/plain',
          size: malformedVCF.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_007'
      };

      await expect(analysisService.analyzeVCF(request)).rejects.toThrow();
    });

    test('should continue with other drugs if one fails', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-cyp2d6-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-cyp2d6-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE', 'INVALID_DRUG', 'CLOPIDOGREL'],
        patientId: 'TEST_PATIENT_008'
      };

      const results = await analysisService.analyzeVCF(request);

      // Should have results for valid drugs even if one fails
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Metrics Accuracy', () => {
    test('should calculate accurate variant counts', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-cyp2c19-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-cyp2c19-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CLOPIDOGREL'],
        patientId: 'TEST_PATIENT_009'
      };

      const results = await analysisService.analyzeVCF(request);
      const result = results[0];

      // Verify variant count invariant: matched + unmatched = total PGx
      const totalPgx = result.quality_metrics.pgx_variants_identified;
      const matched = result.quality_metrics.pgx_variants_matched;
      const unmatched = result.quality_metrics.pgx_variants_unmatched;

      expect(matched + unmatched).toBe(totalPgx);

      // Verify PGx subset invariant: PGx <= total variants
      expect(totalPgx).toBeLessThanOrEqual(result.quality_metrics.total_vcf_variants);
    });

    test('should calculate annotation completeness correctly', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-all-genes.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-all-genes.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_010'
      };

      const results = await analysisService.analyzeVCF(request);
      const result = results[0];

      // Verify annotation completeness formula
      if (result.quality_metrics.pgx_variants_identified > 0) {
        const expected = result.quality_metrics.pgx_variants_matched / 
                        result.quality_metrics.pgx_variants_identified;
        expect(result.quality_metrics.annotation_completeness).toBeCloseTo(expected, 2);
      }
    });
  });

  describe('Confidence Score Validation', () => {
    test('should produce non-default confidence scores', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-cyp2d6-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-cyp2d6-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_011'
      };

      const results = await analysisService.analyzeVCF(request);
      const result = results[0];

      // Verify not hardcoded 50%
      expect(result.risk_assessment.confidence_score).not.toBe(0.5);

      // Verify within bounds [0, 1]
      expect(result.risk_assessment.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.risk_assessment.confidence_score).toBeLessThanOrEqual(1);
    });

    test('should produce higher confidence for Evidence Level A', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-evidence-level-a.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-evidence-level-a.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_012'
      };

      const results = await analysisService.analyzeVCF(request);
      const result = results[0];

      // High quality analysis should have >80% confidence
      expect(result.risk_assessment.confidence_score).toBeGreaterThan(0.80);
    });
  });

  describe('LLM Explanation Validation', () => {
    test('should include variant citations in explanation', async () => {
      const vcfPath = join(__dirname, '../../test-data/test-cyp2d6-variants.vcf');
      const vcfContent = readFileSync(vcfPath);

      const request = {
        vcfFile: {
          buffer: vcfContent,
          originalname: 'test-cyp2d6-variants.vcf',
          mimetype: 'text/plain',
          size: vcfContent.length
        } as Express.Multer.File,
        drugs: ['CODEINE'],
        patientId: 'TEST_PATIENT_013'
      };

      const results = await analysisService.analyzeVCF(request);
      const result = results[0];

      const explanation = result.llm_generated_explanation;
      const fullText = `${explanation.summary} ${explanation.biological_mechanism} ${explanation.variant_interpretation} ${explanation.clinical_impact}`;

      // Verify explanation includes variant information
      expect(fullText.length).toBeGreaterThan(0);
      
      // Should mention the gene
      expect(fullText.toLowerCase()).toContain('cyp2d6');
    });
  });
});
