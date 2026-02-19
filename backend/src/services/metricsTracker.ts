import logger from '../utils/logger';

/**
 * Metrics data structure for tracking pipeline performance
 */
export interface PipelineMetrics {
  // VCF Parsing metrics
  vcfParsingAttempts: number;
  vcfParsingSuccesses: number;
  vcfParsingFailures: number;
  
  // Round-trip validation metrics
  roundTripValidationAttempts: number;
  roundTripValidationSuccesses: number;
  roundTripValidationFailures: number;
  
  // Variant matching metrics
  totalVariantsProcessed: number;
  variantsMatched: number;
  variantsUnmatched: number;
  
  // Confidence score metrics
  confidenceScores: number[];
  
  // LLM API metrics
  llmApiAttempts: number;
  llmApiSuccesses: number;
  llmApiFailures: number;
  
  // Contradiction detection metrics
  contradictionChecks: number;
  contradictionsDetected: number;
  
  // Fallback explanation metrics
  explanationGenerations: number;
  fallbackExplanationsUsed: number;
  
  // Timing metrics
  analysisStartTime?: number;
  analysisEndTime?: number;
  analysisDurations: number[];
}

/**
 * Aggregated metrics summary for reporting
 */
export interface MetricsSummary {
  vcfParsingSuccessRate: number;
  roundTripValidationSuccessRate: number;
  variantMatchingRate: number;
  averageConfidenceScore: number;
  llmApiSuccessRate: number;
  contradictionDetectionRate: number;
  fallbackExplanationUsageRate: number;
  averageAnalysisTime: number;
  totalAnalyses: number;
}

/**
 * MetricsTracker service
 * Tracks performance and quality metrics throughout the analysis pipeline
 * Logs metrics in structured format for monitoring and alerting
 */
export class MetricsTracker {
  private metrics: PipelineMetrics;

  constructor() {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize empty metrics structure
   */
  private initializeMetrics(): PipelineMetrics {
    return {
      vcfParsingAttempts: 0,
      vcfParsingSuccesses: 0,
      vcfParsingFailures: 0,
      roundTripValidationAttempts: 0,
      roundTripValidationSuccesses: 0,
      roundTripValidationFailures: 0,
      totalVariantsProcessed: 0,
      variantsMatched: 0,
      variantsUnmatched: 0,
      confidenceScores: [],
      llmApiAttempts: 0,
      llmApiSuccesses: 0,
      llmApiFailures: 0,
      contradictionChecks: 0,
      contradictionsDetected: 0,
      explanationGenerations: 0,
      fallbackExplanationsUsed: 0,
      analysisDurations: []
    };
  }

  /**
   * Start tracking an analysis
   */
  startAnalysis(): void {
    this.metrics.analysisStartTime = Date.now();
  }

  /**
   * End tracking an analysis and record duration
   */
  endAnalysis(): void {
    if (this.metrics.analysisStartTime) {
      this.metrics.analysisEndTime = Date.now();
      const duration = this.metrics.analysisEndTime - this.metrics.analysisStartTime;
      this.metrics.analysisDurations.push(duration);
      
      logger.debug('Analysis timing recorded', {
        duration: `${duration}ms`,
        averageDuration: this.getAverageAnalysisTime()
      });
    }
  }

  /**
   * Track VCF parsing attempt
   */
  trackVcfParsingAttempt(success: boolean): void {
    this.metrics.vcfParsingAttempts++;
    if (success) {
      this.metrics.vcfParsingSuccesses++;
    } else {
      this.metrics.vcfParsingFailures++;
    }
    
    logger.debug('VCF parsing tracked', {
      success,
      successRate: this.getVcfParsingSuccessRate()
    });
  }

  /**
   * Track round-trip validation attempt
   */
  trackRoundTripValidation(success: boolean): void {
    this.metrics.roundTripValidationAttempts++;
    if (success) {
      this.metrics.roundTripValidationSuccesses++;
    } else {
      this.metrics.roundTripValidationFailures++;
    }
    
    logger.debug('Round-trip validation tracked', {
      success,
      successRate: this.getRoundTripValidationSuccessRate()
    });
  }

  /**
   * Track variant matching results
   */
  trackVariantMatching(matched: number, unmatched: number): void {
    this.metrics.totalVariantsProcessed += matched + unmatched;
    this.metrics.variantsMatched += matched;
    this.metrics.variantsUnmatched += unmatched;
    
    logger.debug('Variant matching tracked', {
      matched,
      unmatched,
      matchingRate: this.getVariantMatchingRate()
    });
  }

  /**
   * Track confidence score
   */
  trackConfidenceScore(score: number): void {
    this.metrics.confidenceScores.push(score);
    
    logger.debug('Confidence score tracked', {
      score: (score * 100).toFixed(1) + '%',
      averageScore: (this.getAverageConfidenceScore() * 100).toFixed(1) + '%'
    });
  }

  /**
   * Track LLM API call
   */
  trackLlmApiCall(success: boolean): void {
    this.metrics.llmApiAttempts++;
    if (success) {
      this.metrics.llmApiSuccesses++;
    } else {
      this.metrics.llmApiFailures++;
    }
    
    logger.debug('LLM API call tracked', {
      success,
      successRate: this.getLlmApiSuccessRate()
    });
  }

  /**
   * Track contradiction detection
   */
  trackContradictionCheck(contradictionsFound: number): void {
    this.metrics.contradictionChecks++;
    if (contradictionsFound > 0) {
      this.metrics.contradictionsDetected++;
    }
    
    logger.debug('Contradiction check tracked', {
      contradictionsFound,
      detectionRate: this.getContradictionDetectionRate()
    });
  }

  /**
   * Track explanation generation
   */
  trackExplanationGeneration(usedFallback: boolean): void {
    this.metrics.explanationGenerations++;
    if (usedFallback) {
      this.metrics.fallbackExplanationsUsed++;
    }
    
    logger.debug('Explanation generation tracked', {
      usedFallback,
      fallbackUsageRate: this.getFallbackExplanationUsageRate()
    });
  }

  /**
   * Get VCF parsing success rate
   */
  private getVcfParsingSuccessRate(): number {
    if (this.metrics.vcfParsingAttempts === 0) return 0;
    return this.metrics.vcfParsingSuccesses / this.metrics.vcfParsingAttempts;
  }

  /**
   * Get round-trip validation success rate
   */
  private getRoundTripValidationSuccessRate(): number {
    if (this.metrics.roundTripValidationAttempts === 0) return 0;
    return this.metrics.roundTripValidationSuccesses / this.metrics.roundTripValidationAttempts;
  }

  /**
   * Get variant matching rate
   */
  private getVariantMatchingRate(): number {
    if (this.metrics.totalVariantsProcessed === 0) return 0;
    return this.metrics.variantsMatched / this.metrics.totalVariantsProcessed;
  }

  /**
   * Get average confidence score
   */
  private getAverageConfidenceScore(): number {
    if (this.metrics.confidenceScores.length === 0) return 0;
    const sum = this.metrics.confidenceScores.reduce((a, b) => a + b, 0);
    return sum / this.metrics.confidenceScores.length;
  }

  /**
   * Get LLM API success rate
   */
  private getLlmApiSuccessRate(): number {
    if (this.metrics.llmApiAttempts === 0) return 0;
    return this.metrics.llmApiSuccesses / this.metrics.llmApiAttempts;
  }

  /**
   * Get contradiction detection rate
   */
  private getContradictionDetectionRate(): number {
    if (this.metrics.contradictionChecks === 0) return 0;
    return this.metrics.contradictionsDetected / this.metrics.contradictionChecks;
  }

  /**
   * Get fallback explanation usage rate
   */
  private getFallbackExplanationUsageRate(): number {
    if (this.metrics.explanationGenerations === 0) return 0;
    return this.metrics.fallbackExplanationsUsed / this.metrics.explanationGenerations;
  }

  /**
   * Get average analysis time in milliseconds
   */
  private getAverageAnalysisTime(): number {
    if (this.metrics.analysisDurations.length === 0) return 0;
    const sum = this.metrics.analysisDurations.reduce((a, b) => a + b, 0);
    return sum / this.metrics.analysisDurations.length;
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): MetricsSummary {
    return {
      vcfParsingSuccessRate: this.getVcfParsingSuccessRate(),
      roundTripValidationSuccessRate: this.getRoundTripValidationSuccessRate(),
      variantMatchingRate: this.getVariantMatchingRate(),
      averageConfidenceScore: this.getAverageConfidenceScore(),
      llmApiSuccessRate: this.getLlmApiSuccessRate(),
      contradictionDetectionRate: this.getContradictionDetectionRate(),
      fallbackExplanationUsageRate: this.getFallbackExplanationUsageRate(),
      averageAnalysisTime: this.getAverageAnalysisTime(),
      totalAnalyses: this.metrics.analysisDurations.length
    };
  }

  /**
   * Log comprehensive metrics summary in structured format
   */
  logSummary(): void {
    const summary = this.getSummary();
    
    logger.info('=== Pipeline Metrics Summary ===', {
      vcfParsing: {
        successRate: (summary.vcfParsingSuccessRate * 100).toFixed(2) + '%',
        attempts: this.metrics.vcfParsingAttempts,
        successes: this.metrics.vcfParsingSuccesses,
        failures: this.metrics.vcfParsingFailures
      },
      roundTripValidation: {
        successRate: (summary.roundTripValidationSuccessRate * 100).toFixed(2) + '%',
        attempts: this.metrics.roundTripValidationAttempts,
        successes: this.metrics.roundTripValidationSuccesses,
        failures: this.metrics.roundTripValidationFailures
      },
      variantMatching: {
        matchingRate: (summary.variantMatchingRate * 100).toFixed(2) + '%',
        totalProcessed: this.metrics.totalVariantsProcessed,
        matched: this.metrics.variantsMatched,
        unmatched: this.metrics.variantsUnmatched
      },
      confidence: {
        averageScore: (summary.averageConfidenceScore * 100).toFixed(2) + '%',
        scoreCount: this.metrics.confidenceScores.length,
        minScore: this.metrics.confidenceScores.length > 0 
          ? (Math.min(...this.metrics.confidenceScores) * 100).toFixed(2) + '%'
          : 'N/A',
        maxScore: this.metrics.confidenceScores.length > 0
          ? (Math.max(...this.metrics.confidenceScores) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      llmApi: {
        successRate: (summary.llmApiSuccessRate * 100).toFixed(2) + '%',
        attempts: this.metrics.llmApiAttempts,
        successes: this.metrics.llmApiSuccesses,
        failures: this.metrics.llmApiFailures
      },
      contradictions: {
        detectionRate: (summary.contradictionDetectionRate * 100).toFixed(2) + '%',
        checks: this.metrics.contradictionChecks,
        detected: this.metrics.contradictionsDetected
      },
      explanations: {
        fallbackUsageRate: (summary.fallbackExplanationUsageRate * 100).toFixed(2) + '%',
        totalGenerations: this.metrics.explanationGenerations,
        fallbacksUsed: this.metrics.fallbackExplanationsUsed
      },
      timing: {
        averageAnalysisTime: summary.averageAnalysisTime.toFixed(2) + 'ms',
        totalAnalyses: summary.totalAnalyses,
        minTime: this.metrics.analysisDurations.length > 0
          ? Math.min(...this.metrics.analysisDurations).toFixed(2) + 'ms'
          : 'N/A',
        maxTime: this.metrics.analysisDurations.length > 0
          ? Math.max(...this.metrics.analysisDurations).toFixed(2) + 'ms'
          : 'N/A'
      }
    });
  }

  /**
   * Reset all metrics (useful for testing or periodic resets)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    logger.info('Metrics tracker reset');
  }

  /**
   * Get raw metrics data
   */
  getRawMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }
}
