/// <reference types="jest" />
import { MetricsTracker } from './metricsTracker';

describe('MetricsTracker', () => {
  let tracker: MetricsTracker;

  beforeEach(() => {
    tracker = new MetricsTracker();
  });

  describe('VCF Parsing Metrics', () => {
    it('should track VCF parsing success', () => {
      tracker.trackVcfParsingAttempt(true);
      tracker.trackVcfParsingAttempt(true);
      tracker.trackVcfParsingAttempt(false);

      const summary = tracker.getSummary();
      expect(summary.vcfParsingSuccessRate).toBe(2 / 3);
    });

    it('should handle zero attempts', () => {
      const summary = tracker.getSummary();
      expect(summary.vcfParsingSuccessRate).toBe(0);
    });
  });

  describe('Round-Trip Validation Metrics', () => {
    it('should track round-trip validation', () => {
      tracker.trackRoundTripValidation(true);
      tracker.trackRoundTripValidation(true);
      tracker.trackRoundTripValidation(true);
      tracker.trackRoundTripValidation(false);

      const summary = tracker.getSummary();
      expect(summary.roundTripValidationSuccessRate).toBe(0.75);
    });
  });

  describe('Variant Matching Metrics', () => {
    it('should track variant matching', () => {
      tracker.trackVariantMatching(8, 2); // 8 matched, 2 unmatched
      tracker.trackVariantMatching(5, 5); // 5 matched, 5 unmatched

      const summary = tracker.getSummary();
      expect(summary.variantMatchingRate).toBe(13 / 20); // 13 matched out of 20 total
    });

    it('should handle zero variants', () => {
      const summary = tracker.getSummary();
      expect(summary.variantMatchingRate).toBe(0);
    });
  });

  describe('Confidence Score Metrics', () => {
    it('should track confidence scores', () => {
      tracker.trackConfidenceScore(0.85);
      tracker.trackConfidenceScore(0.72);
      tracker.trackConfidenceScore(0.91);

      const summary = tracker.getSummary();
      expect(summary.averageConfidenceScore).toBeCloseTo((0.85 + 0.72 + 0.91) / 3, 5);
    });

    it('should handle zero confidence scores', () => {
      const summary = tracker.getSummary();
      expect(summary.averageConfidenceScore).toBe(0);
    });
  });

  describe('LLM API Metrics', () => {
    it('should track LLM API calls', () => {
      tracker.trackLlmApiCall(true);
      tracker.trackLlmApiCall(true);
      tracker.trackLlmApiCall(false);
      tracker.trackLlmApiCall(true);

      const summary = tracker.getSummary();
      expect(summary.llmApiSuccessRate).toBe(0.75);
    });

    it('should handle zero API calls', () => {
      const summary = tracker.getSummary();
      expect(summary.llmApiSuccessRate).toBe(0);
    });
  });

  describe('Contradiction Detection Metrics', () => {
    it('should track contradiction checks', () => {
      tracker.trackContradictionCheck(0); // No contradictions
      tracker.trackContradictionCheck(2); // 2 contradictions found
      tracker.trackContradictionCheck(0); // No contradictions
      tracker.trackContradictionCheck(1); // 1 contradiction found

      const summary = tracker.getSummary();
      expect(summary.contradictionDetectionRate).toBe(0.5); // 2 out of 4 checks found contradictions
    });

    it('should handle zero checks', () => {
      const summary = tracker.getSummary();
      expect(summary.contradictionDetectionRate).toBe(0);
    });
  });

  describe('Fallback Explanation Metrics', () => {
    it('should track fallback explanation usage', () => {
      tracker.trackExplanationGeneration(false); // LLM explanation
      tracker.trackExplanationGeneration(true);  // Fallback
      tracker.trackExplanationGeneration(false); // LLM explanation
      tracker.trackExplanationGeneration(true);  // Fallback

      const summary = tracker.getSummary();
      expect(summary.fallbackExplanationUsageRate).toBe(0.5);
    });

    it('should handle zero explanations', () => {
      const summary = tracker.getSummary();
      expect(summary.fallbackExplanationUsageRate).toBe(0);
    });
  });

  describe('Analysis Timing Metrics', () => {
    it('should track analysis duration', () => {
      tracker.startAnalysis();
      // Simulate some processing time
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait at least 10ms
      }
      tracker.endAnalysis();

      const summary = tracker.getSummary();
      expect(summary.averageAnalysisTime).toBeGreaterThan(0);
      expect(summary.totalAnalyses).toBe(1);
    });

    it('should track multiple analyses', () => {
      // First analysis
      tracker.startAnalysis();
      tracker.endAnalysis();

      // Second analysis
      tracker.startAnalysis();
      tracker.endAnalysis();

      const summary = tracker.getSummary();
      expect(summary.totalAnalyses).toBe(2);
      expect(summary.averageAnalysisTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero analyses', () => {
      const summary = tracker.getSummary();
      expect(summary.averageAnalysisTime).toBe(0);
      expect(summary.totalAnalyses).toBe(0);
    });
  });

  describe('Comprehensive Metrics Summary', () => {
    it('should provide complete metrics summary', () => {
      // Track various metrics
      tracker.trackVcfParsingAttempt(true);
      tracker.trackVcfParsingAttempt(true);
      tracker.trackRoundTripValidation(true);
      tracker.trackVariantMatching(5, 2);
      tracker.trackConfidenceScore(0.85);
      tracker.trackLlmApiCall(true);
      tracker.trackContradictionCheck(0);
      tracker.trackExplanationGeneration(false);
      tracker.startAnalysis();
      tracker.endAnalysis();

      const summary = tracker.getSummary();

      expect(summary.vcfParsingSuccessRate).toBe(1.0);
      expect(summary.roundTripValidationSuccessRate).toBe(1.0);
      expect(summary.variantMatchingRate).toBeCloseTo(5 / 7, 5);
      expect(summary.averageConfidenceScore).toBe(0.85);
      expect(summary.llmApiSuccessRate).toBe(1.0);
      expect(summary.contradictionDetectionRate).toBe(0);
      expect(summary.fallbackExplanationUsageRate).toBe(0);
      expect(summary.averageAnalysisTime).toBeGreaterThanOrEqual(0);
      expect(summary.totalAnalyses).toBe(1);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all metrics', () => {
      // Track some metrics
      tracker.trackVcfParsingAttempt(true);
      tracker.trackVariantMatching(5, 2);
      tracker.trackConfidenceScore(0.85);

      // Reset
      tracker.reset();

      // Verify all metrics are reset
      const summary = tracker.getSummary();
      expect(summary.vcfParsingSuccessRate).toBe(0);
      expect(summary.variantMatchingRate).toBe(0);
      expect(summary.averageConfidenceScore).toBe(0);
      expect(summary.totalAnalyses).toBe(0);
    });
  });

  describe('Raw Metrics Access', () => {
    it('should provide raw metrics data', () => {
      tracker.trackVcfParsingAttempt(true);
      tracker.trackVcfParsingAttempt(false);
      tracker.trackVariantMatching(8, 2);

      const raw = tracker.getRawMetrics();

      expect(raw.vcfParsingAttempts).toBe(2);
      expect(raw.vcfParsingSuccesses).toBe(1);
      expect(raw.vcfParsingFailures).toBe(1);
      expect(raw.totalVariantsProcessed).toBe(10);
      expect(raw.variantsMatched).toBe(8);
      expect(raw.variantsUnmatched).toBe(2);
    });
  });
});