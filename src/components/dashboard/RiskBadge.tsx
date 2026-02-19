import { motion } from "framer-motion";
import { Shield, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

type RiskLevel = "safe" | "adjust" | "toxic" | "unknown";

interface RiskBadgeProps {
  risk: RiskLevel;
  large?: boolean;
}

const config: Record<RiskLevel, { label: string; icon: typeof Shield; className: string }> = {
  safe: { label: "SAFE", icon: Shield, className: "risk-badge-safe" },
  adjust: { label: "ADJUST DOSAGE", icon: AlertTriangle, className: "risk-badge-adjust" },
  toxic: { label: "TOXIC", icon: XCircle, className: "risk-badge-toxic" },
  unknown: { label: "UNKNOWN", icon: HelpCircle, className: "risk-badge-unknown" },
};

const RiskBadge = ({ risk, large }: RiskBadgeProps) => {
  const c = config[risk];
  const Icon = c.icon;
  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${c.className} inline-flex items-center gap-1.5 ${large ? "px-5 py-2 text-base" : ""}`}
    >
      <Icon className={large ? "h-5 w-5" : "h-3.5 w-3.5"} />
      {c.label}
    </motion.span>
  );
};

export default RiskBadge;
