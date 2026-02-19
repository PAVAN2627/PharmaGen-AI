import { useState } from "react";
import { motion } from "framer-motion";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      <div className="flex flex-col md:flex-row pt-16">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden fixed bottom-4 right-4 z-50 rounded-full bg-primary p-3 text-primary-foreground shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Sidebar - hidden on mobile unless open */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative inset-0 z-40 md:z-auto bg-black/50 md:bg-transparent`} onClick={() => setSidebarOpen(false)}>
          <div className="h-full w-64 bg-background md:bg-transparent" onClick={(e) => e.stopPropagation()}>
            <DashboardSidebar
              activeView={activeView}
              onViewChange={(view) => {
                setActiveView(view);
                setSidebarOpen(false);
              }}
              selectedPatient={selectedPatient}
              onSelectPatient={(id) => {
                setSelectedPatient(id);
                setActiveView("results");
                setSidebarOpen(false);
              }}
              patients={[]}
            />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full">
          <ErrorBoundary>
            {activeView === "upload" && (
              <div className="mx-auto max-w-2xl">
                <UploadSection onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
              </div>
            )}

            {activeView === "results" && currentPatientResult && (
              <div className="space-y-4 sm:space-y-6">
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
                <div className="overflow-x-auto">
                  <DrugResultsTable results={analysisResults} />
                </div>
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
