"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AnalyticsContextType {
  interpretation: string | null;
  setInterpretation: (value: string | null) => void;
  report: string | null;
  setReport: (value: string | null) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  return (
    <AnalyticsContext.Provider value={{ interpretation, setInterpretation, report, setReport }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
