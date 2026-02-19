import { motion } from "framer-motion";
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useDrugSelection } from "@/hooks/useDrugSelection";
import { SUPPORTED_DRUGS } from "@/lib/constants";

interface UploadSectionProps {
  onAnalyze: (file: File, drugs: string[]) => Promise<void>;
  isAnalyzing?: boolean;
}

const UploadSection = ({ onAnalyze, isAnalyzing = false }: UploadSectionProps) => {
  const { file, error, dragOver, setDragOver, handleDrop, handleFileInput, clearFile } = useFileUpload();
  const { drugInput, selectedDrugs, setDrugInput, addDrug, toggleDrug } = useDrugSelection();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!file) {
      toast({ title: 'No file uploaded', description: 'Please upload a VCF file first.', variant: 'destructive' });
      return;
    }
    if (selectedDrugs.length === 0) {
      toast({ title: 'No drugs selected', description: 'Select at least one drug to analyze.', variant: 'destructive' });
      return;
    }
    await onAnalyze(file, selectedDrugs);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Upload VCF File</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a patient's VCF v4.2 file to begin pharmacogenomic analysis.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`glass-card relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-secondary bg-secondary/5" : "border-border"
        }`}
      >
        {file ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-risk-safe" />
            <div className="text-left">
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={clearFile} className="ml-4 rounded-md p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-foreground">Drag &amp; drop your VCF file here</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse · Max 5MB · .vcf / .vcf.gz</p>
            <input
              type="file"
              accept=".vcf,.vcf.gz"
              onChange={handleFileInput}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Drug selection */}
      <div className="glass-card p-6">
        <h3 className="mb-3 font-display text-sm font-semibold text-foreground">Select Drugs for Analysis</h3>
        <div className="flex gap-2">
          <Input
            value={drugInput}
            onChange={(e) => setDrugInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDrug(drugInput)}
            placeholder="Type drug name and press Enter"
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => addDrug(drugInput)}>
            Add
          </Button>
        </div>

        {/* Quick-select chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUPPORTED_DRUGS.map((d) => (
            <button
              key={d}
              onClick={() => toggleDrug(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedDrugs.includes(d)
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {selectedDrugs.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {selectedDrugs.length} drug(s) selected: {selectedDrugs.join(", ")}
          </p>
        )}
      </div>

      {/* Analyze button */}
      <Button size="lg" className="w-full gap-2" onClick={handleAnalyze} disabled={isAnalyzing}>
        <FileText className="h-5 w-5" />
        {isAnalyzing ? 'Analyzing...' : 'Analyze Pharmacogenomic Risk'}
      </Button>
    </motion.div>
  );
};

export default UploadSection;
