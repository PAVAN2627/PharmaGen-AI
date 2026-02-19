import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { fadeInUp } from "@/lib/constants";

interface HistorySectionProps {
  selectedPatient: string | null;
  onSelectPatient: (id: string) => void;
  onViewResults: () => void;
}

const HistorySection = ({ selectedPatient, onSelectPatient, onViewResults }: HistorySectionProps) => {
  return (
    <motion.div {...fadeInUp} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Patient History</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View analysis results for selected patients.
        </p>
      </div>

      <div className="glass-card border-l-4 border-primary bg-primary/5 p-6">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground">Local Analysis Only</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This application performs analysis locally without persistent storage. 
              Your analysis results are displayed immediately after processing and are not saved to a database.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              To view detailed results, complete an analysis in the Upload VCF tab and navigate to the Results section.
            </p>
          </div>
        </div>
      </div>

      {selectedPatient && (
        <div className="glass-card p-6">
          <p className="text-sm text-foreground">
            <strong>Selected Patient:</strong> {selectedPatient}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            To view this patient's analysis, navigate to the Results tab.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default HistorySection;
