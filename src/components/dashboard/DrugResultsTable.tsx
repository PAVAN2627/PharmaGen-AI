import { motion } from "framer-motion";
import RiskBadge from "./RiskBadge";
import { ANIMATION_DELAYS, fadeInUp, fadeInLeft, RISK_COLORS } from "@/lib/constants";
import { AnalysisResult, RiskLabel } from "@/types/api";

interface DrugResultsTableProps {
  results: AnalysisResult[];
}

const DrugResultsTable = ({ results }: DrugResultsTableProps) => {
  const getDisplayRiskType = (result: AnalysisResult): 'safe' | 'adjust' | 'toxic' | 'unknown' => {
    if (result.risk_assessment.risk_label === 'Safe') return 'safe';
    if (result.risk_assessment.risk_label === 'Adjust Dosage') return 'adjust';
    if (result.risk_assessment.risk_label === 'Toxic' || result.risk_assessment.risk_label === 'Ineffective') {
      return 'toxic';
    }
    return 'unknown';
  };

  const getRiskColor = (result: AnalysisResult) => {
    const risk = getDisplayRiskType(result);
    if (risk === 'safe') return RISK_COLORS.safe;
    if (risk === 'adjust') return RISK_COLORS.adjust;
    if (risk === 'toxic') return RISK_COLORS.toxic;
    return RISK_COLORS.unknown;
  };

  if (results.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground">
        No drug analysis results available
      </div>
    );
  }

  return (
    <motion.div
      {...fadeInUp}
      transition={{ delay: 0.6 }}
      className="glass-card overflow-hidden"
    >
      <div className="border-b border-border p-6">
        <h3 className="font-display text-lg font-semibold text-foreground">Multi-Drug Analysis Overview</h3>
        <p className="text-sm text-muted-foreground">All analyzed gene-drug interactions for this patient</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3 text-left">Drug</th>
              <th className="px-6 py-3 text-left">Gene</th>
              <th className="px-6 py-3 text-left">Phenotype</th>
              <th className="px-6 py-3 text-left">Risk</th>
              <th className="px-6 py-3 text-left">Confidence</th>
              <th className="px-6 py-3 text-left">Severity</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, i) => (
              <motion.tr
                key={i}
                {...fadeInLeft}
                transition={{ delay: ANIMATION_DELAYS.FAST * i + 0.6 }}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="px-6 py-4 font-semibold text-foreground">{result.drug}</td>
                <td className="px-6 py-4 font-mono text-sm text-primary">{result.pharmacogenomic_profile.primary_gene}</td>
                <td className="px-6 py-4">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {result.pharmacogenomic_profile.phenotype}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <RiskBadge risk={getDisplayRiskType(result)} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.risk_assessment.confidence_score * 100}%` }}
                        transition={{ duration: 1, delay: ANIMATION_DELAYS.FAST * i + 0.8 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: getRiskColor(result) }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(result.risk_assessment.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm capitalize text-muted-foreground">
                  {result.risk_assessment.severity}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default DrugResultsTable;
