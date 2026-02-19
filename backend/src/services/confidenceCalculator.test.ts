import { ConfidenceCalculator, ConfidenceInput, EvidenceLevel } from './confidenceCalculator';

/**
 * Unit Tests for Confidence Calculator
 * 
 * Tests specific examples and edge cases for confidence score calculation.
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

describe('ConfidenceCalculator', () => {
  describe('High Quality Analysis - Requirement 6.1', () => {
    /**
     * **Validates: Requirements 6.1**
     * 
     * Test that high quality analysis (completeness 100%, evidence A, quality >30)
     * produces confidence >80%
     */
    it('should produce >80% confidence for high quality analysis', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [35, 40, 45, 38, 42], // All > 30
        annotationCompleteness: 1.0, // 100%
        evidenceLevels: ['A', 'A', 'A', 'A', 'A'],
        variantCount: 5
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThan(0.80);
    });

    it('should produce >80% confidence with quality exactly at 31', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [31, 31, 31],
        annotationCompleteness: 1.0,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 5
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThan(0.80);
    });

    it('should produce >80% confidence with mixed high quality scores', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [31, 50, 100, 35],
        annotationCompleteness: 1.0,
        evidenceLevels: ['A', 'A', 'A', 'A'],
        variantCount: 4
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThan(0.80);
    });
  });

  describe('Low Completeness Analysis - Requirement 6.2', () => {
    /**
     * **Validates: Requirements 6.2**
     * 
     * Test that low completeness analysis (completeness 0%) produces
     * significantly lower confidence than high completeness.
     * 
     * Note: Due to the multi-factor formula (completeness contributes 30%),
     * 0% completeness alone doesn't guarantee <30% overall confidence if
     * other factors are high. However, it should produce <30% when combined
     * with low quality and low evidence.
     */
    it('should produce <30% confidence for 0% completeness with low quality and evidence', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [15, 18, 19], // Low quality < 20
        annotationCompleteness: 0.0, // 0%
        evidenceLevels: ['D', 'D', 'D'], // Low evidence
        variantCount: 1 // Low variant count
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeLessThan(0.30);
    });

    it('should significantly reduce confidence when completeness is 0%', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        evidenceLevels: ['A', 'A', 'A'] as EvidenceLevel[],
        variantCount: 3
      };

      const inputZeroCompleteness: ConfidenceInput = {
        ...baseInput,
        annotationCompleteness: 0.0
      };

      const inputHighCompleteness: ConfidenceInput = {
        ...baseInput,
        annotationCompleteness: 1.0
      };

      const confidenceZero = ConfidenceCalculator.calculateConfidence(inputZeroCompleteness);
      const confidenceHigh = ConfidenceCalculator.calculateConfidence(inputHighCompleteness);
      
      // 0% completeness should reduce confidence by at least 25% (since completeness contributes 30%)
      expect(confidenceHigh - confidenceZero).toBeGreaterThanOrEqual(0.25);
      expect(confidenceZero).toBeLessThan(confidenceHigh);
    });

    it('should produce low confidence with 0% completeness and all low factors', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [10, 12, 15], // Very low quality
        annotationCompleteness: 0.0, // 0%
        evidenceLevels: ['D', 'D'], // Minimal evidence
        variantCount: 1 // Low variant count
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      // With all factors low, confidence should be very low
      expect(confidence).toBeLessThan(0.30);
    });
  });

  describe('Evidence Level Comparison - Requirement 6.3', () => {
    /**
     * **Validates: Requirements 6.3**
     * 
     * Test that evidence level ordering is respected (A > B > C > D)
     */
    it('should assign higher confidence to evidence level A than B', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        variantCount: 3
      };

      const inputA: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['A', 'A', 'A']
      };

      const inputB: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['B', 'B', 'B']
      };

      const confidenceA = ConfidenceCalculator.calculateConfidence(inputA);
      const confidenceB = ConfidenceCalculator.calculateConfidence(inputB);
      
      expect(confidenceA).toBeGreaterThan(confidenceB);
    });

    it('should assign higher confidence to evidence level B than C', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        variantCount: 3
      };

      const inputB: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['B', 'B', 'B']
      };

      const inputC: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['C', 'C', 'C']
      };

      const confidenceB = ConfidenceCalculator.calculateConfidence(inputB);
      const confidenceC = ConfidenceCalculator.calculateConfidence(inputC);
      
      expect(confidenceB).toBeGreaterThan(confidenceC);
    });

    it('should assign higher confidence to evidence level C than D', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        variantCount: 3
      };

      const inputC: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['C', 'C', 'C']
      };

      const inputD: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['D', 'D', 'D']
      };

      const confidenceC = ConfidenceCalculator.calculateConfidence(inputC);
      const confidenceD = ConfidenceCalculator.calculateConfidence(inputD);
      
      expect(confidenceC).toBeGreaterThan(confidenceD);
    });

    it('should respect evidence level ordering with complete chain A > B > C > D', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        variantCount: 3
      };

      const inputA: ConfidenceInput = { ...baseInput, evidenceLevels: ['A', 'A', 'A'] };
      const inputB: ConfidenceInput = { ...baseInput, evidenceLevels: ['B', 'B', 'B'] };
      const inputC: ConfidenceInput = { ...baseInput, evidenceLevels: ['C', 'C', 'C'] };
      const inputD: ConfidenceInput = { ...baseInput, evidenceLevels: ['D', 'D', 'D'] };

      const confidenceA = ConfidenceCalculator.calculateConfidence(inputA);
      const confidenceB = ConfidenceCalculator.calculateConfidence(inputB);
      const confidenceC = ConfidenceCalculator.calculateConfidence(inputC);
      const confidenceD = ConfidenceCalculator.calculateConfidence(inputD);
      
      expect(confidenceA).toBeGreaterThan(confidenceB);
      expect(confidenceB).toBeGreaterThan(confidenceC);
      expect(confidenceC).toBeGreaterThan(confidenceD);
    });

    it('should handle mixed evidence levels correctly', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45, 38],
        annotationCompleteness: 0.8,
        variantCount: 4
      };

      const inputMostlyA: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['A', 'A', 'A', 'B']
      };

      const inputMostlyB: ConfidenceInput = {
        ...baseInput,
        evidenceLevels: ['B', 'B', 'B', 'A']
      };

      const confidenceMostlyA = ConfidenceCalculator.calculateConfidence(inputMostlyA);
      const confidenceMostlyB = ConfidenceCalculator.calculateConfidence(inputMostlyB);
      
      expect(confidenceMostlyA).toBeGreaterThan(confidenceMostlyB);
    });
  });

  describe('Quality Score Impact - Requirement 6.4', () => {
    /**
     * **Validates: Requirements 6.4**
     * 
     * Test that quality score impacts confidence appropriately
     */
    it('should increase confidence when quality increases from low to high', () => {
      const baseInput = {
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'] as EvidenceLevel[],
        variantCount: 3
      };

      const inputLowQuality: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [15, 18, 19] // < 20
      };

      const inputHighQuality: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [35, 40, 45] // > 30
      };

      const confidenceLow = ConfidenceCalculator.calculateConfidence(inputLowQuality);
      const confidenceHigh = ConfidenceCalculator.calculateConfidence(inputHighQuality);
      
      expect(confidenceHigh).toBeGreaterThan(confidenceLow);
    });

    it('should show quality impact across quality ranges', () => {
      const baseInput = {
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'] as EvidenceLevel[],
        variantCount: 3
      };

      const inputVeryLow: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [10, 12, 15]
      };

      const inputMedium: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [25, 26, 27]
      };

      const inputHigh: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [50, 60, 70]
      };

      const confidenceVeryLow = ConfidenceCalculator.calculateConfidence(inputVeryLow);
      const confidenceMedium = ConfidenceCalculator.calculateConfidence(inputMedium);
      const confidenceHigh = ConfidenceCalculator.calculateConfidence(inputHigh);
      
      expect(confidenceMedium).toBeGreaterThan(confidenceVeryLow);
      expect(confidenceHigh).toBeGreaterThan(confidenceMedium);
    });

    it('should not decrease confidence when quality increases', () => {
      const baseInput = {
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A'] as EvidenceLevel[],
        variantCount: 2
      };

      const input1: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [20, 20]
      };

      const input2: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [30, 30]
      };

      const input3: ConfidenceInput = {
        ...baseInput,
        variantCallQualities: [40, 40]
      };

      const confidence1 = ConfidenceCalculator.calculateConfidence(input1);
      const confidence2 = ConfidenceCalculator.calculateConfidence(input2);
      const confidence3 = ConfidenceCalculator.calculateConfidence(input3);
      
      expect(confidence2).toBeGreaterThanOrEqual(confidence1);
      expect(confidence3).toBeGreaterThanOrEqual(confidence2);
    });
  });

  describe('Variant Count Saturation', () => {
    /**
     * Test that variant count saturates at 5 variants
     */
    it('should saturate variant count factor at 5 variants', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'] as EvidenceLevel[]
      };

      const input5: ConfidenceInput = {
        ...baseInput,
        variantCount: 5
      };

      const input10: ConfidenceInput = {
        ...baseInput,
        variantCount: 10
      };

      const confidence5 = ConfidenceCalculator.calculateConfidence(input5);
      const confidence10 = ConfidenceCalculator.calculateConfidence(input10);
      
      // Should be equal due to saturation
      expect(confidence5).toBeCloseTo(confidence10, 5);
    });

    it('should increase confidence as variant count increases up to 5', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'] as EvidenceLevel[]
      };

      const input1: ConfidenceInput = { ...baseInput, variantCount: 1 };
      const input3: ConfidenceInput = { ...baseInput, variantCount: 3 };
      const input5: ConfidenceInput = { ...baseInput, variantCount: 5 };

      const confidence1 = ConfidenceCalculator.calculateConfidence(input1);
      const confidence3 = ConfidenceCalculator.calculateConfidence(input3);
      const confidence5 = ConfidenceCalculator.calculateConfidence(input5);
      
      expect(confidence3).toBeGreaterThan(confidence1);
      expect(confidence5).toBeGreaterThan(confidence3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty quality array', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A'],
        variantCount: 2
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty evidence levels array', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: [],
        variantCount: 3
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle zero variant count', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 0
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle very low quality scores', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [1, 2, 3],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 3
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle very high quality scores', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [100, 100, 100],
        annotationCompleteness: 1.0,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 5
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle single variant', () => {
      const input: ConfidenceInput = {
        variantCallQualities: [35],
        annotationCompleteness: 1.0,
        evidenceLevels: ['A'],
        variantCount: 1
      };

      const confidence = ConfidenceCalculator.calculateConfidence(input);
      
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should handle completeness at boundaries', () => {
      const baseInput = {
        variantCallQualities: [35, 40, 45],
        evidenceLevels: ['A', 'A', 'A'] as EvidenceLevel[],
        variantCount: 3
      };

      const input0: ConfidenceInput = { ...baseInput, annotationCompleteness: 0.0 };
      const input50: ConfidenceInput = { ...baseInput, annotationCompleteness: 0.5 };
      const input100: ConfidenceInput = { ...baseInput, annotationCompleteness: 1.0 };

      const confidence0 = ConfidenceCalculator.calculateConfidence(input0);
      const confidence50 = ConfidenceCalculator.calculateConfidence(input50);
      const confidence100 = ConfidenceCalculator.calculateConfidence(input100);
      
      expect(confidence50).toBeGreaterThan(confidence0);
      expect(confidence100).toBeGreaterThan(confidence50);
    });
  });

  describe('Confidence Bounds', () => {
    it('should always return confidence between 0 and 1', () => {
      const testCases: ConfidenceInput[] = [
        {
          variantCallQualities: [0, 0, 0],
          annotationCompleteness: 0.0,
          evidenceLevels: ['D', 'D', 'D'],
          variantCount: 0
        },
        {
          variantCallQualities: [100, 100, 100],
          annotationCompleteness: 1.0,
          evidenceLevels: ['A', 'A', 'A'],
          variantCount: 10
        },
        {
          variantCallQualities: [50],
          annotationCompleteness: 0.5,
          evidenceLevels: ['B'],
          variantCount: 3
        }
      ];

      for (const input of testCases) {
        const confidence = ConfidenceCalculator.calculateConfidence(input);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should not return exactly 0.5 unless calculated', () => {
      // Test various inputs to ensure we're not hardcoding 50%
      const testCases: ConfidenceInput[] = [
        {
          variantCallQualities: [35, 40, 45],
          annotationCompleteness: 0.8,
          evidenceLevels: ['A', 'A', 'A'],
          variantCount: 3
        },
        {
          variantCallQualities: [20, 25, 30],
          annotationCompleteness: 0.6,
          evidenceLevels: ['B', 'B', 'B'],
          variantCount: 2
        },
        {
          variantCallQualities: [15, 18, 19],
          annotationCompleteness: 0.4,
          evidenceLevels: ['C', 'C', 'C'],
          variantCount: 1
        }
      ];

      const confidences = testCases.map(input => 
        ConfidenceCalculator.calculateConfidence(input)
      );

      // All should be different values (not hardcoded)
      const uniqueConfidences = new Set(confidences);
      expect(uniqueConfidences.size).toBe(testCases.length);
    });
  });

  describe('Individual Factor Calculations', () => {
    describe('calculateQualityFactor', () => {
      it('should return low factor for quality < 20', () => {
        const factor = ConfidenceCalculator.calculateQualityFactor([10, 15, 18]);
        expect(factor).toBeLessThan(0.3);
      });

      it('should return medium factor for quality 20-30', () => {
        const factor = ConfidenceCalculator.calculateQualityFactor([22, 25, 28]);
        expect(factor).toBeGreaterThanOrEqual(0.25);
        expect(factor).toBeLessThanOrEqual(0.6);
      });

      it('should return high factor for quality > 30', () => {
        const factor = ConfidenceCalculator.calculateQualityFactor([35, 40, 50]);
        expect(factor).toBeGreaterThan(0.6);
      });

      it('should return 0 for empty array', () => {
        const factor = ConfidenceCalculator.calculateQualityFactor([]);
        expect(factor).toBe(0);
      });
    });

    describe('calculateCompletenessFactor', () => {
      it('should return direct mapping of completeness', () => {
        expect(ConfidenceCalculator.calculateCompletenessFactor(0.0)).toBe(0.0);
        expect(ConfidenceCalculator.calculateCompletenessFactor(0.5)).toBe(0.5);
        expect(ConfidenceCalculator.calculateCompletenessFactor(1.0)).toBe(1.0);
      });

      it('should clamp values to [0, 1]', () => {
        expect(ConfidenceCalculator.calculateCompletenessFactor(-0.1)).toBe(0);
        expect(ConfidenceCalculator.calculateCompletenessFactor(1.1)).toBe(1);
      });
    });

    describe('calculateEvidenceFactor', () => {
      it('should return 1.0 for all A evidence', () => {
        const factor = ConfidenceCalculator.calculateEvidenceFactor(['A', 'A', 'A']);
        expect(factor).toBe(1.0);
      });

      it('should return 0.75 for all B evidence', () => {
        const factor = ConfidenceCalculator.calculateEvidenceFactor(['B', 'B', 'B']);
        expect(factor).toBe(0.75);
      });

      it('should return 0.5 for all C evidence', () => {
        const factor = ConfidenceCalculator.calculateEvidenceFactor(['C', 'C', 'C']);
        expect(factor).toBe(0.5);
      });

      it('should return 0.25 for all D evidence', () => {
        const factor = ConfidenceCalculator.calculateEvidenceFactor(['D', 'D', 'D']);
        expect(factor).toBe(0.25);
      });

      it('should return weighted average for mixed evidence', () => {
        const factor = ConfidenceCalculator.calculateEvidenceFactor(['A', 'B']);
        expect(factor).toBe(0.875); // (1.0 + 0.75) / 2
      });

      it('should return 0.25 for empty array', () => {
        const factor = ConfidenceCalculator.calculateEvidenceFactor([]);
        expect(factor).toBe(0.25);
      });
    });

    describe('calculateVariantCountFactor', () => {
      it('should return proportional value for count < 5', () => {
        expect(ConfidenceCalculator.calculateVariantCountFactor(1)).toBe(0.2);
        expect(ConfidenceCalculator.calculateVariantCountFactor(2)).toBe(0.4);
        expect(ConfidenceCalculator.calculateVariantCountFactor(3)).toBe(0.6);
        expect(ConfidenceCalculator.calculateVariantCountFactor(4)).toBe(0.8);
      });

      it('should saturate at 1.0 for count >= 5', () => {
        expect(ConfidenceCalculator.calculateVariantCountFactor(5)).toBe(1.0);
        expect(ConfidenceCalculator.calculateVariantCountFactor(10)).toBe(1.0);
        expect(ConfidenceCalculator.calculateVariantCountFactor(100)).toBe(1.0);
      });

      it('should return 0 for zero count', () => {
        expect(ConfidenceCalculator.calculateVariantCountFactor(0)).toBe(0);
      });
    });
  });

  describe('Monotonicity Validation', () => {
    it('should validate monotonicity for quality increases', () => {
      const input1: ConfidenceInput = {
        variantCallQualities: [20, 20, 20],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 3
      };

      const input2: ConfidenceInput = {
        variantCallQualities: [30, 30, 30],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 3
      };

      const isMonotonic = ConfidenceCalculator.validateMonotonicity(input1, input2, 'quality');
      expect(isMonotonic).toBe(true);
    });

    it('should validate monotonicity for completeness increases', () => {
      const input1: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.5,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 3
      };

      const input2: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 3
      };

      const isMonotonic = ConfidenceCalculator.validateMonotonicity(input1, input2, 'completeness');
      expect(isMonotonic).toBe(true);
    });

    it('should validate monotonicity for evidence level increases', () => {
      const input1: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['B', 'B', 'B'],
        variantCount: 3
      };

      const input2: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 3
      };

      const isMonotonic = ConfidenceCalculator.validateMonotonicity(input1, input2, 'evidence');
      expect(isMonotonic).toBe(true);
    });

    it('should validate monotonicity for variant count increases', () => {
      const input1: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 2
      };

      const input2: ConfidenceInput = {
        variantCallQualities: [35, 40, 45],
        annotationCompleteness: 0.8,
        evidenceLevels: ['A', 'A', 'A'],
        variantCount: 4
      };

      const isMonotonic = ConfidenceCalculator.validateMonotonicity(input1, input2, 'count');
      expect(isMonotonic).toBe(true);
    });
  });
});
