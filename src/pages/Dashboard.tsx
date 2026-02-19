import { useState } from "react";
import Navbar from "@/components/Navbar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import UploadSection from "@/components/dashboard/UploadSection";
import { ResultsHeader } from "@/components/dashboard/ResultsHeader";
import { QuickStats } from "@/components/dashboard/QuickStats";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DrugResultsTable from "@/components/dashboard/DrugResultsTable";
import ResultDetail from "@/components/dashboard/ResultDetail";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useToast } from "@/hooks/use-toast";
import { downloadJSON, copyToClipboard } from "@/lib/formatters";
import { AnalysisResult } from "@/types/api";
import { analyzeVCF } from "@/services/api";

const DashboardContent = () => {
  const { toast } = useToast();
  const { activeView, setActiveView, selectedPatient, setSelectedPatient } = useDashboard();
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);

  const handleCopy = async () => {
    if (!currentResult) return;
    const success = await copyToClipboard(JSON.stringify(currentResult, null, 2));
    if (success) {
      toast({ title: "Copied to clipboard", description: "JSON result copied successfully." });
    } else {
      toast({ title: "Copy failed", description: "Unable to copy to clipboard.", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    if (!currentResult) return;
    downloadJSON(currentResult, `pharmagen_${currentResult.patient_id}_${currentResult.drug}.json`);
    toast({ title: "Downloaded", description: "JSON file saved." });
  };

  const handleAnalyze = async (file: File, drugs: string[]) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting analysis...', { file: file.name, drugs });
      const results = await analyzeVCF(file, drugs);
      console.log('Analysis results received:', results);
      
      setAnalysisResults(results);
      if (results.length > 0) {
        setCurrentResult(results[0]);
        setActiveView("results");
        toast({ 
          title: "Analysis Complete", 
          description: `Successfully analyzed ${results.length} drug(s)` 
        });
      } else {
        console.warn('No results returned from analysis');
        toast({ 
          title: "No Results", 
          description: "Analysis completed but no results were returned", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({ 
        title: "Analysis Failed", 
        description: error.message || "Failed to analyze VCF file", 
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentPatientResult = currentResult || analysisResults[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-16">
        <DashboardSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          selectedPatient={selectedPatient}
          onSelectPatient={(id) => {
            setSelectedPatient(id);
            setActiveView("results");
          }}
          patients={[]}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <ErrorBoundary>
            {activeView === "upload" && (
              <div className="mx-auto max-w-2xl">
                <UploadSection onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
              </div>
            )}

            {activeView === "results" && currentPatientResult && (
              <div className="space-y-6">
                <ResultsHeader
                  patientId={currentPatientResult.patient_id}
                  onCopy={handleCopy}
                  onDownload={handleDownload}
                />
                <QuickStats
                  patientId={currentPatientResult.patient_id}
                  drugsAnalyzed={analysisResults.length}
                  highRiskAlerts={analysisResults.filter(r => r.risk_assessment.risk_label === 'Toxic' || r.risk_assessment.risk_label === 'Ineffective').length}
                  timestamp={new Date(currentPatientResult.timestamp).toLocaleDateString()}
                />
                <DashboardCharts results={analysisResults} />
                <DrugResultsTable results={analysisResults} />
                <ResultDetail result={currentPatientResult} />
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
};

export default Dashboard;
