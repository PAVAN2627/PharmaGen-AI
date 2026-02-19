import { DetectedVariant, LLMExplanation } from '../types';
import logger from '../utils/logger';

// Functional status type for variants
export type FunctionalStatus = 'normal' | 'decreased' | 'increased' | 'no_function';

// Contradiction types
export type ContradictionType = 
  | 'enzyme_activity_mismatch'
  | 'internal_contradiction'
  | 'efficacy_direction_conflict';

// Biological claim types
export type BiologicalClaimType = 
  | 'enzyme_activity'
  | 'drug_efficacy'
  | 'metabolic_rate';

// Direction of biological effect
export type EffectDirection = 'increase' | 'decrease' | 'eliminate' | 'normal' | 'unknown';

// Represents a biological claim extracted from explanation text
export interface BiologicalClaim {
  type: BiologicalClaimType;
  subject: string; // e.g., "CYP2D6", "codeine efficacy"
  claim: string; // The actual claim text
  direction: EffectDirection;
  variantMentioned?: string; // rsID or STAR allele if mentioned
}

// Represents a detected contradiction
export interface Contradiction {
  type: ContradictionType;
  description: string;
  conflictingStatements: string[];
  severity: 'low' | 'medium' | 'high';
  affectedVariant?: string; // rsID or STAR allele
}

// Result of contradiction detection
export interface ContradictionDetectionResult {
  hasContradictions: boolean;
  contradictions: Contradiction[];
  claimsAnalyzed: number;
}

/**
 * ContradictionDetector service
 * Detects contradictions in LLM-generated explanations by analyzing biological claims
 * and comparing them against known variant functional status
 */
export class ContradictionDetector {
  private buildExplanationText(explanation: string | LLMExplanation): string {
    if (typeof explanation === 'string') {
      return explanation;
    }

    return [
      explanation.summary,
      explanation.biological_mechanism,
      explanation.variant_interpretation,
      explanation.clinical_impact
    ]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Extract biological claims from explanation text
   * Identifies enzyme activity claims, drug efficacy claims, and metabolic rate claims
   */
  extractBiologicalClaims(explanationText: string): BiologicalClaim[] {
    const claims: BiologicalClaim[] = [];
    
    // Keywords for detecting different types of claims
    const increaseKeywords = ['increase', 'increased', 'enhance', 'enhanced', 'higher', 'elevate', 'elevated'];
    const decreaseKeywords = ['decrease', 'decreased', 'reduce', 'reduced', 'lower', 'diminish', 'diminished', 'impair', 'impaired'];
    const eliminateKeywords = ['eliminate', 'eliminated', 'abolish', 'abolished', 'absent', 'no function', 'non-functional'];
    
    // Split into sentences for analysis
    const sentences = explanationText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      // Extract enzyme activity claims
      if (lowerSentence.includes('enzyme') || lowerSentence.includes('activity') || 
          lowerSentence.includes('cyp') || lowerSentence.includes('metabolism')) {
        
        let direction: EffectDirection = 'unknown';
        
        if (eliminateKeywords.some(kw => lowerSentence.includes(kw))) {
          direction = 'eliminate';
        } else if (increaseKeywords.some(kw => lowerSentence.includes(kw))) {
          direction = 'increase';
        } else if (decreaseKeywords.some(kw => lowerSentence.includes(kw))) {
          direction = 'decrease';
        }
        
        if (direction !== 'unknown') {
          // Try to extract gene/enzyme name
          const geneMatch = sentence.match(/CYP\d[A-Z]\d+|SLCO1B1|TPMT|DPYD/i);
          const subject = geneMatch ? geneMatch[0].toUpperCase() : 'enzyme';
          
          // Try to extract variant mention
          const rsMatch = sentence.match(/rs\d+/i);
          const starMatch = sentence.match(/\*\d+[A-Z]?/);
          const variantMentioned = rsMatch ? rsMatch[0] : (starMatch ? starMatch[0] : undefined);
          
          claims.push({
            type: 'enzyme_activity',
            subject,
            claim: sentence.trim(),
            direction,
            variantMentioned
          });
        }
      }
      
      // Extract drug efficacy claims
      if (lowerSentence.includes('efficacy') || lowerSentence.includes('effective') || 
          lowerSentence.includes('response')) {
        
        let direction: EffectDirection = 'unknown';
        
        if (increaseKeywords.some(kw => lowerSentence.includes(kw))) {
          direction = 'increase';
        } else if (decreaseKeywords.some(kw => lowerSentence.includes(kw))) {
          direction = 'decrease';
        }
        
        if (direction !== 'unknown') {
          // Try to extract drug name
          const drugMatch = sentence.match(/codeine|warfarin|clopidogrel|simvastatin|azathioprine|fluorouracil/i);
          const subject = drugMatch ? `${drugMatch[0]} efficacy` : 'drug efficacy';
          
          // Try to extract variant mention
          const rsMatch = sentence.match(/rs\d+/i);
          const starMatch = sentence.match(/\*\d+[A-Z]?/);
          const variantMentioned = rsMatch ? rsMatch[0] : (starMatch ? starMatch[0] : undefined);
          
          claims.push({
            type: 'drug_efficacy',
            subject,
            claim: sentence.trim(),
            direction,
            variantMentioned
          });
        }
      }
    }
    
    return claims;
  }

  /**
   * Check enzyme activity consistency
   * Validates that claims about enzyme activity align with known functional status
   */
  checkEnzymeActivityConsistency(
    claims: BiologicalClaim[],
    variants: DetectedVariant[]
  ): Contradiction[] {
    const contradictions: Contradiction[] = [];
    
    // Create a map of variants by rsID and star allele for quick lookup
    const variantMap = new Map<string, DetectedVariant>();
    for (const variant of variants) {
      if (variant.rsid) {
        variantMap.set(variant.rsid.toLowerCase(), variant);
      }
      if (variant.star_allele) {
        variantMap.set(variant.star_allele.toLowerCase(), variant);
      }
    }
    
    // Check each enzyme activity claim
    for (const claim of claims) {
      if (claim.type !== 'enzyme_activity') continue;
      
      // Find the variant this claim refers to
      let relevantVariant: DetectedVariant | undefined;
      
      if (claim.variantMentioned) {
        relevantVariant = variantMap.get(claim.variantMentioned.toLowerCase());
      }
      
      // If no specific variant mentioned, check if claim applies to any variant in the same gene
      if (!relevantVariant && claim.subject) {
        relevantVariant = variants.find(v => v.gene?.toUpperCase() === claim.subject.toUpperCase());
      }
      
      if (relevantVariant && relevantVariant.functionalStatus) {
        const status = relevantVariant.functionalStatus;
        const direction = claim.direction;
        
        // Check for contradictions
        if (status === 'no_function' && direction === 'increase') {
          contradictions.push({
            type: 'enzyme_activity_mismatch',
            description: `Claim states enzyme activity is increased, but variant ${relevantVariant.rsid || relevantVariant.star_allele} has no function`,
            conflictingStatements: [
              claim.claim,
              `Variant functional status: ${status}`
            ],
            severity: 'high',
            affectedVariant: relevantVariant.rsid || relevantVariant.star_allele
          });
        }
        
        if (status === 'decreased' && direction === 'increase') {
          contradictions.push({
            type: 'enzyme_activity_mismatch',
            description: `Claim states enzyme activity is increased, but variant ${relevantVariant.rsid || relevantVariant.star_allele} causes decreased function`,
            conflictingStatements: [
              claim.claim,
              `Variant functional status: ${status}`
            ],
            severity: 'medium',
            affectedVariant: relevantVariant.rsid || relevantVariant.star_allele
          });
        }
        
        if (status === 'increased' && (direction === 'decrease' || direction === 'eliminate')) {
          contradictions.push({
            type: 'enzyme_activity_mismatch',
            description: `Claim states enzyme activity is ${direction}d, but variant ${relevantVariant.rsid || relevantVariant.star_allele} causes increased function`,
            conflictingStatements: [
              claim.claim,
              `Variant functional status: ${status}`
            ],
            severity: 'medium',
            affectedVariant: relevantVariant.rsid || relevantVariant.star_allele
          });
        }
      }
    }
    
    return contradictions;
  }

  /**
   * Check internal consistency
   * Detects self-contradictions where the same variant is described with conflicting effects
   */
  checkInternalConsistency(claims: BiologicalClaim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    
    // Group claims by variant
    const claimsByVariant = new Map<string, BiologicalClaim[]>();
    
    for (const claim of claims) {
      if (claim.variantMentioned) {
        const key = claim.variantMentioned.toLowerCase();
        if (!claimsByVariant.has(key)) {
          claimsByVariant.set(key, []);
        }
        claimsByVariant.get(key)!.push(claim);
      }
    }
    
    // Check each variant's claims for contradictions
    for (const [variant, variantClaims] of claimsByVariant.entries()) {
      // Check for opposing directions
      const directions = variantClaims.map(c => c.direction);
      
      if (directions.includes('increase') && (directions.includes('decrease') || directions.includes('eliminate'))) {
        contradictions.push({
          type: 'internal_contradiction',
          description: `Variant ${variant} is described as both increasing and decreasing activity`,
          conflictingStatements: variantClaims.map(c => c.claim),
          severity: 'high',
          affectedVariant: variant
        });
      }
    }
    
    // Check for contradictory claims about the same subject (even without variant mention)
    const claimsBySubject = new Map<string, BiologicalClaim[]>();
    
    for (const claim of claims) {
      const key = claim.subject.toLowerCase();
      if (!claimsBySubject.has(key)) {
        claimsBySubject.set(key, []);
      }
      claimsBySubject.get(key)!.push(claim);
    }
    
    for (const [subject, subjectClaims] of claimsBySubject.entries()) {
      if (subjectClaims.length < 2) continue;
      
      const directions = subjectClaims.map(c => c.direction);
      
      // Only flag if there are clear opposing directions
      if (directions.includes('increase') && (directions.includes('decrease') || directions.includes('eliminate'))) {
        // Make sure these aren't already flagged by variant-specific check
        const hasVariantMention = subjectClaims.some(c => c.variantMentioned);
        if (!hasVariantMention) {
          contradictions.push({
            type: 'internal_contradiction',
            description: `${subject} is described with contradictory effects`,
            conflictingStatements: subjectClaims.map(c => c.claim),
            severity: 'medium'
          });
        }
      }
    }
    
    return contradictions;
  }

  /**
   * Main contradiction detection method
   * Orchestrates all contradiction checks and returns comprehensive results
   */
  detectContradictions(
    explanationText: string | LLMExplanation,
    variants: DetectedVariant[]
  ): ContradictionDetectionResult {
    const normalizedText = this.buildExplanationText(explanationText);

    logger.debug('Starting contradiction detection', {
      explanationLength: normalizedText.length,
      variantCount: variants.length
    });
    
    // Extract biological claims from the explanation
    const claims = this.extractBiologicalClaims(normalizedText);
    
    logger.debug('Biological claims extracted', {
      claimsFound: claims.length,
      claimTypes: claims.map(c => c.type)
    });
    
    // Run all contradiction checks
    const enzymeContradictions = this.checkEnzymeActivityConsistency(claims, variants);
    const internalContradictions = this.checkInternalConsistency(claims);
    
    // Combine all contradictions
    const allContradictions = [...enzymeContradictions, ...internalContradictions];
    
    if (allContradictions.length > 0) {
      logger.warn('Contradictions detected in explanation', {
        contradictionCount: allContradictions.length,
        contradictions: allContradictions.map(c => ({
          type: c.type,
          severity: c.severity,
          description: c.description,
          conflictingStatements: c.conflictingStatements
        }))
      });
    } else {
      logger.debug('No contradictions detected', {
        claimsAnalyzed: claims.length
      });
    }
    
    return {
      hasContradictions: allContradictions.length > 0,
      contradictions: allContradictions,
      claimsAnalyzed: claims.length
    };
  }
}
