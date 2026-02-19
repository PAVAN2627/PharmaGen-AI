import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AnalysisResult } from "@/types/api";
import { RISK_COLORS } from "@/lib/constants";

interface DashboardChartsProps {
  results: AnalysisResult[];
}

const DashboardCharts = ({ results }: DashboardChartsProps) => {
  const getDisplayRiskType = (result: AnalysisResult): 'safe' | 'adjust' | 'toxic' | 'unknown' => {
    if (result.risk_assessment.risk_label === 'Safe') return 'safe';
    if (result.risk_assessment.risk_label === 'Adjust Dosage') return 'adjust';
    if (result.risk_assessment.risk_label === 'Toxic' || result.risk_assessment.risk_label === 'Ineffective') {
      return 'toxic';
    }
    return 'unknown';
  };

  const safeCount = results.filter(r => getDisplayRiskType(r) === 'safe').length;
  const adjustCount = results.filter(r => getDisplayRiskType(r) === 'adjust').length;
  const toxicCount = results.filter(r => getDisplayRiskType(r) === 'toxic').length;

  // Calculate risk distribution from real results
  const riskDistribution = [
    { 
      name: "Safe", 
      value: safeCount,
      fill: RISK_COLORS.safe
    },
    { 
      name: "Adjust", 
      value: adjustCount,
      fill: RISK_COLORS.adjust
    },
    { 
      name: "Toxic", 
      value: toxicCount,
      fill: RISK_COLORS.toxic
    },
  ].filter(item => item.value > 0);

  // Calculate confidence data from real results
  const confidenceData = results.map(r => {
    const displayRisk = getDisplayRiskType(r);
    return {
      drug: r.drug,
      confidence: r.risk_assessment.confidence_score * 100,
      fill: displayRisk === 'safe'
        ? RISK_COLORS.safe
        : displayRisk === 'adjust'
        ? RISK_COLORS.adjust
        : displayRisk === 'toxic'
        ? RISK_COLORS.toxic
        : RISK_COLORS.unknown
    };
  });

  if (results.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground">
        No analysis results to display
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Risk Distribution Pie */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Risk Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                animationDuration={1200}
              >
                {riskDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4">
          {riskDistribution.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.fill }} />
              {r.name} ({r.value})
            </div>
          ))}
        </div>
      </motion.div>

      {/* Confidence Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Confidence Scores by Drug</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="drug" type="category" width={90} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
                formatter={(value: number) => [`${value.toFixed(0)}%`, "Confidence"]}
              />
              <Bar dataKey="confidence" radius={[0, 4, 4, 0]} animationDuration={1500}>
                {confidenceData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardCharts;
