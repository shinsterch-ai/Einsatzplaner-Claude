import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SimulatedRole = 'admin' | 'planer' | 'mitarbeiter';

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoOrgName: string;
  simulatedRole: SimulatedRole;
  setSimulatedRole: (role: SimulatedRole) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<SimulatedRole>('planer');
  const demoOrgName = 'Spitex Hinterhölle';

  const toggleDemoMode = () => {
    setIsDemoMode(prev => !prev);
  };

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, demoOrgName, simulatedRole, setSimulatedRole }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
