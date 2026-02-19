/**
 * Pipeline Validation Script
 * 
 * Runs all test VCF files through the complete analysis pipeline and validates:
 * - Results match documented expected outcomes
 * - Quality metrics are accurate
 * - Confidence scores are non-default
 * - Explanations include variant citations
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();
import { VCFParser } from '../parsers/vcfParser';
import { VariantDetector } from '../services/variantDetector';
import { ConfidenceCalculator } from '../services/confidenceCalculator';
import { LLMService } from '../services/llmService';
import { ContradictionDetector } from '../services/contradictionDetector';
import { QualityMetricsEngine } from '../services/qualityMetricsEngine';
import { pharmacogenomicVariants } from '../data/pharmacogenomicVariants';
import { drugGeneRules } from '../data/drugGeneRules';

interface ExpectedOutcome {
  description: string;
  vcf_file: string;
  expected_outcomes: {
    total_vcf_variants: number;
    pgx_variants_identified: number;
    pgx_variants_matched: number;
    pgx_variants_unmatched: number;
    detection_state: string;
    annotation_completeness: number | 'N/A';
    average_variant_quality: number;
    confidence_score_range: { min: number; max: number };
    evidence_distribution?: {
      A: number;
      B: number;
      C: number;
      D: number;
      unknown: number;
    };
    variants_by_gene?: Record<string, number>;
    variants_by_drug?: Record<string, number>;
    expected_variants?: Array<{
      rsid: string;
      gene: string;
      star_allele: string;
      functional_status: string;
      evidence_level: string;
    }>;
  };
}

interface ValidationResult {
  testFile: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    variantCount: number;
    pgxVariantCount: number;
    matchedCount: number;
    detectionState: string;
    annotationCompleteness: number | 'N/A';
    confidence: number;
    explanationHasCitations: boolean;
    noContradictions: boolean;
  };
}

class PipelineValidator {
  private testDataDir: string;
  private llmService: LLMService;
  private contradictionDetector: ContradictionDetector;
  private results: ValidationResult[] = [];

  constructor() {
    this.testDataDir = path.join(__dirname, '../../test-data');
    this.llmService = new LLMService();
    this.contradictionDetector = new ContradictionDetector();
  }

  async validateAll(): Promise<void> {
    console.log('='.repeat(80));
    console.log('PharmaGenAI Pipeline Validation');
    console.log('='.repeat(80));
    console.log();

    // Get all test VCF files
    const testFiles = this.getTestFiles();
    console.log(`Found ${testFiles.length} test VCF files\n`);

    // Run validation for each file
    for (const testFile of testFiles) {
      await this.validateTestFile(testFile);
    }

    // Print summary
    this.printSummary();
  }

  private getTestFiles(): string[] {
    const files = fs.readdirSync(this.testDataDir);
    return files
      .filter(f => f.endsWith('.vcf'))
      .sort();
  }

  private async validateTestFile(fileName: string): Promise<void> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${fileName}`);
    console.log('='.repeat(80));

    const result: ValidationResult = {
      testFile: fileName,
      passed: true,
      errors: [],
      warnings: [],
      metrics: {
        variantCount: 0,
        pgxVariantCount: 0,
        matchedCount: 0,
        detectionState: '',
        annotationCompleteness: 0,
        confidence: 0,
        explanationHasCitations: false,
        noContradictions: false,
      },
    };

    try {
      // Load expected outcomes
      const expected = this.loadExpectedOutcome(fileName);
      const exp = expected.expected_outcomes;
      console.log(`\nExpected outcomes loaded:`);
      console.log(`  - Variant count: ${exp.total_vcf_variants}`);
      console.log(`  - PGx variant count: ${exp.pgx_variants_identified}`);
      console.log(`  - Matched count: ${exp.pgx_variants_matched}`);
      console.log(`  - Detection state: ${exp.detection_state}`);
      console.log(`  - Annotation completeness: ${exp.annotation_completeness}`);
      console.log(`  - Confidence range: ${exp.confidence_score_range.min}-${exp.confidence_score_range.max}`);

      // Load and parse VCF file
      const vcfPath = path.join(this.testDataDir, fileName);
      const vcfContent = fs.readFileSync(vcfPath, 'utf-8');
      
      console.log(`\n[1/7] Parsing VCF file...`);
      const allVariants = VCFParser.parseVCF(vcfContent);
      result.metrics.variantCount = allVariants.length;
      console.log(`  ✓ Parsed ${allVariants.length} variants`);

      // Validate variant count
      if (allVariants.length !== exp.total_vcf_variants) {
        result.errors.push(
          `Variant count mismatch: expected ${exp.total_vcf_variants}, got ${allVariants.length}`
        );
        result.passed = false;
      }

      // Filter pharmacogenomic variants
      console.log(`\n[2/7] Filtering pharmacogenomic variants...`);
      const pgxVariants = VCFParser.filterPharmacogenomicVariants(allVariants);
      result.metrics.pgxVariantCount = pgxVariants.length;
      console.log(`  ✓ Found ${pgxVariants.length} PGx variants`);

      // Validate PGx variant count
      if (pgxVariants.length !== exp.pgx_variants_identified) {
        result.errors.push(
          `PGx variant count mismatch: expected ${exp.pgx_variants_identified}, got ${pgxVariants.length}`
        );
        result.passed = false;
      }

      // Detect and match variants
      console.log(`\n[3/7] Detecting and matching variants...`);
      const detectionResult = VariantDetector.detectPharmacogenomicVariants(
        pgxVariants,
        pharmacogenomicVariants
      );
      result.metrics.matchedCount = detectionResult.matchedCount;
      result.metrics.detectionState = detectionResult.state;
      console.log(`  ✓ Matched ${detectionResult.matchedCount} variants`);
      console.log(`  ✓ Detection state: ${detectionResult.state}`);

      // Validate matched count
      if (detectionResult.matchedCount !== exp.pgx_variants_matched) {
        result.errors.push(
          `Matched count mismatch: expected ${exp.pgx_variants_matched}, got ${detectionResult.matchedCount}`
        );
        result.passed = false;
      }

      // Validate detection state
      if (detectionResult.state !== exp.detection_state) {
        result.errors.push(
          `Detection state mismatch: expected ${exp.detection_state}, got ${detectionResult.state}`
        );
        result.passed = false;
      }

      // Calculate quality metrics
      console.log(`\n[4/7] Calculating quality metrics...`);
      const metrics = QualityMetricsEngine.calculateMetrics(
        allVariants,
        pgxVariants,
        detectionResult.matched,
        detectionResult.unmatched,
        detectionResult.state
      );
      result.metrics.annotationCompleteness = metrics.annotation_completeness;
      console.log(`  ✓ Annotation completeness: ${metrics.annotation_completeness}`);
      console.log(`  ✓ Average variant quality: ${metrics.average_variant_quality.toFixed(2)}`);

      // Validate annotation completeness
      if (metrics.annotation_completeness !== exp.annotation_completeness) {
        result.errors.push(
          `Annotation completeness mismatch: expected ${exp.annotation_completeness}, got ${metrics.annotation_completeness}`
        );
        result.passed = false;
      }

      // Calculate confidence score
      console.log(`\n[5/7] Calculating confidence score...`);
      const evidenceLevels = detectionResult.matched
        .map(v => v.evidenceLevel)
        .filter((e): e is 'A' | 'B' | 'C' | 'D' => e !== undefined);
      
      const confidence = ConfidenceCalculator.calculateConfidence({
        variantCallQualities: pgxVariants.map(v => v.quality),
        annotationCompleteness: typeof metrics.annotation_completeness === 'number' 
          ? metrics.annotation_completeness 
          : 0,
        evidenceLevels,
        variantCount: detectionResult.matchedCount,
      });
      result.metrics.confidence = confidence;
      console.log(`  ✓ Confidence: ${(confidence * 100).toFixed(1)}%`);

      // Validate confidence is not default 50%
      if (Math.abs(confidence - 0.5) < 0.001) {
        result.warnings.push('Confidence score is exactly 50% - may be default value');
      }

      // Validate confidence is in expected range
      if (confidence < exp.confidence_score_range.min || 
          confidence > exp.confidence_score_range.max) {
        result.errors.push(
          `Confidence out of range: expected ${exp.confidence_score_range.min}-${exp.confidence_score_range.max}, got ${confidence.toFixed(3)}`
        );
        result.passed = false;
      }

      // Generate explanation (only if we have matched variants)
      if (detectionResult.matchedCount > 0) {
        console.log(`\n[6/7] Generating LLM explanation...`);
        
        // Get first matched variant's gene for testing
        const firstVariant = detectionResult.matched[0];
        const gene = firstVariant.gene || 'CYP2D6';
        
        // Find a drug that uses this gene
        const drugRule = drugGeneRules.find(r => r.gene === gene);
        const drug = drugRule?.drug || 'codeine';
        
        // Use simplified genotype data for validation
        const diplotype = '*1/*2'; // Simplified for validation
        const phenotype: any = 'IM'; // Intermediate Metabolizer
        const recommendation = 'Monitor patient response and adjust dosage as needed';
        
        // Generate explanation
        const explanation = await this.llmService.generateExplanation(
          drug,
          gene,
          diplotype,
          phenotype,
          detectionResult.matched,
          recommendation
        );
        
        console.log(`  ✓ Generated explanation`);

        // Validate explanation has variant citations
        const hasAllCitations = detectionResult.matched.every(v => {
          const text = JSON.stringify(explanation).toLowerCase();
          return text.includes(v.rsid.toLowerCase());
        });
        result.metrics.explanationHasCitations = hasAllCitations;
        console.log(`  ✓ All variants cited: ${hasAllCitations}`);

        if (!hasAllCitations) {
          result.errors.push('Explanation missing variant citations');
          result.passed = false;
        }

        // Check for contradictions
        console.log(`\n[7/7] Checking for contradictions...`);
        const explanationText = JSON.stringify(explanation);
        const contradictionResult = this.contradictionDetector.detectContradictions(
          explanationText,
          detectionResult.matched
        );
        const contradictions = contradictionResult.contradictions;
        result.metrics.noContradictions = contradictions.length === 0;
        console.log(`  ✓ Contradictions found: ${contradictions.length}`);

        if (contradictions.length > 0) {
          result.warnings.push(`Found ${contradictions.length} contradiction(s) in explanation`);
          contradictions.forEach(c => {
            console.log(`    - ${c.type}: ${c.description}`);
          });
        }
      } else {
        console.log(`\n[6/7] Skipping explanation generation (no matched variants)`);
        console.log(`[7/7] Skipping contradiction detection (no matched variants)`);
        result.metrics.explanationHasCitations = true; // N/A case
        result.metrics.noContradictions = true; // N/A case
      }

      // Print result
      console.log(`\n${'─'.repeat(80)}`);
      if (result.passed) {
        console.log(`✅ PASSED: ${fileName}`);
      } else {
        console.log(`❌ FAILED: ${fileName}`);
        result.errors.forEach(e => console.log(`   ERROR: ${e}`));
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.log(`   WARNING: ${w}`));
      }

    } catch (error) {
      result.passed = false;
      result.errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`\n❌ FAILED: ${fileName}`);
      console.log(`   ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.results.push(result);
  }

  private loadExpectedOutcome(vcfFileName: string): ExpectedOutcome {
    const jsonFileName = vcfFileName.replace('.vcf', '.expected.json');
    const jsonPath = path.join(this.testDataDir, jsonFileName);
    const content = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(content);
  }

  private printSummary(): void {
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`\nTotal tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log(`\nFailed tests:`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`\n  ${r.testFile}:`);
          r.errors.forEach(e => console.log(`    - ${e}`));
        });
    }

    // Print metrics summary
    console.log(`\n${'─'.repeat(80)}`);
    console.log('Metrics Summary:');
    console.log('─'.repeat(80));
    console.log(`${'Test File'.padEnd(35)} ${'Variants'.padEnd(10)} ${'PGx'.padEnd(8)} ${'Matched'.padEnd(10)} ${'Conf%'.padEnd(8)} ${'Status'}`);
    console.log('─'.repeat(80));
    
    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      const conf = (r.metrics.confidence * 100).toFixed(1);
      console.log(
        `${r.testFile.padEnd(35)} ${String(r.metrics.variantCount).padEnd(10)} ${String(r.metrics.pgxVariantCount).padEnd(8)} ${String(r.metrics.matchedCount).padEnd(10)} ${conf.padEnd(8)} ${status}`
      );
    });

    console.log('='.repeat(80));
    console.log();

    // Exit with appropriate code
    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run validation
async function main() {
  const validator = new PipelineValidator();
  await validator.validateAll();
}

main().catch(error => {
  console.error('Validation failed with error:', error);
  process.exit(1);
});
