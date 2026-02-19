// Core types for the pharmacogenomics application

export type RiskLabel = 'Safe' | 'Adjust Dosage' | 'Toxic' | 'Ineffective' | 'Unknown';
export type Severity = 'none' | 'low' | 'moderate' | 'high' | 'critical';
export type Phenotype = 'PM' | 'IM' | 'NM' | 'RM' | 'URM' | 'Unknown';

// Variant detection types
export type DetectionState = 
  | 'no_variants_in_vcf'
  | 'no_pgx_variants_detected'
  | 'pgx_variants_found_none_matched'
  | 'pgx_variants_found_some_matched'
  | 'pgx_variants_found_all_matched';

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D';

export interface VCFVariant {
  chromosome: string;
  position: number;
  rsid: string;
  ref: string;
  alt: string;
  quality: number;
  filter: string;
  info: Record<string, string>;
  genotype?: string;
  // Enhanced INFO tag extraction fields
  gene?: string;
  starAllele?: string;
  rsIdentifier?: string;
  cpicLevel?: string;
}

export interface DetectedVariant {
  rsid: string;
  chromosome: string;
  position: string;
  ref?: string;
  alt?: string;
  genotype?: string;
  gene?: string;
  star_allele?: string;
  // Enhanced fields for variant matching metadata
  matchedBy?: 'rsid' | 'position' | 'star_allele' | null;
  matchConfidence?: number;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
  functionalStatus?: 'normal' | 'decreased' | 'increased' | 'no_function';
  clinicalSignificance?: string;
}

export interface PharmacogenomicProfile {
  primary_gene: string;
  diplotype: string;
  phenotype: Phenotype;
  detected_variants: DetectedVariant[];
}

export interface RiskAssessment {
  risk_label: RiskLabel;
  confidence_score: number;
  severity: Severity;
}

export interface ClinicalRecommendation {
  cpic_guideline_reference: string;
  recommended_action: string;
  alternative_drugs: string[];
}

export interface LLMExplanation {
  summary: string;
  biological_mechanism: string;
  variant_interpretation: string;
  clinical_impact: string;
}

// Evidence distribution by level
export interface EvidenceDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  unknown: number;
}

export interface QualityMetrics {
  vcf_parsing_success: boolean;
  annotation_completeness: number | 'N/A';
  variants_detected?: number;
  genes_analyzed?: number;
  // Enhanced fields from QualityMetricsEngine
  total_vcf_variants: number;
  pgx_variants_identified: number;
  pgx_variants_matched: number;
  pgx_variants_unmatched: number;
  average_variant_quality: number;
  evidence_distribution: EvidenceDistribution;
  variants_by_gene: Record<string, number>;
  variants_by_drug: Record<string, number>;
  detection_state: DetectionState;
}

export interface RoundTripResult {
  success: boolean;
  originalVariantCount: number;
  roundTripVariantCount: number;
  infoTagsPreserved: boolean;
  qualityScoresPreserved: boolean;
  errors: string[];
}

// Variant detection result types
export interface MatchResult {
  matched: boolean;
  knownVariant?: any; // Will be KnownVariant from data layer
  matchedBy: 'rsid' | 'position' | 'star_allele' | null;
  confidence: number;
}

export interface DetectionResult {
  matched: DetectedVariant[];
  unmatched: VCFVariant[];
  totalVcfVariants: number;
  pgxVariantsFound: number;
  matchedCount: number;
  state: DetectionState;
}

export interface AnalysisResult {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: RiskAssessment;
  pharmacogenomic_profile: PharmacogenomicProfile;
  clinical_recommendation: ClinicalRecommendation;
  llm_generated_explanation: LLMExplanation;
  quality_metrics: QualityMetrics;
}

export interface AnalysisRequest {
  vcfFile: Express.Multer.File;
  drugs: string[];
  patientId?: string;
}

// Gene-specific variant data
export interface GeneVariantData {
  gene: string;
  variants: DetectedVariant[];
  diplotype: string;
  phenotype: Phenotype;
  star_alleles: string[];
}

// Drug-gene interaction rules
export interface DrugGeneRule {
  drug: string;
  gene: string;
  phenotypes: {
    [key in Phenotype]?: {
      risk: RiskLabel;
      severity: Severity;
      recommendation: string;
    };
  };
}
