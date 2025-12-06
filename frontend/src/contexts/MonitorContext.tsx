"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ThreatLogItem {
  id: number;
  timestamp: string;
  attack: string;
  severity: number;
  action: string;
}

interface MonitorContextType {
  monitoring: boolean;
  setMonitoring: (value: boolean) => void;
  currentIndex: number;
  setCurrentIndex: (value: number) => void;
  threatLog: ThreatLogItem[];
  setThreatLog: (value: ThreatLogItem[]) => void;
  addThreatLog: (item: ThreatLogItem) => void;
  resetMonitor: () => void;
}

const MonitorContext = createContext<MonitorContextType | undefined>(undefined);

export function MonitorProvider({ children }: { children: ReactNode }) {
  const [monitoring, setMonitoring] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [threatLog, setThreatLog] = useState<ThreatLogItem[]>([]);

  const addThreatLog = (item: ThreatLogItem) => {
    setThreatLog(prev => [item, ...prev].slice(0, 50));
  };

  const resetMonitor = () => {
    setMonitoring(false);
    setCurrentIndex(0);
    setThreatLog([]);
  };

  return (
    <MonitorContext.Provider 
      value={{ 
        monitoring, 
        setMonitoring, 
        currentIndex, 
        setCurrentIndex, 
        threatLog, 
        setThreatLog,
        addThreatLog,
        resetMonitor 
      }}
    >
      {children}
    </MonitorContext.Provider>
  );
}

export function useMonitor() {
  const context = useContext(MonitorContext);
  if (context === undefined) {
    throw new Error('useMonitor must be used within a MonitorProvider');
  }
  return context;
}
