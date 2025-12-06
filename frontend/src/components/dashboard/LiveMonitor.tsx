"use client";

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Play, Pause, RotateCcw, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';
import { getNextFlow, predictFlow, type PredictionResult } from '@/lib/api';
import { useMonitor } from '@/contexts/MonitorContext';

const getSeverityColor = (sev: number) => {
  if (sev >= 0.8) return 'text-red-500';
  if (sev >= 0.5) return 'text-orange-500';
  if (sev > 0) return 'text-yellow-500';
  return 'text-green-500';
};

export default function LiveMonitor() {
  const { 
    monitoring, 
    setMonitoring, 
    currentIndex, 
    setCurrentIndex, 
    threatLog, 
    addThreatLog,
    resetMonitor 
  } = useMonitor();

  const [currentFlow, setCurrentFlow] = React.useState<any>(null);
  const [prediction, setPrediction] = React.useState<PredictionResult | null>(null);
  const [speed, setSpeed] = React.useState(1000);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchNext = async () => {
    if (!isMountedRef.current) return;
    
    try {
      // 1. Get Flow
      const flowData = await getNextFlow(currentIndex);
      if (!flowData || flowData.end) {
        setMonitoring(false);
        return;
      }

      const flow = flowData.flow;
      setCurrentFlow(flow);

      // 2. Predict - Filter out target columns
      const features: any = {};
      Object.keys(flow).forEach(k => {
        if (k === 'Attack_type' || k === 'Attack_encode') return;
        
        const val = parseFloat(flow[k]);
        features[k] = isNaN(val) ? 0 : val;
      });

      const pred = await predictFlow(features);
      if (pred && isMountedRef.current) {
        setPrediction(pred);
        
        if (pred.attack !== 'Benign') {
          addThreatLog({
            id: currentIndex,
            timestamp: new Date().toLocaleTimeString(),
            attack: pred.attack,
            severity: pred.severity,
            action: pred.action
          });
        }
      }

      setCurrentIndex(currentIndex + 1);
    } catch (e) {
      console.error(e);
      setMonitoring(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    if (monitoring) {
      timerRef.current = setInterval(fetchNext, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [monitoring, currentIndex, speed]);

  const toggleMonitoring = () => setMonitoring(!monitoring);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Controls */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMonitoring}
              className={`flex items-center px-6 py-2 rounded-full font-bold transition ${
                monitoring 
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {monitoring ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
              {monitoring ? 'PAUSE MONITORING' : 'START MONITORING'}
            </button>
            <button
              onClick={resetMonitor}
              className="flex items-center px-6 py-2 rounded-full font-bold bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              RESET
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              <span className="font-mono text-blue-400">Current Flow: #{currentIndex}</span>
              {monitoring && <span className="ml-2 text-green-400">● Live</span>}
            </div>
            <span className="text-sm text-gray-400">Speed:</span>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-32 accent-blue-500"
            />
            <span className="text-xs text-gray-500">{speed}ms</span>
          </div>
        </div>
      </Card>

      {/* Current Flow Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Flow Analysis</span>
              <span className="text-sm font-mono text-gray-500">ID: #{currentIndex}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prediction ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center space-x-4">
                    {prediction.attack === 'Benign' ? (
                      <ShieldCheck className="h-10 w-10 text-green-500" />
                    ) : (
                      <ShieldAlert className="h-10 w-10 text-red-500 animate-pulse" />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">{prediction.attack}</h3>
                      <p className="text-sm text-gray-400">{prediction.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getSeverityColor(prediction.severity)}`}>
                      {prediction.severity.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">Severity Score</p>
                  </div>
                </div>

                {/* Key Features */}
                {currentFlow && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-500">Protocol</p>
                      <p className="font-mono text-blue-300">{currentFlow['Protocol']}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-500">Fwd Packets</p>
                      <p className="font-mono text-blue-300">{currentFlow['Total Fwd Packets']}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-500">Bwd Packets</p>
                      <p className="font-mono text-blue-300">{currentFlow['Total Backward Packets']}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-500">Bytes/s</p>
                      <p className="font-mono text-blue-300">{parseFloat(currentFlow['Flow Bytes/s']).toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-gray-500 space-y-2">
                <Activity className="h-12 w-12 opacity-20" />
                <p>Waiting for data stream...</p>
                {currentIndex > 0 && !monitoring && (
                  <p className="text-sm text-blue-400">Paused at flow #{currentIndex}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Threats Log */}
        <Card className="h-[500px] overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-red-400" />
                Threat Log
              </div>
              <span className="text-xs text-gray-500">{threatLog.length} threats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {threatLog.length === 0 ? (
              <p className="text-center text-gray-500 mt-10">No threats detected yet.</p>
            ) : (
              threatLog.map((log, i) => (
                <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-bold text-red-300">{log.attack}</p>
                    <p className="text-xs text-gray-500">#{log.id} • {log.timestamp}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-300">
                      {log.severity.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
