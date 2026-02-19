import { VCFParser } from './vcfParser';

describe('VCFParser - INFO Tag Extraction', () => {
  describe('extractInfoTags', () => {
    it('should extract GENE tag from INFO field', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBe('CYP2D6');
    });

    it('should extract GENEINFO tag as gene', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENEINFO=CYP2D6;STAR=*4`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBe('CYP2D6');
    });

    it('should extract STAR tag from INFO field', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].starAllele).toBe('*4');
    });

    it('should extract STAR_ALLELE tag as starAllele', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR_ALLELE=*4`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].starAllele).toBe('*4');
    });

    it('should extract RS tag from INFO field', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].rsIdentifier).toBe('rs3892097');
    });

    it('should extract RSID tag as rsIdentifier', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;RSID=rs3892097`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].rsIdentifier).toBe('rs3892097');
    });

    it('should extract CPIC tag from INFO field', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;CPIC=A`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].cpicLevel).toBe('A');
    });

    it('should extract CPIC_LEVEL tag as cpicLevel', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;CPIC_LEVEL=A`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].cpicLevel).toBe('A');
    });

    it('should extract all INFO tags when present', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].starAllele).toBe('*4');
      expect(variants[0].rsIdentifier).toBe('rs3892097');
      expect(variants[0].cpicLevel).toBe('A');
    });

    it('should handle missing INFO tags gracefully', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tDP=100;AF=0.5`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBeUndefined();
      expect(variants[0].starAllele).toBeUndefined();
      expect(variants[0].rsIdentifier).toBeUndefined();
      expect(variants[0].cpicLevel).toBeUndefined();
    });

    it('should handle multiple variants with different INFO tags', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244285;CPIC=A
10\t94842866\trs4986893\tG\tA\t38.5\tPASS\tGENE=CYP2C19;STAR=*3;RS=rs4986893;CPIC=B`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(3);
      
      // First variant
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].starAllele).toBe('*4');
      expect(variants[0].rsIdentifier).toBe('rs3892097');
      expect(variants[0].cpicLevel).toBe('A');
      
      // Second variant
      expect(variants[1].gene).toBe('CYP2C19');
      expect(variants[1].starAllele).toBe('*2');
      expect(variants[1].rsIdentifier).toBe('rs4244285');
      expect(variants[1].cpicLevel).toBe('A');
      
      // Third variant
      expect(variants[2].gene).toBe('CYP2C19');
      expect(variants[2].starAllele).toBe('*3');
      expect(variants[2].rsIdentifier).toBe('rs4986893');
      expect(variants[2].cpicLevel).toBe('B');
    });

    it('should preserve existing INFO object while extracting tags', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;DP=100;AF=0.5`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].info).toEqual({
        GENE: 'CYP2D6',
        STAR: '*4',
        DP: '100',
        AF: '0.5'
      });
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].starAllele).toBe('*4');
    });
  });

  describe('Existing functionality', () => {
    it('should parse basic VCF fields correctly', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].chromosome).toBe('22');
      expect(variants[0].position).toBe(42130692);
      expect(variants[0].rsid).toBe('rs3892097');
      expect(variants[0].ref).toBe('C');
      expect(variants[0].alt).toBe('T');
      expect(variants[0].quality).toBe(35.2);
      expect(variants[0].filter).toBe('PASS');
    });
  });

  describe('VCF v4.2 Format Parsing', () => {
    it('should parse VCF v4.2 files with various INFO tag formats', () => {
      const vcfContent = `##fileformat=VCFv4.2
##reference=GRCh38
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">
##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">
##INFO=<ID=RS,Number=1,Type=String,Description="rsID">
##INFO=<ID=CPIC,Number=1,Type=String,Description="CPIC level">
##INFO=<ID=DP,Number=1,Type=Integer,Description="Read depth">
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele frequency">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A;DP=100;AF=0.5
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENEINFO=CYP2C19;STAR_ALLELE=*2;RSID=rs4244285;CPIC_LEVEL=A
1\t97450058\trs1799853\tC\tT\t28.3\tPASS\tGENE=CYP2C9;DP=150`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(3);
      
      // First variant - standard tag names
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].starAllele).toBe('*4');
      expect(variants[0].rsIdentifier).toBe('rs3892097');
      expect(variants[0].cpicLevel).toBe('A');
      expect(variants[0].info.DP).toBe('100');
      expect(variants[0].info.AF).toBe('0.5');
      
      // Second variant - alternative tag names
      expect(variants[1].gene).toBe('CYP2C19');
      expect(variants[1].starAllele).toBe('*2');
      expect(variants[1].rsIdentifier).toBe('rs4244285');
      expect(variants[1].cpicLevel).toBe('A');
      
      // Third variant - partial tags
      expect(variants[2].gene).toBe('CYP2C9');
      expect(variants[2].starAllele).toBeUndefined();
      expect(variants[2].rsIdentifier).toBeUndefined();
      expect(variants[2].cpicLevel).toBeUndefined();
      expect(variants[2].info.DP).toBe('150');
    });

    it('should parse VCF v4.2 with complex INFO annotations', () => {
      const vcfContent = `##fileformat=VCFv4.2
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene">
##INFO=<ID=CLNSIG,Number=.,Type=String,Description="Clinical significance">
##INFO=<ID=CLNDN,Number=.,Type=String,Description="Disease name">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;CLNSIG=Pathogenic;CLNDN=Drug_metabolism`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].info.CLNSIG).toBe('Pathogenic');
      expect(variants[0].info.CLNDN).toBe('Drug_metabolism');
    });
  });

  describe('Serialization', () => {
    it('should serialize variants with complete INFO tags', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A`;

      const variants = VCFParser.parseVCF(vcfContent);
      const header = VCFParser.extractHeader(vcfContent);
      const serialized = VCFParser.serializeToVCF(variants, header);
      
      expect(serialized).toContain('GENE=CYP2D6');
      expect(serialized).toContain('STAR=*4');
      expect(serialized).toContain('RS=rs3892097');
      expect(serialized).toContain('CPIC=A');
    });

    it('should serialize variants with partial INFO tags', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;DP=100`;

      const variants = VCFParser.parseVCF(vcfContent);
      const header = VCFParser.extractHeader(vcfContent);
      const serialized = VCFParser.serializeToVCF(variants, header);
      
      expect(serialized).toContain('GENE=CYP2D6');
      expect(serialized).toContain('DP=100');
      expect(serialized).not.toContain('STAR=');
      expect(serialized).not.toContain('RS=');
    });

    it('should serialize variants with missing quality scores', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6`;

      const variants = VCFParser.parseVCF(vcfContent);
      const header = VCFParser.extractHeader(vcfContent);
      const serialized = VCFParser.serializeToVCF(variants, header);
      
      const lines = serialized.split('\n');
      const variantLine = lines.find(l => !l.startsWith('#') && l.trim() !== '');
      expect(variantLine).toContain('\t.\t'); // Quality field should be '.'
    });
  });

  describe('Round-Trip Validation', () => {
    it('should validate round-trip for multiple variants', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244285;CPIC=A`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      expect(result.originalVariantCount).toBe(2);
      expect(result.roundTripVariantCount).toBe(2);
      expect(result.infoTagsPreserved).toBe(true);
      expect(result.qualityScoresPreserved).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should preserve INFO tags through round-trip', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A;DP=100;AF=0.5`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      expect(result.infoTagsPreserved).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should preserve quality scores through round-trip', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19
1\t97450058\trs1799853\tC\tT\t28.3\tPASS\tGENE=CYP2C9`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      expect(result.qualityScoresPreserved).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should preserve core fields through round-trip', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      
      // Verify by parsing again and checking fields
      const variants = VCFParser.parseVCF(vcfContent);
      expect(variants[0].chromosome).toBe('22');
      expect(variants[0].position).toBe(42130692);
      expect(variants[0].ref).toBe('C');
      expect(variants[0].alt).toBe('T');
    });

    it('should handle VCF with genotype information', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE1
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4\tGT\t0/1`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle VCF with missing quality scores', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      expect(result.qualityScoresPreserved).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty VCF (no variants)', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO`;

      const result = VCFParser.validateRoundTrip(vcfContent);
      
      expect(result.success).toBe(true);
      expect(result.originalVariantCount).toBe(0);
      expect(result.roundTripVariantCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Malformed VCF Input Error Handling', () => {
    it('should handle malformed VCF line gracefully', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6
MALFORMED_LINE_WITH_INSUFFICIENT_FIELDS
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      // Should parse valid lines and skip malformed line
      expect(variants).toHaveLength(2);
      expect(variants[0].chromosome).toBe('22');
      expect(variants[1].chromosome).toBe('10');
    });

    it('should handle VCF with invalid position values', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\tINVALID\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      // Should skip line with invalid position
      expect(variants.length).toBeGreaterThanOrEqual(1);
      expect(variants[variants.length - 1].chromosome).toBe('10');
    });

    it('should handle VCF with invalid quality scores', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\tINVALID\tPASS\tGENE=CYP2D6
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      // Should parse both lines, treating invalid quality as NaN or 0
      expect(variants.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle VCF with malformed INFO field', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;INVALID_TAG_NO_VALUE=;STAR=*4
10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(2);
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].starAllele).toBe('*4');
    });

    it('should handle empty INFO field', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\t.`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBeUndefined();
      expect(variants[0].info).toEqual({ '.': 'true' });
    });

    it('should handle VCF with only header lines', () => {
      const vcfContent = `##fileformat=VCFv4.2
##reference=GRCh38
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(0);
    });

    it('should handle VCF with blank lines', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO

22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6

10\t94781859\trs4244285\tG\tA\t42.8\tPASS\tGENE=CYP2C19

`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(2);
    });

    it('should handle VCF with special characters in INFO values', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;NOTE=Test_with_underscore;DESC=Test%20with%20percent`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].gene).toBe('CYP2D6');
      expect(variants[0].info.NOTE).toBe('Test_with_underscore');
      expect(variants[0].info.DESC).toBe('Test%20with%20percent');
    });
  });

  describe('Edge Cases', () => {
    it('should handle VCF with multiple alleles', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT,G\t35.2\tPASS\tGENE=CYP2D6;STAR=*4`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].alt).toBe('T,G');
      expect(variants[0].gene).toBe('CYP2D6');
    });

    it('should handle VCF with long reference alleles', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tCATGATGATG\tC\t35.2\tPASS\tGENE=CYP2D6;STAR=*4`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].ref).toBe('CATGATGATG');
      expect(variants[0].alt).toBe('C');
    });

    it('should handle VCF with chromosome names including chr prefix', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4
chrX\t123456\trs123\tA\tG\t40.0\tPASS\tGENE=TPMT`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(2);
      expect(variants[0].chromosome).toBe('chr22');
      expect(variants[1].chromosome).toBe('chrX');
    });

    it('should handle VCF with very high quality scores', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t9999.99\tPASS\tGENE=CYP2D6`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].quality).toBe(9999.99);
    });

    it('should handle VCF with zero quality score', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t0\tPASS\tGENE=CYP2D6`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].quality).toBe(0);
    });

    it('should handle VCF with FILTER values other than PASS', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tLowQual\tGENE=CYP2D6
10\t94781859\trs4244285\tG\tA\t42.8\tFAIL\tGENE=CYP2C19`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(2);
      expect(variants[0].filter).toBe('LowQual');
      expect(variants[1].filter).toBe('FAIL');
    });

    it('should handle VCF with no rsID (dot in ID field)', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\t.\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4`;

      const variants = VCFParser.parseVCF(vcfContent);
      
      expect(variants).toHaveLength(1);
      expect(variants[0].rsid).toBe('');
    });

    it('should preserve order of INFO tags during round-trip', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;CPIC=A;DP=100;AF=0.5`;

      const variants = VCFParser.parseVCF(vcfContent);
      const header = VCFParser.extractHeader(vcfContent);
      const serialized = VCFParser.serializeToVCF(variants, header);
      const roundTripVariants = VCFParser.parseVCF(serialized);
      
      // All INFO tags should be preserved
      expect(roundTripVariants[0].info).toEqual(variants[0].info);
    });
  });

  describe('VCF Validation', () => {
    it('should validate correct VCF format', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6`;

      const result = VCFParser.validateVCF(vcfContent);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject VCF without fileformat header', () => {
      const vcfContent = `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6`;

      const result = VCFParser.validateVCF(vcfContent);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('fileformat');
    });

    it('should reject VCF without column header', () => {
      const vcfContent = `##fileformat=VCFv4.2
22\t42130692\trs3892097\tC\tT\t35.2\tPASS\tGENE=CYP2D6`;

      const result = VCFParser.validateVCF(vcfContent);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('column header');
    });

    it('should accept VCF with no variants (empty VCF is valid)', () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO`;

      const result = VCFParser.validateVCF(vcfContent);
      
      expect(result.valid).toBe(true);
      // Empty VCF is technically valid, just has no data
    });
  });
});
