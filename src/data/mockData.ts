// Mock data for the dashboard
export const mockPatientResult = {
  patient_id: "PATIENT_001",
  drug: "CODEINE",
  timestamp: "2026-02-19T10:30:00Z",
  risk_assessment: {
    risk_label: "Adjust Dosage",
    confidence_score: 0.87,
    severity: "moderate",
  },
  pharmacogenomic_profile: {
    primary_gene: "CYP2D6",
    diplotype: "*1/*2",
    phenotype: "IM",
    detected_variants: [
      { rsid: "rs3892097", chromosome: "22", position: "42130692" },
      { rsid: "rs1065852", chromosome: "22", position: "42126611" },
    ],
  },
  clinical_recommendation: {
    cpic_guideline_reference: "CPIC 2023 CYP2D6-Codeine",
    recommended_action: "Reduce dose by 50% or consider alternative analgesic",
    alternative_drugs: ["Morphine", "Non-opioid analgesics"],
  },
  llm_generated_explanation: {
    summary:
      "The patient carries CYP2D6 *1/*2 indicating an intermediate metabolizer phenotype. Codeine conversion to morphine is reduced, potentially decreasing analgesic efficacy at standard doses.",
    biological_mechanism:
      "CYP2D6 catalyzes the O-demethylation of codeine to morphine. The *2 allele results in reduced enzyme activity compared to wild-type *1.",
    variant_interpretation:
      "rs3892097 (CYP2D6*4) is a non-functional allele. However, this patient carries *1/*2, indicating one normal and one reduced-function allele.",
    clinical_impact:
      "Intermediate metabolizers may experience reduced pain relief with standard codeine doses. Consider dose reduction or alternative analgesics for optimal therapeutic outcomes.",
  },
  quality_metrics: {
    vcf_parsing_success: true,
    annotation_completeness: 0.95,
  },
};

export const mockMultiDrugResults = [
  {
    drug: "Codeine",
    gene: "CYP2D6",
    risk: "adjust" as const,
    confidence: 0.87,
    severity: "moderate",
    phenotype: "IM",
  },
  {
    drug: "Clopidogrel",
    gene: "CYP2C19",
    risk: "safe" as const,
    confidence: 0.95,
    severity: "none",
    phenotype: "NM",
  },
  {
    drug: "Warfarin",
    gene: "CYP2C9",
    risk: "toxic" as const,
    confidence: 0.91,
    severity: "high",
    phenotype: "PM",
  },
  {
    drug: "Simvastatin",
    gene: "SLCO1B1",
    risk: "adjust" as const,
    confidence: 0.82,
    severity: "moderate",
    phenotype: "IM",
  },
  {
    drug: "Azathioprine",
    gene: "TPMT",
    risk: "safe" as const,
    confidence: 0.93,
    severity: "none",
    phenotype: "NM",
  },
  {
    drug: "Fluorouracil",
    gene: "DPYD",
    risk: "toxic" as const,
    confidence: 0.89,
    severity: "critical",
    phenotype: "PM",
  },
];

export const riskDistribution = [
  { name: "Safe", value: 2, fill: "hsl(142, 71%, 45%)" },
  { name: "Adjust", value: 2, fill: "hsl(38, 92%, 50%)" },
  { name: "Toxic", value: 2, fill: "hsl(0, 72%, 51%)" },
];

export const confidenceData = mockMultiDrugResults.map((r) => ({
  drug: r.drug,
  confidence: r.confidence * 100,
  fill:
    r.risk === "safe"
      ? "hsl(142, 71%, 45%)"
      : r.risk === "adjust"
      ? "hsl(38, 92%, 50%)"
      : "hsl(0, 72%, 51%)",
}));
