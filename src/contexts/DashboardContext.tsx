import { createContext, useContext, useState, ReactNode } from 'react';
import type { DashboardView } from '@/components/dashboard/DashboardSidebar';

interface DashboardContextType {
  activeView: DashboardView;
  setActiveView: (view: DashboardView) => void;
  selectedPatient: string | null;
  setSelectedPatient: (id: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider = ({ children }: DashboardProviderProps) => {
  const [activeView, setActiveView] = useState<DashboardView>('upload');
  const [selectedPatient, setSelectedPatient] = useState<string | null>('1');

  return (
    <DashboardContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedPatient,
        setSelectedPatient,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
