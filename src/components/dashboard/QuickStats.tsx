import { motion } from 'framer-motion';
import { Activity, Clock, FileText, LucideIcon } from 'lucide-react';
import { ANIMATION_DELAYS, fadeInUp } from '@/lib/constants';

interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

interface QuickStatsProps {
  patientId: string;
  drugsAnalyzed: number;
  highRiskAlerts: number;
  timestamp: string;
}

export const QuickStats = ({
  patientId,
  drugsAnalyzed,
  highRiskAlerts,
  timestamp,
}: QuickStatsProps) => {
  const stats: StatItem[] = [
    { label: 'Patient ID', value: patientId, icon: FileText, color: 'text-primary' },
    { label: 'Drugs Analyzed', value: String(drugsAnalyzed), icon: Activity, color: 'text-secondary' },
    { label: 'High Risk Alerts', value: String(highRiskAlerts), icon: Activity, color: 'text-risk-toxic' },
    { label: 'Timestamp', value: timestamp, icon: Clock, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          {...fadeInUp}
          transition={{ delay: ANIMATION_DELAYS.FAST * i }}
          className="glass-card flex items-center gap-4 p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-display text-lg font-bold text-foreground">{stat.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
