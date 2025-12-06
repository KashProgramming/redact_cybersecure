"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDashboardStats } from '@/lib/api';

interface DashboardStats {
  total_flows: number;
  attack_counts: Record<string, number>;
  protocol_counts: Record<string, number>;
  malicious_protocol_counts: Record<string, number>;
  recent_threats: any[];
}

interface DashboardContextType {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      if (data && !data.error) {
        setStats(data);
      } else {
        setError(data?.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Failed to fetch dashboard stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    await loadStats();
  };

  // Load stats only once when provider mounts
  useEffect(() => {
    loadStats();
  }, []);

  return (
    <DashboardContext.Provider value={{ stats, loading, error, refreshStats }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
