import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMExplanation, DetectedVariant, Phenotype } from '../types';
import logger from '../utils/logger';

type LLMProvider = 'gemini' | 'grok';

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class LLMService {
  private provider: LLMProvider;
  private genAI?: GoogleGenerativeAI;
  private model?: any;
  private grokApiKey?: string;
  private grokModel: string = 'grok-3';

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as LLMProvider) || 'gemini';
    
    if (this.provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
      });
      logger.info('LLM Service initialized with Gemini provider');
    } else if (this.provider === 'grok') {
      this.grokApiKey = process.env.GROK_API_KEY;
      if (!this.grokApiKey) {
        throw new Error('GROK_API_KEY environment variable is required');
      }
      this.grokModel = process.env.GROK_MODEL || 'grok-beta';
      logger.info('LLM Service initialized with Grok provider', { model: this.grokModel });
    } else {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Generate clinical explanation using LLM (Gemini or Grok)
   * Handles LLM API failures with retry and fallback
   */
  async generateExplanation(
    drug: string,
    gene: string,
    diplotype: string,
    phenotype: Phenotype,
    variants: DetectedVariant[],
    recommendation: string
  ): Promise<LLMExplanation> {
    const result = await this.generateExplanationWithMetadata(
      drug,
      gene,
      diplotype,
      phenotype,
      variants,
      recommendation
    );
    return result.explanation;
  }

  /**
   * Generate explanation with metadata for metrics
   */
  async generateExplanationWithMetadata(
    drug: string,
    gene: string,
    diplotype: string,
    phenotype: Phenotype,
    variants: DetectedVariant[],
    recommendation: string
  ): Promise<{
    explanation: LLMExplanation;
    usedFallback: boolean;
    succeeded: boolean;
    attempts: number;
    provider: LLMProvider;
  }> {
    logger.info(`Generating LLM explanation for ${drug}-${gene}`, { provider: this.provider });

    const prompt = this.buildPrompt(drug, gene, diplotype, phenotype, variants, recommendation);

    // Retry configuration
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    let attempts = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attempts = attempt;
      try {
        let content: string;

        if (this.provider === 'gemini') {
          const result = await this.model!.generateContent(prompt);
          const response = await result.response;
          content = response.text();
        } else if (this.provider === 'grok') {
          content = await this.callGrokAPI(prompt);
        } else {
          throw new Error(`Unsupported provider: ${this.provider}`);
        }

        if (!content) {
          logger.error('LLM API returned empty response', {
            drug,
            gene,
            phenotype,
            variantCount: variants.length,
            attempt,
            maxRetries,
            provider: this.provider
          });
          throw new Error('No response from LLM');
        }

        logger.info('LLM explanation generated successfully', {
          drug,
          gene,
          phenotype,
          responseLength: content.length,
          variantsCited: variants.length,
          attempt,
          provider: this.provider
        });

        return {
          explanation: this.parseResponse(content),
          usedFallback: false,
          succeeded: true,
          attempts,
          provider: this.provider
        };
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        logger.error(`LLM generation failed (attempt ${attempt}/${maxRetries})`, {
          drug,
          gene,
          phenotype,
          variantCount: variants.length,
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          willRetry: !isLastAttempt,
          provider: this.provider
        });

        if (isLastAttempt) {
          // All retries exhausted - use fallback
          logger.warn('All LLM retry attempts exhausted - using fallback explanation', {
            drug,
            gene,
            phenotype,
            totalAttempts: maxRetries,
            provider: this.provider
          });
          return {
            explanation: this.getEnhancedFallbackExplanation(drug, gene, phenotype, variants),
            usedFallback: true,
            succeeded: false,
            attempts,
            provider: this.provider
          };
        }

        // Exponential backoff before retry
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.info(`Retrying LLM API call after ${delay}ms delay`, {
          attempt,
          maxRetries,
          delay,
          provider: this.provider
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Fallback (should never reach here due to loop logic, but TypeScript needs it)
    const functionalStatuses = variants
      .map(v => v.functionalStatus)
      .filter((status): status is NonNullable<typeof status> => Boolean(status));
    const uniqueStatuses = Array.from(new Set(functionalStatuses));

    return {
      explanation: this.getEnhancedFallbackExplanation(drug, gene, phenotype, variants),
      usedFallback: true,
      succeeded: false,
      attempts,
      provider: this.provider
    };
  }

  /**
   * Call Grok API (xAI) for content generation
   */
  private async callGrokAPI(prompt: string): Promise<string> {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.grokApiKey}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a clinical pharmacogenomics expert providing detailed medical explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.grokModel,
        stream: false,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as GrokResponse;
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Grok API');
    }

    return data.choices[0].message.content;
  }

  /**
   * Build enhanced prompt for LLM with detailed variant citations
   */
  private buildPrompt(
      drug: string,
      gene: string,
      diplotype: string,
      phenotype: Phenotype,
      variants: DetectedVariant[],
      recommendation: string
    ): string {
      // Build detailed variant citations
      const variantCitations = variants.map(v => {
        const parts = [];
        if (v.rsid) parts.push(`rsID: ${v.rsid}`);
        if (v.star_allele) parts.push(`STAR allele: ${v.star_allele}`);
        if (v.gene) parts.push(`Gene: ${v.gene}`);
        if (v.evidenceLevel) parts.push(`Evidence Level: ${v.evidenceLevel}`);
        if (v.functionalStatus) parts.push(`Functional Status: ${v.functionalStatus}`);
        return parts.join(', ');
      }).join('\n  - ');

      const variantList = variants.map(v => 
        `${v.rsid} (${v.star_allele || 'unknown'})`
      ).join(', ');

      return `You are a clinical pharmacogenomics expert. Generate a clinical pharmacogenomics explanation for the following case:

  **Drug:** ${drug}
  **Gene:** ${gene}
  **Diplotype:** ${diplotype}
  **Phenotype:** ${phenotype}
  **Detected Variants:**
    - ${variantCitations || 'None'}
  **Clinical Recommendation:** ${recommendation}

  **CRITICAL REQUIREMENTS:**
  1. You MUST cite ALL detected variants by their rsID and/or STAR allele in your explanation
  2. Your explanation MUST NOT contain any self-contradictions or conflicting statements
  3. Your explanation MUST align with CPIC guidelines and the provided phenotype
  4. You MUST describe the biological mechanism of how ${gene} affects ${drug}

  **VALIDATION CHECKLIST:**
  - [ ] All variants (${variantList}) are cited in the explanation
  - [ ] No contradictory statements about enzyme activity or drug efficacy
  - [ ] Functional status claims align with the provided data
  - [ ] Biological mechanism is clearly described

  Please provide a structured explanation with the following sections:

  1. **Summary** (2-3 sentences): Brief overview of the pharmacogenomic finding and its clinical significance.
     - Must mention the ${phenotype} phenotype
     - Must reference key variants by rsID or STAR allele

  2. **Biological Mechanism** (3-4 sentences): Explain how ${gene} affects ${drug} metabolism/transport.
     - Describe the enzymatic pathway and protein function
     - Explain how the detected variants alter this mechanism
     - Connect variant functional status to biological impact

  3. **Variant Interpretation** (2-3 sentences): Explain the specific variants detected.
     - Cite each variant by rsID and/or STAR allele: ${variantList}
     - Describe their functional impact (${variants.map(v => v.functionalStatus).filter(Boolean).join(', ')})
     - Explain how they contribute to the ${phenotype} phenotype

  4. **Clinical Impact** (2-3 sentences): Describe the practical implications for patient care.
     - Expected drug response based on phenotype
     - Why the recommendation is appropriate
     - Specific clinical considerations

  Use clear medical terminology but ensure explanations are understandable. 
  Format your response with clear section headers using **bold** markdown.`;
    }



  /**
   * Parse LLM response into structured format
   */
  private parseResponse(content: string): LLMExplanation {
    // Extract sections using regex or simple parsing
    const sections = {
      summary: '',
      biological_mechanism: '',
      variant_interpretation: '',
      clinical_impact: ''
    };

    // Try to extract sections
    const summaryMatch = content.match(/\*\*Summary\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i);
    const mechanismMatch = content.match(/\*\*Biological Mechanism\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i);
    const variantMatch = content.match(/\*\*Variant Interpretation\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i);
    const impactMatch = content.match(/\*\*Clinical Impact\*\*[:\s]*([\s\S]*?)(?=\*\*|$)/i);

    sections.summary = summaryMatch ? summaryMatch[1].trim() : '';
    sections.biological_mechanism = mechanismMatch ? mechanismMatch[1].trim() : '';
    sections.variant_interpretation = variantMatch ? variantMatch[1].trim() : '';
    sections.clinical_impact = impactMatch ? impactMatch[1].trim() : '';

    // If parsing failed, try to split by numbered sections
    if (!sections.summary) {
      const parts = content.split(/\d+\.\s+\*\*/).filter(p => p.trim());
      if (parts.length >= 4) {
        sections.summary = parts[0].replace(/\*\*/g, '').trim();
        sections.biological_mechanism = parts[1].replace(/\*\*/g, '').trim();
        sections.variant_interpretation = parts[2].replace(/\*\*/g, '').trim();
        sections.clinical_impact = parts[3].replace(/\*\*/g, '').trim();
      } else {
        // Fallback: use entire content as summary
        sections.summary = content.trim();
      }
    }

    return sections;
  }

  /**
   * Validate explanation for variant citation completeness
   */
  validateExplanation(explanation: LLMExplanation, variants: DetectedVariant[]): {
    allRsidsCited: boolean;
    allStarAllelesCited: boolean;
    allGenesCited: boolean;
    citationCompleteness: number;
    missingCitations: string[];
  } {
    const fullText = `${explanation.summary} ${explanation.biological_mechanism} ${explanation.variant_interpretation} ${explanation.clinical_impact}`.toLowerCase();
    
    const missingCitations: string[] = [];
    let citedCount = 0;
    let totalExpected = 0;

    // Check rsID citations
    const rsidsCited = variants.every(v => {
      if (v.rsid) {
        totalExpected++;
        const cited = fullText.includes(v.rsid.toLowerCase());
        if (cited) citedCount++;
        else missingCitations.push(v.rsid);
        return cited;
      }
      return true;
    });

    // Check STAR allele citations
    const starAllelesCited = variants.every(v => {
      if (v.star_allele) {
        totalExpected++;
        const cited = fullText.includes(v.star_allele.toLowerCase());
        if (cited) citedCount++;
        else missingCitations.push(v.star_allele);
        return cited;
      }
      return true;
    });

    // Check gene citations
    const genesCited = variants.every(v => {
      if (v.gene) {
        totalExpected++;
        const cited = fullText.includes(v.gene.toLowerCase());
        if (cited) citedCount++;
        else missingCitations.push(v.gene);
        return cited;
      }
      return true;
    });

    const citationCompleteness = totalExpected > 0 ? citedCount / totalExpected : 1.0;

    return {
      allRsidsCited: rsidsCited,
      allStarAllelesCited: starAllelesCited,
      allGenesCited: genesCited,
      citationCompleteness,
      missingCitations
    };
  }

  /**
   * Enhanced fallback explanation when LLM fails - includes variant details
   */
  getEnhancedFallbackExplanation(
    drug: string, 
    gene: string, 
    phenotype: Phenotype,
    variants: DetectedVariant[] = []
  ): LLMExplanation {
    const phenotypeDescriptions: Record<Phenotype, string> = {
      'PM': 'poor metabolizer with significantly reduced or absent enzyme activity',
      'IM': 'intermediate metabolizer with reduced enzyme activity',
      'NM': 'normal metabolizer with typical enzyme activity',
      'RM': 'rapid metabolizer with increased enzyme activity',
      'URM': 'ultra-rapid metabolizer with significantly increased enzyme activity',
      'Unknown': 'metabolizer with uncertain enzyme activity'
    };

    const isNormal = phenotype === 'NM';
    const isReduced = phenotype === 'PM' || phenotype === 'IM';
    const uniqueStatuses = Array.from(
      new Set(
        variants
          .map(v => v.functionalStatus)
          .filter((status): status is string => Boolean(status))
      )
    );

    // Build variant citations for fallback
    const variantCitations = variants.length > 0
      ? variants.map(v => {
          const parts = [];
          if (v.rsid) parts.push(v.rsid);
          if (v.star_allele) parts.push(v.star_allele);
          if (v.gene) parts.push(`in ${v.gene}`);
          return parts.join(' ');
        }).join(', ')
      : 'No specific variants';

    return {
      summary: `The patient is a ${phenotypeDescriptions[phenotype]} for ${gene}, which affects ${drug} metabolism. ${
        variants.length > 0 
          ? `Detected variants include ${variantCitations}. ` 
          : ''
      }${
        isNormal 
          ? 'Standard dosing is appropriate as normal enzyme function is expected.' 
          : 'Genetic variants in ' + gene + ' alter enzyme function, which may require dosage adjustments or alternative therapy.'
      }`,
      
      biological_mechanism: `${gene} encodes an enzyme critical for ${drug} metabolism. ${
        isNormal
          ? 'The patient has normal enzyme activity, allowing for typical drug metabolism and response.'
          : 'Genetic variants can reduce, eliminate, or increase enzyme activity, directly impacting drug efficacy and safety. The ' + phenotype + ' phenotype indicates altered metabolic capacity compared to normal metabolizers.'
      } ${
        variants.length > 0 && uniqueStatuses.length > 0
          ? `The detected variants (${variantCitations}) show ${uniqueStatuses.join(', ')} functional status, contributing to the observed phenotype.`
          : ''
      }`,
      
      variant_interpretation: `${
        variants.length > 0
          ? `The following variants were detected: ${variantCitations}. These variants contribute to the ${phenotype} phenotype. ` +
            (uniqueStatuses.length > 0
              ? `Functional analysis indicates ${uniqueStatuses.join(', ')} activity. `
              : '') +
            `These genetic changes affect enzyme expression, stability, or catalytic activity, resulting in altered ${drug} metabolism.`
          : `No clinically significant variants were detected. The patient carries wild-type alleles, resulting in normal enzyme function and the ${phenotype} phenotype.`
      }`,
      
      clinical_impact: `${
        isNormal
          ? 'The ' + phenotype + ' phenotype indicates standard drug response is expected. No dosage adjustments are necessary based on this genetic result.'
          : 'The ' + phenotype + ' phenotype has significant clinical implications for ' + drug + ' therapy. ' + (
              isReduced 
                ? 'Reduced enzyme activity may lead to increased drug exposure and risk of adverse effects. Dose reduction or alternative therapy may be needed.'
                : 'Increased enzyme activity may lead to reduced drug efficacy. Higher doses or alternative therapy may be needed.'
            )
      } ${
        variants.length > 0 && variants.some(v => v.evidenceLevel)
          ? `These recommendations are supported by CPIC evidence level ${variants.find(v => v.evidenceLevel)?.evidenceLevel} guidelines.`
          : ''
      }`
    };
  }

  /**
   * Generate batch explanations for multiple drugs
   */
  async generateBatchExplanations(
    analyses: Array<{
      drug: string;
      gene: string;
      diplotype: string;
      phenotype: Phenotype;
      variants: DetectedVariant[];
      recommendation: string;
    }>
  ): Promise<LLMExplanation[]> {
    const promises = analyses.map(analysis =>
      this.generateExplanation(
        analysis.drug,
        analysis.gene,
        analysis.diplotype,
        analysis.phenotype,
        analysis.variants,
        analysis.recommendation
      )
    );

    return Promise.all(promises);
  }
}
