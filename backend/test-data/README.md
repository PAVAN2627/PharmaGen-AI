# Test VCF Files for PharmaGenAI Quality Improvements

This directory contains test VCF files and their expected outcomes for validating the PharmaGenAI pharmacogenomic analysis system.

## Overview

Each test VCF file is accompanied by a `.expected.json` file that documents the expected analysis outcomes. These files are used to validate:

- VCF parsing accuracy
- Variant detection and matching
- Quality metrics calculation
- Confidence score computation
- Detection state classification

## Test Files

### Gene-Specific Test Files

These files contain variants for a single pharmacogenomic gene:

1. **test-cyp2d6-variants.vcf**
   - Contains 3 CYP2D6 variants (rs3892097, rs1065852, rs28371725)
   - All variants are Evidence Level A
   - Tests codeine, tramadol, and tamoxifen metabolism

2. **test-cyp2c19-variants.vcf**
   - Contains 3 CYP2C19 variants (rs4244285, rs4986893, rs12248560)
   - All variants are Evidence Level A
   - Tests clopidogrel, voriconazole, and sertraline metabolism

3. **test-cyp2c9-variants.vcf**
   - Contains 2 CYP2C9 variants (rs1799853, rs1057910)
   - All variants are Evidence Level A
   - Tests warfarin, phenytoin, and celecoxib metabolism

4. **test-slco1b1-variants.vcf**
   - Contains 2 SLCO1B1 variants (rs4149056, rs2306283)
   - Mixed evidence levels (A and B)
   - Tests simvastatin, atorvastatin, and pravastatin transport

5. **test-tpmt-variants.vcf**
   - Contains 3 TPMT variants (rs1800462, rs1800460, rs1142345)
   - All variants are Evidence Level A
   - Tests azathioprine, mercaptopurine, and thioguanine metabolism

6. **test-dpyd-variants.vcf**
   - Contains 3 DPYD variants (rs3918290, rs55886062, rs67376798)
   - Mixed evidence levels (A and B)
   - Tests 5-fluorouracil, capecitabine, and tegafur metabolism

### Comprehensive Test Files

These files test specific system behaviors:

7. **test-all-genes.vcf**
   - Contains one variant from each of the six supported genes
   - All variants are Evidence Level A
   - Tests comprehensive gene coverage

8. **test-evidence-level-a.vcf**
   - Contains only CPIC Evidence Level A variants
   - Includes 14 variants across all six genes
   - Tests high-confidence variant analysis

9. **test-no-variants.vcf**
   - Valid VCF header but no variant lines
   - Tests handling of empty VCF files
   - Expected detection state: `no_variants_in_vcf`

10. **test-no-pgx-variants.vcf**
    - Contains variants in non-pharmacogenomic genes (BRCA1, TP53, BRCA2)
    - Tests filtering of non-PGx variants
    - Expected detection state: `no_pgx_variants_detected`

## VCF Format

All test VCF files follow the VCF v4.2 specification with the following INFO tags:

- **GENE**: Gene symbol (e.g., CYP2D6, CYP2C19)
- **STAR**: Star allele designation (e.g., *4, *2)
- **RS**: dbSNP rsID (e.g., rs3892097)
- **CPIC**: CPIC evidence level (A, B, C, or D)

## Expected Outcomes Format

Each `.expected.json` file contains:

```json
{
  "description": "Brief description of the test file",
  "vcf_file": "Name of the VCF file",
  "expected_outcomes": {
    "total_vcf_variants": 0,
    "pgx_variants_identified": 0,
    "pgx_variants_matched": 0,
    "pgx_variants_unmatched": 0,
    "detection_state": "no_variants_in_vcf | no_pgx_variants_detected | pgx_variants_found_none_matched | pgx_variants_found_some_matched | pgx_variants_found_all_matched",
    "annotation_completeness": 0.0,
    "average_variant_quality": 0.0,
    "confidence_score_range": {
      "min": 0.0,
      "max": 1.0
    },
    "evidence_distribution": {
      "A": 0,
      "B": 0,
      "C": 0,
      "D": 0,
      "unknown": 0
    },
    "variants_by_gene": {},
    "variants_by_drug": {},
    "expected_variants": []
  }
}
```

## Detection States

The system classifies variant detection into five states:

1. **no_variants_in_vcf**: VCF file contains no variants at all
2. **no_pgx_variants_detected**: VCF contains variants but none in pharmacogenomic genes
3. **pgx_variants_found_none_matched**: PGx variants detected but none matched the database
4. **pgx_variants_found_some_matched**: Some PGx variants matched, some didn't
5. **pgx_variants_found_all_matched**: All PGx variants successfully matched

## Annotation Completeness

- **Numeric value (0.0-1.0)**: Percentage of PGx variants matched to database
- **"N/A"**: Used when no variants or no PGx variants are detected

## Confidence Score Ranges

Confidence scores are calculated based on:
- Variant call quality (35% weight)
- Annotation completeness (30% weight)
- CPIC evidence level (25% weight)
- Variant count (10% weight)

Expected ranges:
- High quality (Evidence A, 100% completeness, quality >30): 0.82-0.95
- Medium quality (Evidence B, partial completeness): 0.60-0.80
- Low quality (Evidence C/D, low completeness): 0.30-0.60
- No PGx variants: 0.0-0.30

## Usage

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test-cyp2d6-variants

# Validate against expected outcomes
npm run validate-test-data
```

### Adding New Test Files

1. Create a new VCF file following the format above
2. Create a corresponding `.expected.json` file
3. Document the test purpose in this README
4. Add test cases to the test suite

## Validation

The test files validate the following requirements:

- **Requirement 1**: VCF INFO tag extraction (GENE, STAR, RS, CPIC)
- **Requirement 2**: VCF round-trip preservation
- **Requirement 3**: Pharmacogenomic variant detection
- **Requirement 4**: Test VCF processing with known variants
- **Requirement 5-6**: Confidence score calculation
- **Requirement 10**: Annotation completeness calculation
- **Requirement 11**: Detailed quality metrics reporting
- **Requirement 12**: Quality metrics validation

## Notes

- All rsIDs and variant positions are based on GRCh38 reference genome
- Quality scores (QUAL field) are PHRED-scaled confidence scores
- Genotypes use standard VCF format (0/1 = heterozygous, 1/1 = homozygous alternate)
- All variants are marked as PASS in the FILTER field for simplicity

## References

- VCF v4.2 Specification: https://samtools.github.io/hts-specs/VCFv4.2.pdf
- CPIC Guidelines: https://cpicpgx.org/
- PharmGKB: https://www.pharmgkb.org/
