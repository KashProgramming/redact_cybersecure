"use client";

import React, { useState } from 'react';
import { Shield, LayoutDashboard, Activity, BarChart2, Target } from 'lucide-react';
import Overview from '@/components/dashboard/Overview';
import LiveMonitor from '@/components/dashboard/LiveMonitor';
import Analytics from '@/components/dashboard/Analytics';
import ManualPrediction from '@/components/dashboard/ManualPrediction';
import { cn } from '@/lib/utils';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { MonitorProvider } from '@/contexts/MonitorContext';

// Navigation Items
const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'monitor', label: 'Live Monitor', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    
          <div className="min-h-screen bg-[#1d1d1d] text-white overflow-hidden font-sans mt-[47px]">


        {/* Main Content */}
        <div className="relative z-10 flex flex-col h-screen">
          

          {/* Dashboard Content */}
          <main className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full px-6 py-8">
            {/* Tabs */}
            <div className="flex space-x-1 bg-white/5 p-1 rounded-xl mb-8 w-fit backdrop-blur-sm border border-white/10">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activeTab === item.id
                      ? "bg-[#515151] hover:bg-[#6a6a6a] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
              {activeTab === 'overview' && <Overview />}
              {activeTab === 'monitor' && <LiveMonitor />}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'manual' && <ManualPrediction />}
            </div>
          </main>
        </div>
      </div>
        
  );
}
