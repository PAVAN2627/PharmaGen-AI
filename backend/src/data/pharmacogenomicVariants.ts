/**
 * Pharmacogenomic variant database
 * Based on PharmGKB and CPIC guidelines
 */

export interface KnownVariant {
  rsid: string;
  gene: string;
  star_allele: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  functional_status: 'normal' | 'decreased' | 'increased' | 'no_function';
  clinical_significance: string;
  // Enhanced fields for CPIC guidelines
  evidence_level: 'A' | 'B' | 'C' | 'D';
  cpic_guideline: string;
  drugs_affected: string[];
}

export const KNOWN_PGX_VARIANTS: KnownVariant[] = [
  // CYP2D6 variants
  {
    rsid: 'rs3892097',
    gene: 'CYP2D6',
    star_allele: '*4',
    chromosome: '22',
    position: 42130692,
    ref: 'C',
    alt: 'T',
    functional_status: 'no_function',
    clinical_significance: 'Non-functional allele, no enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2D6 and Codeine',
    drugs_affected: ['codeine', 'tramadol', 'tamoxifen']
  },
  {
    rsid: 'rs1065852',
    gene: 'CYP2D6',
    star_allele: '*10',
    chromosome: '22',
    position: 42126611,
    ref: 'C',
    alt: 'T',
    functional_status: 'decreased',
    clinical_significance: 'Reduced enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2D6 and Codeine',
    drugs_affected: ['codeine', 'tramadol', 'tamoxifen']
  },
  {
    rsid: 'rs28371725',
    gene: 'CYP2D6',
    star_allele: '*41',
    chromosome: '22',
    position: 42128945,
    ref: 'G',
    alt: 'A',
    functional_status: 'decreased',
    clinical_significance: 'Reduced enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2D6 and Codeine',
    drugs_affected: ['codeine', 'tramadol', 'tamoxifen']
  },

  // CYP2C19 variants
  {
    rsid: 'rs4244285',
    gene: 'CYP2C19',
    star_allele: '*2',
    chromosome: '10',
    position: 94781859,
    ref: 'G',
    alt: 'A',
    functional_status: 'no_function',
    clinical_significance: 'Loss of function allele',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2C19 and Clopidogrel',
    drugs_affected: ['clopidogrel', 'voriconazole', 'sertraline']
  },
  {
    rsid: 'rs4986893',
    gene: 'CYP2C19',
    star_allele: '*3',
    chromosome: '10',
    position: 94781858,
    ref: 'G',
    alt: 'A',
    functional_status: 'no_function',
    clinical_significance: 'Loss of function allele',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2C19 and Clopidogrel',
    drugs_affected: ['clopidogrel', 'voriconazole', 'sertraline']
  },
  {
    rsid: 'rs12248560',
    gene: 'CYP2C19',
    star_allele: '*17',
    chromosome: '10',
    position: 94762706,
    ref: 'C',
    alt: 'T',
    functional_status: 'increased',
    clinical_significance: 'Increased enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2C19 and Clopidogrel',
    drugs_affected: ['clopidogrel', 'voriconazole', 'sertraline']
  },

  // CYP2C9 variants
  {
    rsid: 'rs1799853',
    gene: 'CYP2C9',
    star_allele: '*2',
    chromosome: '10',
    position: 94942290,
    ref: 'C',
    alt: 'T',
    functional_status: 'decreased',
    clinical_significance: 'Reduced enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2C9 and Warfarin',
    drugs_affected: ['warfarin', 'phenytoin', 'celecoxib']
  },
  {
    rsid: 'rs1057910',
    gene: 'CYP2C9',
    star_allele: '*3',
    chromosome: '10',
    position: 94981296,
    ref: 'A',
    alt: 'C',
    functional_status: 'decreased',
    clinical_significance: 'Significantly reduced enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for CYP2C9 and Warfarin',
    drugs_affected: ['warfarin', 'phenytoin', 'celecoxib']
  },

  // SLCO1B1 variants
  {
    rsid: 'rs4149056',
    gene: 'SLCO1B1',
    star_allele: '*5',
    chromosome: '12',
    position: 21178615,
    ref: 'T',
    alt: 'C',
    functional_status: 'decreased',
    clinical_significance: 'Reduced transporter function',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for SLCO1B1 and Simvastatin',
    drugs_affected: ['simvastatin', 'atorvastatin', 'pravastatin']
  },
  {
    rsid: 'rs2306283',
    gene: 'SLCO1B1',
    star_allele: '*1B',
    chromosome: '12',
    position: 21172734,
    ref: 'A',
    alt: 'G',
    functional_status: 'increased',
    clinical_significance: 'Increased transporter function',
    evidence_level: 'B',
    cpic_guideline: 'CPIC Guideline for SLCO1B1 and Simvastatin',
    drugs_affected: ['simvastatin', 'atorvastatin', 'pravastatin']
  },

  // TPMT variants
  {
    rsid: 'rs1800462',
    gene: 'TPMT',
    star_allele: '*2',
    chromosome: '6',
    position: 18139228,
    ref: 'C',
    alt: 'T',
    functional_status: 'decreased',
    clinical_significance: 'Reduced enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for TPMT and Thiopurines',
    drugs_affected: ['azathioprine', 'mercaptopurine', 'thioguanine']
  },
  {
    rsid: 'rs1800460',
    gene: 'TPMT',
    star_allele: '*3A',
    chromosome: '6',
    position: 18143955,
    ref: 'G',
    alt: 'A',
    functional_status: 'no_function',
    clinical_significance: 'Loss of function allele',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for TPMT and Thiopurines',
    drugs_affected: ['azathioprine', 'mercaptopurine', 'thioguanine']
  },
  {
    rsid: 'rs1142345',
    gene: 'TPMT',
    star_allele: '*3C',
    chromosome: '6',
    position: 18139213,  // Fixed position for GRCh38
    ref: 'G',
    alt: 'A',
    functional_status: 'no_function',
    clinical_significance: 'Loss of function allele',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for TPMT and Thiopurines',
    drugs_affected: ['azathioprine', 'mercaptopurine', 'thioguanine']
  },

  // DPYD variants
  {
    rsid: 'rs3918290',
    gene: 'DPYD',
    star_allele: '*2A',
    chromosome: '1',
    position: 97450058,  // Fixed position for GRCh38
    ref: 'C',
    alt: 'T',
    functional_status: 'no_function',
    clinical_significance: 'Complete loss of function',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for DPYD and Fluoropyrimidines',
    drugs_affected: ['5-fluorouracil', 'capecitabine', 'tegafur']
  },
  {
    rsid: 'rs55886062',
    gene: 'DPYD',
    star_allele: '*13',
    chromosome: '1',
    position: 98205966,
    ref: 'T',
    alt: 'C',
    functional_status: 'decreased',
    clinical_significance: 'Reduced enzyme activity',
    evidence_level: 'A',
    cpic_guideline: 'CPIC Guideline for DPYD and Fluoropyrimidines',
    drugs_affected: ['5-fluorouracil', 'capecitabine', 'tegafur']
  },
  {
    rsid: 'rs67376798',
    gene: 'DPYD',
    star_allele: '*2B',
    chromosome: '1',
    position: 97450058,
    ref: 'A',
    alt: 'G',
    functional_status: 'decreased',
    clinical_significance: 'Reduced enzyme activity',
    evidence_level: 'B',
    cpic_guideline: 'CPIC Guideline for DPYD and Fluoropyrimidines',
    drugs_affected: ['5-fluorouracil', 'capecitabine', 'tegafur']
  },
];

/**
 * Get known variant by rsID
 */
export function getVariantByRsid(rsid: string): KnownVariant | undefined {
  return KNOWN_PGX_VARIANTS.find(v => v.rsid === rsid);
}

/**
 * Get all variants for a specific gene
 */
export function getVariantsByGene(gene: string): KnownVariant[] {
  return KNOWN_PGX_VARIANTS.filter(v => v.gene === gene);
}

/**
 * Check if a variant is pharmacogenomically relevant
 */
export function isPharmacogenomicVariant(rsid: string): boolean {
  return KNOWN_PGX_VARIANTS.some(v => v.rsid === rsid);
}

/**
 * Export alias for backward compatibility
 */
export const pharmacogenomicVariants = KNOWN_PGX_VARIANTS;
