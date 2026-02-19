import { VCFVariant, RoundTripResult } from '../types';
import logger from '../utils/logger';

export class VCFParser {
  /**
   * Parse VCF file content and extract variants
   * Handles invalid VCF format with detailed error messages
   */
  static parseVCF(content: string): VCFVariant[] {
    const lines = content.split('\n');
    const variants: VCFVariant[] = [];
    let parseErrors = 0;
    
    logger.info('Starting VCF parsing', { totalLines: lines.length });

    // Validate VCF format before parsing
    try {
      const validation = this.validateVCF(content);
      if (!validation.valid) {
        logger.error('Invalid VCF format detected', {
          error: validation.error,
          reason: 'VCF validation failed before parsing'
        });
        throw new Error(`Invalid VCF format: ${validation.error}`);
      }
    } catch (error) {
      logger.error('VCF validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.trimEnd();
      const lineNumber = i + 1;
      
      // Skip header lines and empty lines
      if (cleanLine.startsWith('#') || cleanLine.trim() === '') {
        continue;
      }

      try {
        const variant = this.parseLine(cleanLine);
        if (variant) {
          variants.push(variant);
        } else {
          logger.warn('Failed to parse VCF line - insufficient fields', {
            lineNumber,
            linePreview: line.substring(0, 100),
            reason: 'Line has fewer than 8 required fields',
            fieldCount: line.split('\t').length
          });
          parseErrors++;
        }
      } catch (error) {
        logger.error('VCF parsing error', {
          lineNumber,
          linePreview: line.substring(0, 100),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          fieldCount: line.split('\t').length
        });
        parseErrors++;
      }
    }

    logger.info('VCF parsing complete', {
      variantsParsed: variants.length,
      parseErrors,
      successRate: lines.length > 0 ? ((variants.length / (lines.length - parseErrors)) * 100).toFixed(2) + '%' : 'N/A'
    });
    
    return variants;
  }

  /**
   * Parse a single VCF line
   */
  private static parseLine(line: string): VCFVariant | null {
    const fields = line.split('\t');
    
    if (fields.length < 8) {
      return null;
    }

    const [chrom, pos, id, ref, alt, qual, filter, info] = fields;

    // Parse INFO field
    const infoObj = this.parseInfo(info);

    // Extract specific INFO tags
    const extractedTags = this.extractInfoTags(infoObj, parseInt(pos, 10));

    // Parse genotype if present
    let genotype: string | undefined;
    if (fields.length >= 10 && fields[8] && fields[9]) {
      genotype = this.parseGenotype(fields[8], fields[9]);
    }

    return {
      chromosome: chrom,
      position: parseInt(pos, 10),
      rsid: id === '.' ? '' : id,
      ref,
      alt,
      quality: qual === '.' ? 0 : parseFloat(qual),
      filter,
      info: infoObj,
      genotype,
      // Add extracted INFO tags
      gene: extractedTags.gene,
      starAllele: extractedTags.starAllele,
      rsIdentifier: extractedTags.rsIdentifier,
      cpicLevel: extractedTags.cpicLevel,
    };
  }

  /**
   * Parse INFO field into key-value pairs
   */
  private static parseInfo(info: string): Record<string, string> {
    const infoObj: Record<string, string> = {};
    
    const pairs = info.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        infoObj[key] = value || 'true';
      }
    }

    return infoObj;
  }

  /**
   * Extract specific INFO tags (GENE, STAR, RS, CPIC) from parsed INFO object
   * Handles multiple tag name variations
   */
  private static extractInfoTags(infoObj: Record<string, string>, position?: number): {
    gene?: string;
    starAllele?: string;
    rsIdentifier?: string;
    cpicLevel?: string;
  } {
    const extracted: {
      gene?: string;
      starAllele?: string;
      rsIdentifier?: string;
      cpicLevel?: string;
    } = {};

    const missingTags: string[] = [];

    // Extract GENE (handle GENE or GENEINFO variations)
    if (infoObj.GENE) {
      extracted.gene = infoObj.GENE;
    } else if (infoObj.GENEINFO) {
      extracted.gene = infoObj.GENEINFO;
    } else {
      missingTags.push('GENE/GENEINFO');
    }

    // Extract STAR allele (handle STAR or STAR_ALLELE variations)
    if (infoObj.STAR) {
      extracted.starAllele = infoObj.STAR;
    } else if (infoObj.STAR_ALLELE) {
      extracted.starAllele = infoObj.STAR_ALLELE;
    } else {
      missingTags.push('STAR/STAR_ALLELE');
    }

    // Extract RS identifier (handle RS or RSID variations)
    if (infoObj.RS) {
      extracted.rsIdentifier = infoObj.RS;
    } else if (infoObj.RSID) {
      extracted.rsIdentifier = infoObj.RSID;
    } else {
      missingTags.push('RS/RSID');
    }

    // Extract CPIC level (handle CPIC or CPIC_LEVEL variations)
    if (infoObj.CPIC) {
      extracted.cpicLevel = infoObj.CPIC;
    } else if (infoObj.CPIC_LEVEL) {
      extracted.cpicLevel = infoObj.CPIC_LEVEL;
    } else {
      missingTags.push('CPIC/CPIC_LEVEL');
    }

    // Log warning if any expected tags are missing
    if (missingTags.length > 0) {
      logger.debug('INFO tag extraction incomplete', {
        position,
        missingTags,
        availableTags: Object.keys(infoObj),
        extractedCount: Object.keys(extracted).length
      });
    }

    return extracted;
  }

  /**
   * Parse genotype from FORMAT and sample columns
   */
  private static parseGenotype(format: string, sample: string): string {
    const formatFields = format.split(':');
    const sampleFields = sample.split(':');
    
    const gtIndex = formatFields.indexOf('GT');
    if (gtIndex !== -1 && sampleFields[gtIndex]) {
      return sampleFields[gtIndex].trim();
    }

    return './.';
  }

  /**
   * Filter variants by pharmacogenomic genes
   */
  static filterPharmacogenomicVariants(variants: VCFVariant[]): VCFVariant[] {
    const pgxGenes = ['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD'];
    
    return variants.filter(variant => {
      const gene = variant.info.GENE || variant.info.GENEINFO;
      if (!gene) return false;
      
      return pgxGenes.some(pgxGene => 
        gene.toUpperCase().includes(pgxGene)
      );
    });
  }

  /**
   * Extract patient ID from VCF header
   */
  static extractPatientId(content: string): string {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const cleanLine = line.trimEnd();
      if (cleanLine.startsWith('##SAMPLE=')) {
        const match = cleanLine.match(/ID=([^,\s>]+)/);
        if (match) return match[1].trim();
      }
      if (cleanLine.startsWith('#CHROM')) {
        const fields = cleanLine.split('\t');
        if (fields.length >= 10) {
          return fields[9].trim(); // Sample column name
        }
      }
    }

    return `PATIENT_${Date.now()}`;
  }

  /**
   * Validate VCF format
   */
  static validateVCF(content: string): { valid: boolean; error?: string } {
    const lines = content.split('\n');
    
    // Check for VCF header
    if (!lines[0]?.startsWith('##fileformat=VCF')) {
      return { valid: false, error: 'Invalid VCF format: Missing fileformat header' };
    }

    // Check for column header
    const hasColumnHeader = lines.some(line => line.startsWith('#CHROM'));
    if (!hasColumnHeader) {
      return { valid: false, error: 'Invalid VCF format: Missing column header' };
    }

    // Check for at least one variant (but allow empty VCF for round-trip validation)
    const hasVariants = lines.some(line => 
      !line.startsWith('#') && line.trim() !== ''
    );
    if (!hasVariants) {
      // Empty VCF is technically valid, just has no data
      // Return valid but with a note
      return { valid: true };
    }

    return { valid: true };
  }
  /**
   * Serialize VCFVariant array back to VCF format string
   * Preserves header lines from original VCF and reconstructs variant lines
   */
  static serializeToVCF(variants: VCFVariant[], header: string): string {
    const lines: string[] = [];

    // Add header lines
    if (header) {
      lines.push(header.trim());
    }

    // Serialize each variant
    for (const variant of variants) {
      const variantLine = this.serializeVariant(variant);
      lines.push(variantLine);
    }

    return lines.join('\n');
  }

  /**
   * Serialize a single VCFVariant to VCF format line
   */
  private static serializeVariant(variant: VCFVariant): string {
    const fields: string[] = [];

    // CHROM
    fields.push(variant.chromosome);

    // POS
    fields.push(variant.position.toString());

    // ID (rsid)
    fields.push(variant.rsid || '.');

    // REF
    fields.push(variant.ref);

    // ALT
    fields.push(variant.alt);

    // QUAL
    fields.push(variant.quality === 0 ? '.' : variant.quality.toString());

    // FILTER
    fields.push(variant.filter);

    // INFO - reconstruct from parsed tags
    const infoString = this.reconstructInfoString(variant);
    fields.push(infoString);

    // FORMAT and sample (if genotype exists)
    if (variant.genotype) {
      fields.push('GT');
      fields.push(variant.genotype);
    }

    return fields.join('\t');
  }

  /**
   * Reconstruct INFO string from VCFVariant info object
   */
  private static reconstructInfoString(variant: VCFVariant): string {
    const infoPairs: string[] = [];

    // Reconstruct from info object
    for (const [key, value] of Object.entries(variant.info)) {
      if (value === 'true') {
        infoPairs.push(key);
      } else {
        infoPairs.push(`${key}=${value}`);
      }
    }

    return infoPairs.length > 0 ? infoPairs.join(';') : '.';
  }

  /**
   * Extract VCF header from content
   */
  static extractHeader(content: string): string {
    const lines = content.split('\n');
    const headerLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#')) {
        headerLines.push(line);
      } else if (line.trim() !== '') {
        // Stop at first variant line
        break;
      }
    }

    return headerLines.join('\n');
  }

  /**
   * Validate round-trip: parse, serialize, re-parse and compare
   * Ensures no data loss or corruption occurs during parsing/serialization
   * Handles round-trip validation failures with reduced confidence
   */
  static validateRoundTrip(content: string): RoundTripResult {
    const result: RoundTripResult = {
      success: true,
      originalVariantCount: 0,
      roundTripVariantCount: 0,
      infoTagsPreserved: true,
      qualityScoresPreserved: true,
      errors: []
    };

    try {
      // Parse original VCF content
      const originalVariants = this.parseVCF(content);
      result.originalVariantCount = originalVariants.length;

      logger.info(`Round-trip validation: parsed ${originalVariants.length} original variants`);

      // Extract header for serialization
      const header = this.extractHeader(content);

      // Serialize variants back to VCF format
      const serialized = this.serializeToVCF(originalVariants, header);

      // Parse the serialized content
      const roundTripVariants = this.parseVCF(serialized);
      result.roundTripVariantCount = roundTripVariants.length;

      logger.info(`Round-trip validation: parsed ${roundTripVariants.length} round-trip variants`);

      // Compare variant counts
      if (originalVariants.length !== roundTripVariants.length) {
        result.success = false;
        result.errors.push(
          `Variant count mismatch: original ${originalVariants.length} vs round-trip ${roundTripVariants.length}`
        );
        logger.warn('Round-trip validation: variant count mismatch detected', {
          original: originalVariants.length,
          roundTrip: roundTripVariants.length,
          impact: 'Confidence score will be reduced'
        });
      }

      // Compare each variant in detail
      const minLength = Math.min(originalVariants.length, roundTripVariants.length);
      for (let i = 0; i < minLength; i++) {
        const orig = originalVariants[i];
        const rt = roundTripVariants[i];

        // Check core fields
        if (orig.chromosome !== rt.chromosome) {
          result.success = false;
          result.errors.push(
            `Chromosome mismatch at index ${i}: "${orig.chromosome}" vs "${rt.chromosome}"`
          );
        }

        if (orig.position !== rt.position) {
          result.success = false;
          result.errors.push(
            `Position mismatch at index ${i}: ${orig.position} vs ${rt.position}`
          );
        }

        if (orig.ref !== rt.ref) {
          result.success = false;
          result.errors.push(
            `Reference allele mismatch at index ${i}: "${orig.ref}" vs "${rt.ref}"`
          );
        }

        if (orig.alt !== rt.alt) {
          result.success = false;
          result.errors.push(
            `Alternate allele mismatch at index ${i}: "${orig.alt}" vs "${rt.alt}"`
          );
        }

        // Check quality scores (allow small floating point differences)
        if (Math.abs(orig.quality - rt.quality) > 0.01) {
          result.qualityScoresPreserved = false;
          result.errors.push(
            `Quality score mismatch at position ${orig.position}: ${orig.quality} vs ${rt.quality}`
          );
        }

        // Check INFO tags preservation
        if (!this.compareInfoTags(orig.info, rt.info)) {
          result.infoTagsPreserved = false;
          result.errors.push(
            `INFO tags differ at position ${orig.position}`
          );
        }

        // Check extracted INFO fields
        if (orig.gene !== rt.gene) {
          result.infoTagsPreserved = false;
          result.errors.push(
            `GENE tag mismatch at position ${orig.position}: "${orig.gene}" vs "${rt.gene}"`
          );
        }

        if (orig.starAllele !== rt.starAllele) {
          result.infoTagsPreserved = false;
          result.errors.push(
            `STAR allele mismatch at position ${orig.position}: "${orig.starAllele}" vs "${rt.starAllele}"`
          );
        }

        if (orig.rsIdentifier !== rt.rsIdentifier) {
          result.infoTagsPreserved = false;
          result.errors.push(
            `RS identifier mismatch at position ${orig.position}: "${orig.rsIdentifier}" vs "${rt.rsIdentifier}"`
          );
        }

        if (orig.cpicLevel !== rt.cpicLevel) {
          result.infoTagsPreserved = false;
          result.errors.push(
            `CPIC level mismatch at position ${orig.position}: "${orig.cpicLevel}" vs "${rt.cpicLevel}"`
          );
        }

        // Check genotype if present
        if (orig.genotype !== rt.genotype) {
          result.success = false;
          result.errors.push(
            `Genotype mismatch at position ${orig.position}: "${orig.genotype}" vs "${rt.genotype}"`
          );
        }
      }

      // Update overall success based on all checks
      result.success = result.success && 
                       result.infoTagsPreserved && 
                       result.qualityScoresPreserved;

      if (result.success) {
        logger.info('Round-trip validation: PASSED');
      } else {
        logger.warn(`Round-trip validation: FAILED with ${result.errors.length} errors`);
      }

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Round-trip validation failed with exception: ${errorMessage}`);
      logger.error('Round-trip validation exception:', error);
    }

    return result;
  }

  /**
   * Compare two INFO tag objects for equality
   */
  private static compareInfoTags(
    info1: Record<string, string>,
    info2: Record<string, string>
  ): boolean {
    const keys1 = Object.keys(info1).sort();
    const keys2 = Object.keys(info2).sort();

    // Check if same number of keys
    if (keys1.length !== keys2.length) {
      return false;
    }

    // Check if all keys match
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }

    // Check if all values match
    for (const key of keys1) {
      if (info1[key] !== info2[key]) {
        return false;
      }
    }

    return true;
  }
}
