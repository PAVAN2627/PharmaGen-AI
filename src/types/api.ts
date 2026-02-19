// API response types matching backend

export type RiskLabel = 'Safe' | 'Adjust Dosage' | 'Toxic' | 'Ineffective' | 'Unknown';
export type Severity = 'none' | 'low' | 'moderate' | 'high' | 'critical';
export type Phenotype = 'PM' | 'IM' | 'NM' | 'RM' | 'URM' | 'Unknown';

export interface DetectedVariant {
  rsid: string;
  chromosome: string;
  position: string;
  ref?: string;
  alt?: string;
  genotype?: string;
  gene?: string;
  star_allele?: string;
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

export interface QualityMetrics {
  vcf_parsing_success: boolean;
  annotation_completeness: number | 'N/A';
  variants_detected?: number;
  genes_analyzed?: number;
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
