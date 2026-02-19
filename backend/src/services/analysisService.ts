import { AnalysisResult, AnalysisRequest, VCFVariant, Phenotype } from '../types';
import { VCFParser } from '../parsers/vcfParser';
import { GenotypeAnalyzer } from './genotypeAnalyzer';
import { LLMService } from './llmService';
import { VariantDetector } from './variantDetector';
import { ConfidenceCalculator } from './confidenceCalculator';
import { ContradictionDetector } from './contradictionDetector';
import { QualityMetricsEngine } from './qualityMetricsEngine';
import { MetricsTracker } from './metricsTracker';
import { PharmcatService } from './pharmcatService';
import { getGenesForDrug, getRiskAssessment, getCPICReference, getAlternativeDrugs } from '../data/drugGeneRules';
import { KNOWN_PGX_VARIANTS } from '../data/pharmacogenomicVariants';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class AnalysisService {
  private llmService: LLMService;
  private metricsTracker: MetricsTracker;
  private contradictionDetector: ContradictionDetector;
  private pharmcatService: PharmcatService;

  constructor() {
    this.llmService = new LLMService();
    this.metricsTracker = new MetricsTracker();
    this.contradictionDetector = new ContradictionDetector();
    this.pharmcatService = new PharmcatService();
  }

  private async writeTempVcf(file: Express.Multer.File, patientId: string): Promise<string> {
    const uploadDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.resolve(__dirname, '../../uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const safePatientId = patientId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const tempName = `pharmcat_${safePatientId}_${uuidv4()}.vcf`;
    const tempPath = path.join(uploadDir, tempName);

    await fs.promises.writeFile(tempPath, file.buffer);
    return tempPath;
  }

  /**
   * Analyze VCF file for pharmacogenomic risks
   * Handles all failure modes gracefully
   */
  async analyzeVCF(request: AnalysisRequest): Promise<AnalysisResult[]> {
    logger.info('Starting VCF analysis');
    
    // Start tracking analysis time
    this.metricsTracker.startAnalysis();

    // Read VCF file
    const vcfContent = request.vcfFile.buffer.toString('utf-8');

    // Validate VCF with detailed error handling
    try {
      const validation = VCFParser.validateVCF(vcfContent);
      if (!validation.valid) {
        logger.error('VCF validation failed', {
          error: validation.error,
          reason: 'Invalid VCF format detected'
        });
        this.metricsTracker.trackVcfParsingAttempt(false);
        throw new Error(validation.error || 'Invalid VCF file');
      }
    } catch (error) {
      logger.error('VCF validation error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.metricsTracker.trackVcfParsingAttempt(false);
      throw error;
    }

    // Parse VCF with INFO tag extraction
    let allVariants: VCFVariant[];
    let pgxVariants: VCFVariant[];
    try {
      allVariants = VCFParser.parseVCF(vcfContent);
      pgxVariants = VCFParser.filterPharmacogenomicVariants(allVariants);
      
      // Track successful VCF parsing
      this.metricsTracker.trackVcfParsingAttempt(true);
      
      logger.info(`Found ${pgxVariants.length} pharmacogenomic variants out of ${allVariants.length} total variants`);
    } catch (error) {
      logger.error('VCF parsing failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.metricsTracker.trackVcfParsingAttempt(false);
      throw new Error(`Failed to parse VCF file: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Detect and match pharmacogenomic variants
    let detectionResult;
    try {
      detectionResult = VariantDetector.detectPharmacogenomicVariants(pgxVariants, KNOWN_PGX_VARIANTS);
      
      // Track variant matching metrics
      this.metricsTracker.trackVariantMatching(
        detectionResult.matchedCount,
        detectionResult.pgxVariantsFound - detectionResult.matchedCount
      );
      
      logger.info(`Detection state: ${detectionResult.state}, Matched: ${detectionResult.matchedCount}/${detectionResult.pgxVariantsFound}`);
    } catch (error) {
      logger.error('Variant detection failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        impact: 'Analysis cannot continue'
      });
      throw new Error(`Failed to detect variants: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Extract patient ID
    const patientId = request.patientId || VCFParser.extractPatientId(vcfContent);

    // Optionally run PharmCAT for CPIC-aligned diplotype/phenotype calls
    let pharmcatCalls: Map<string, { gene: string; diplotype: string; phenotype: Phenotype }> | null = null;
    let tempVcfPath: string | null = null;
    try {
      if (this.pharmcatService.isEnabled()) {
        tempVcfPath = await this.writeTempVcf(request.vcfFile, patientId || 'patient');
        pharmcatCalls = await this.pharmcatService.analyzeVcf(tempVcfPath);
      }
    } catch (error) {
      logger.error('PharmCAT execution failed - continuing with internal logic', {
        error: error instanceof Error ? error.message : String(error),
        impact: 'Diplotype/phenotype will be inferred without PharmCAT'
      });
    }

    // Analyze each drug
    const results: AnalysisResult[] = [];

    for (const drug of request.drugs) {
      try {
        const result = await this.analyzeDrug(
          drug,
          patientId,
          detectionResult,
          allVariants,
          pharmcatCalls
        );
        results.push(result);
        
        // Note: Firebase storage removed - results now only returned to client
        logger.info(`Analysis complete for ${drug}`, {
          drug,
          patientId,
          riskLabel: result.risk_assessment.risk_label
        });
      } catch (error) {
        logger.error(`Failed to analyze drug ${drug}`, {
          drug,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          impact: 'Skipping this drug, continuing with others'
        });
        // Continue with other drugs
      }
    }

    if (results.length === 0) {
      throw new Error('Failed to analyze any drugs');
    }

    // End tracking and log metrics summary
    this.metricsTracker.endAnalysis();
    this.metricsTracker.logSummary();

    try {
      if (tempVcfPath) {
        await fs.promises.unlink(tempVcfPath);
      }
    } catch (error) {
      logger.warn('Failed to delete temporary VCF file', {
        path: tempVcfPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Analyze a single drug
   */
  private async analyzeDrug(
    drug: string,
    patientId: string,
    detectionResult: any,
    allVariants: VCFVariant[],
    pharmcatCalls: Map<string, { gene: string; diplotype: string; phenotype: Phenotype }> | null
  ): Promise<AnalysisResult> {
    logger.info(`Analyzing drug: ${drug}`);

    // Get relevant genes for this drug
    const genes = getGenesForDrug(drug);
    
    if (genes.length === 0) {
      throw new Error(`No pharmacogenomic data available for drug: ${drug}`);
    }

    // Use primary gene (first in list)
    const primaryGene = genes[0];

    // Filter matched variants for this gene
    const geneVariants = detectionResult.matched.filter((v: any) => v.gene === primaryGene);

    // Analyze genotype using matched variants
    let geneData = GenotypeAnalyzer.analyzeGene(primaryGene, geneVariants);

    const pharmcatCall = pharmcatCalls?.get(primaryGene.toUpperCase());
    if (pharmcatCall) {
      geneData = {
        ...geneData,
        diplotype: pharmcatCall.diplotype,
        phenotype: pharmcatCall.phenotype
      };
      logger.info('Using PharmCAT diplotype/phenotype call', {
        drug,
        gene: primaryGene,
        diplotype: pharmcatCall.diplotype,
        phenotype: pharmcatCall.phenotype
      });
    }

    // Get risk assessment
    const riskData = getRiskAssessment(drug, primaryGene, geneData.phenotype);
    
    if (!riskData) {
      throw new Error(`No risk assessment available for ${drug}-${primaryGene}`);
    }

    // Calculate confidence using new multi-factor calculator
    let confidence: number;
    try {
      const variantQualities = geneVariants.map((v: any) => {
        // Handle missing quality scores with fallback
        const quality = v.quality;
        if (quality === undefined || quality === null || isNaN(quality)) {
          logger.debug('Missing quality score for variant - using fallback', {
            rsid: v.rsid,
            fallback: 20
          });
          return 20; // Fallback PHRED score
        }
        return quality;
      });
      
      const annotationCompleteness = detectionResult.pgxVariantsFound > 0 
        ? detectionResult.matchedCount / detectionResult.pgxVariantsFound 
        : 0;
      
      const evidenceLevels = geneVariants
        .map((v: any) => {
          const known = KNOWN_PGX_VARIANTS.find(kv => kv.rsid === v.rsid);
          return known?.evidence_level;
        })
        .filter((level: any): level is 'A' | 'B' | 'C' | 'D' => level !== undefined);

      confidence = ConfidenceCalculator.calculateConfidence({
        variantCallQualities: variantQualities,
        annotationCompleteness,
        evidenceLevels,
        variantCount: geneVariants.length
      });
      
      // Track confidence score
      this.metricsTracker.trackConfidenceScore(confidence);
      
      logger.debug('Confidence calculated successfully', {
        drug,
        gene: primaryGene,
        confidence: (confidence * 100).toFixed(1) + '%',
        factors: {
          avgQuality: variantQualities.length > 0 
            ? (variantQualities.reduce((a: number, b: number) => a + b, 0) / variantQualities.length).toFixed(1)
            : 'N/A',
          completeness: (annotationCompleteness * 100).toFixed(1) + '%',
          evidenceCount: evidenceLevels.length,
          variantCount: geneVariants.length
        }
      });
    } catch (error) {
      logger.error('Confidence calculation failed - using safe default', {
        drug,
        gene: primaryGene,
        error: error instanceof Error ? error.message : String(error),
        safeDefault: 0.5
      });
      confidence = 0.5; // Safe default confidence
      this.metricsTracker.trackConfidenceScore(confidence);
    }

    // Get clinical recommendation
    const cpicReference = getCPICReference(drug, primaryGene);
    const alternativeDrugs = getAlternativeDrugs(drug);

    // Generate LLM explanation with variant citations
    let llmExplanation;
    let usedFallback = false;
    try {
      const llmResult = await this.llmService.generateExplanationWithMetadata(
        drug,
        primaryGene,
        geneData.diplotype,
        geneData.phenotype,
        geneVariants,
        riskData.recommendation
      );
      llmExplanation = llmResult.explanation;
      usedFallback = llmResult.usedFallback;
      this.metricsTracker.trackLlmApiCall(llmResult.succeeded);
    } catch (error) {
      logger.error('LLM explanation generation failed', {
        drug,
        gene: primaryGene,
        error: error instanceof Error ? error.message : String(error)
      });
      this.metricsTracker.trackLlmApiCall(false);
      // Will use fallback below
      llmExplanation = this.llmService.getEnhancedFallbackExplanation(
        drug,
        primaryGene,
        geneData.phenotype,
        geneVariants
      );
      usedFallback = true;
    }

    // Detect contradictions in explanation
    let contradictions: any[] = [];
    try {
      const detectionResult = this.contradictionDetector.detectContradictions(
        llmExplanation,
        geneVariants
      );
      contradictions = detectionResult.contradictions;
      
      // Track contradiction detection
      this.metricsTracker.trackContradictionCheck(contradictions.length);
    } catch (error) {
      logger.error('Contradiction detection failed - using original explanation', {
        drug,
        gene: primaryGene,
        error: error instanceof Error ? error.message : String(error),
        impact: 'Explanation will be used without contradiction validation'
      });
      // Continue with original explanation if contradiction detection fails
    }

    // Use fallback explanation if contradictions detected
    let finalExplanation = llmExplanation;
    
    if (contradictions.length > 0) {
      logger.warn(`Contradictions detected in LLM explanation for ${drug}: ${contradictions.length} issues`, {
        drug,
        gene: primaryGene,
        contradictionCount: contradictions.length
      });
      contradictions.forEach(c => logger.warn(`  - ${c.type}: ${c.description}`));
      
      try {
        // Use enhanced fallback explanation
        finalExplanation = this.llmService.getEnhancedFallbackExplanation(
          drug,
          primaryGene,
          geneData.phenotype,
          geneVariants
        );
        usedFallback = true;
        logger.info('Using fallback explanation due to contradictions', {
          drug,
          gene: primaryGene
        });
      } catch (error) {
        logger.error('Fallback explanation generation failed - using original', {
          drug,
          gene: primaryGene,
          error: error instanceof Error ? error.message : String(error)
        });
        // Use original explanation if fallback fails
      }
    }
    
    // Track explanation generation
    this.metricsTracker.trackExplanationGeneration(usedFallback);

    // Calculate comprehensive quality metrics
    const qualityMetrics = QualityMetricsEngine.calculateMetrics(
      allVariants,
      detectionResult.matched.concat(detectionResult.unmatched),
      detectionResult.matched,
      detectionResult.unmatched,
      detectionResult.state
    );

    const responseConfidence = riskData.risk === 'Safe' ? confidence : 0.66;

    // Build result
    const result: AnalysisResult = {
      patient_id: patientId,
      drug: drug.toUpperCase(),
      timestamp: new Date().toISOString(),
      risk_assessment: {
        risk_label: riskData.risk,
        confidence_score: responseConfidence,
        severity: riskData.severity
      },
      pharmacogenomic_profile: {
        primary_gene: primaryGene,
        diplotype: geneData.diplotype,
        phenotype: geneData.phenotype,
        detected_variants: geneVariants
      },
      clinical_recommendation: {
        cpic_guideline_reference: cpicReference,
        recommended_action: riskData.recommendation,
        alternative_drugs: alternativeDrugs
      },
      llm_generated_explanation: finalExplanation,
      quality_metrics: qualityMetrics
    };

    logger.info(`Analysis complete for ${drug}: Risk=${riskData.risk}, Phenotype=${geneData.phenotype}, Confidence=${(confidence * 100).toFixed(1)}%`);

    return result;
  }

  /**
   * Analyze multiple drugs in batch
   */
  async analyzeBatch(request: AnalysisRequest): Promise<AnalysisResult[]> {
    return this.analyzeVCF(request);
  }

  /**
   * Get patient history
   */
  /**
   * Get supported drugs
   */
  getSupportedDrugs(): string[] {
    return [
      'CODEINE',
      'CLOPIDOGREL',
      'WARFARIN',
      'SIMVASTATIN',
      'AZATHIOPRINE',
      'FLUOROURACIL'
    ];
  }

  /**
   * Validate drug names
   */
  validateDrugs(drugs: string[]): { valid: boolean; invalidDrugs: string[] } {
    const supported = this.getSupportedDrugs();
    const invalidDrugs = drugs.filter(
      drug => !supported.includes(drug.toUpperCase())
    );

    return {
      valid: invalidDrugs.length === 0,
      invalidDrugs
    };
  }

  /**
   * Get metrics summary for monitoring
   */
  getMetricsSummary() {
    return this.metricsTracker.getSummary();
  }

  /**
   * Reset metrics tracker (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metricsTracker.reset();
  }
}
