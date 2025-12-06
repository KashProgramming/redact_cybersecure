"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface AnalysisResult {
  id: string;
  filename: string;
  uploadedAt: string;
  total_flows: number;
  attack_counts: Record<string, number>;
  protocol_counts: Record<string, number>;
  malicious_protocol_counts: Record<string, number>;
  recent_threats: any[];
  featureImportance?: any[];
  interpretation?: string;
  report?: string;
}

interface AnalyzeContextType {
  analyses: AnalysisResult[];
  currentAnalysis: AnalysisResult | null;
  addAnalysis: (analysis: AnalysisResult) => void;
  setCurrentAnalysis: (id: string) => void;
  updateAnalysis: (id: string, updates: Partial<AnalysisResult>) => void;
  removeAnalysis: (id: string) => void;
  clearAll: () => void;
}

const AnalyzeContext = createContext<AnalyzeContextType | undefined>(undefined);

export function AnalyzeProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [currentAnalysis, setCurrentAnalysisState] = useState<AnalysisResult | null>(null);

  const addAnalysis = (analysis: AnalysisResult) => {
    setAnalyses(prev => [analysis, ...prev]);
    setCurrentAnalysisState(analysis);
  };

  const setCurrentAnalysis = (id: string) => {
    const analysis = analyses.find(a => a.id === id);
    if (analysis) {
      setCurrentAnalysisState(analysis);
    }
  };

  const updateAnalysis = (id: string, updates: Partial<AnalysisResult>) => {
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    
    setCurrentAnalysisState(prev => {
      if (prev && prev.id === id) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  };

  const removeAnalysis = (id: string) => {
    setAnalyses(prev => prev.filter(a => a.id !== id));
    if (currentAnalysis?.id === id) {
      setCurrentAnalysisState(analyses[0] || null);
    }
  };

  const clearAll = () => {
    setAnalyses([]);
    setCurrentAnalysisState(null);
  };

  return (
    <AnalyzeContext.Provider 
      value={{ 
        analyses, 
        currentAnalysis, 
        addAnalysis, 
        setCurrentAnalysis, 
        updateAnalysis,
        removeAnalysis,
        clearAll
      }}
    >
      {children}
    </AnalyzeContext.Provider>
  );
}

export function useAnalyze() {
  const context = useContext(AnalyzeContext);
  if (context === undefined) {
    throw new Error('useAnalyze must be used within an AnalyzeProvider');
  }
  return context;
}
