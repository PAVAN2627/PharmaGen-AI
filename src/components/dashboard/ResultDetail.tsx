import { motion } from "framer-motion";
import { Dna, Stethoscope, Brain, BarChart2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import RiskBadge from "./RiskBadge";
import { AnalysisResult, RiskLabel } from "@/types/api";

interface ResultDetailProps {
  result: AnalysisResult;
}

const ResultDetail = ({ result }: ResultDetailProps) => {
  const getDisplayRiskType = (result: AnalysisResult): 'safe' | 'adjust' | 'toxic' | 'unknown' => {
    if (result.risk_assessment.risk_label === 'Safe') return 'safe';
    if (result.risk_assessment.risk_label === 'Adjust Dosage') return 'adjust';
    if (result.risk_assessment.risk_label === 'Toxic' || result.risk_assessment.risk_label === 'Ineffective') {
      return 'toxic';
    }
    return 'unknown';
  };

  const getPhenotypeDescription = (phenotype: string): string => {
    const descriptions: Record<string, string> = {
      'PM': 'Poor Metabolizer',
      'IM': 'Intermediate Metabolizer',
      'NM': 'Normal Metabolizer',
      'RM': 'Rapid Metabolizer',
      'URM': 'Ultra-Rapid Metabolizer',
      'Unknown': 'Unknown'
    };
    return descriptions[phenotype] || phenotype;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card overflow-hidden"
    >
      {/* Summary Header */}
      <div className="flex flex-col items-start gap-4 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Patient</p>
          <p className="font-display text-lg font-bold text-foreground">{result.patient_id}</p>
          <p className="text-sm text-muted-foreground">Drug: <span className="font-semibold text-foreground">{result.drug}</span></p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RiskBadge risk={getDisplayRiskType(result)} large />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Confidence: <strong className="text-foreground">{(result.risk_assessment.confidence_score * 100).toFixed(0)}%</strong></span>
            <span>Severity: <strong className="text-foreground capitalize">{result.risk_assessment.severity}</strong></span>
          </div>
        </div>
      </div>

      {/* Expandable Sections */}
      <Accordion type="multiple" defaultValue={["pgx", "rec"]} className="px-6">
        <AccordionItem value="pgx">
          <AccordionTrigger className="gap-2 font-display text-sm font-semibold">
            <Dna className="h-4 w-4 text-primary" />
            Pharmacogenomic Profile
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pb-4 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <span className="text-xs text-muted-foreground">Primary Gene</span>
                <p className="font-display font-bold text-primary">{result.pharmacogenomic_profile.primary_gene}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <span className="text-xs text-muted-foreground">Diplotype</span>
                <p className="font-display font-bold text-foreground">{result.pharmacogenomic_profile.diplotype}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <span className="text-xs text-muted-foreground">Phenotype</span>
                <p className="font-display font-bold text-secondary">
                  {result.pharmacogenomic_profile.phenotype} ({getPhenotypeDescription(result.pharmacogenomic_profile.phenotype)})
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Detected Variants</p>
              {result.pharmacogenomic_profile.detected_variants.length > 0 ? (
                <div className="space-y-1">
                  {result.pharmacogenomic_profile.detected_variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-md bg-muted/30 px-3 py-2 text-xs">
                      <span className="font-mono font-semibold text-primary">{v.rsid}</span>
                      <span className="text-muted-foreground">Chr {v.chromosome} : {v.position}</span>
                      {v.star_allele && <span className="text-secondary">{v.star_allele}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No variants detected</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rec">
          <AccordionTrigger className="gap-2 font-display text-sm font-semibold">
            <Stethoscope className="h-4 w-4 text-secondary" />
            Clinical Recommendation
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-4 text-sm">
              <div className="rounded-lg border-l-4 border-secondary bg-secondary/5 p-4">
                <p className="font-semibold text-foreground">{result.clinical_recommendation.recommended_action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{result.clinical_recommendation.cpic_guideline_reference}</p>
              </div>
              {result.clinical_recommendation.alternative_drugs.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Alternative Drugs</p>
                  <div className="flex flex-wrap gap-2">
                    {result.clinical_recommendation.alternative_drugs.map((d, i) => (
                      <span key={i} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="llm">
          <AccordionTrigger className="gap-2 font-display text-sm font-semibold">
            <Brain className="h-4 w-4 text-primary" />
            AI-Generated Explanation
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-4 text-sm leading-relaxed text-muted-foreground">
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground">Summary</p>
                <p>{result.llm_generated_explanation.summary}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground">Biological Mechanism</p>
                <p>{result.llm_generated_explanation.biological_mechanism}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground">Variant Interpretation</p>
                <p>{result.llm_generated_explanation.variant_interpretation}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-foreground">Clinical Impact</p>
                <p>{result.llm_generated_explanation.clinical_impact}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="quality">
          <AccordionTrigger className="gap-2 font-display text-sm font-semibold">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            Quality Metrics
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 pb-4 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <span className="text-xs text-muted-foreground">VCF Parsing</span>
                <p className="font-display font-bold text-risk-safe">
                  {result.quality_metrics.vcf_parsing_success ? "✓ Success" : "✗ Failed"}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <span className="text-xs text-muted-foreground">Annotation Completeness</span>
                <p className="font-display font-bold text-foreground">
                  {result.quality_metrics.annotation_completeness === 'N/A'
                    ? 'N/A'
                    : `${(result.quality_metrics.annotation_completeness * 100).toFixed(0)}%`}
                </p>
              </div>
              {result.quality_metrics.variants_detected !== undefined && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">Variants Detected</span>
                  <p className="font-display font-bold text-foreground">
                    {result.quality_metrics.variants_detected}
                  </p>
                </div>
              )}
              {result.quality_metrics.genes_analyzed !== undefined && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">Genes Analyzed</span>
                  <p className="font-display font-bold text-foreground">
                    {result.quality_metrics.genes_analyzed}
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
};

export default ResultDetail;
