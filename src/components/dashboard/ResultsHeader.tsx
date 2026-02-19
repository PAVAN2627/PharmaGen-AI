import { motion } from 'framer-motion';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeInUp } from '@/lib/constants';

interface ResultsHeaderProps {
  patientId: string;
  onCopy: () => void;
  onDownload: () => void;
}

export const ResultsHeader = ({ patientId, onCopy, onDownload }: ResultsHeaderProps) => {
  return (
    <motion.div
      {...fadeInUp}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Analysis Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pharmacogenomic risk assessment for {patientId}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCopy} className="gap-2">
          <Copy className="h-4 w-4" /> Copy JSON
        </Button>
        <Button size="sm" onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>
    </motion.div>
  );
};
