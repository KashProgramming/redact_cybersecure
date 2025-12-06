"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { predictFlow, type PredictionResult } from '@/lib/api';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';

const KEY_FEATURES = [
  'Destination Port', 'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets',
  'Total Length of Fwd Packets', 'Total Length of Bwd Packets', 'Fwd Packet Length Max',
  'Fwd Packet Length Min', 'Bwd Packet Length Max', 'Bwd Packet Length Min',
  'Flow Bytes/s', 'Flow Packets/s', 'Flow IAT Mean', 'Flow IAT Std',
  'Fwd IAT Total', 'Bwd IAT Total', 'Fwd PSH Flags', 'Bwd PSH Flags',
  'Fwd URG Flags', 'Bwd URG Flags'
];

export default function ManualPrediction() {
  const [features, setFeatures] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (feature: string, value: string) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const pred = await predictFlow(features);
    setResult(pred);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Manual Flow Input</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {KEY_FEATURES.map((feature) => (
                  <div key={feature} className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wider">{feature}</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
                      placeholder="0.0"
                      onChange={(e) => handleInputChange(feature, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg transition disabled:opacity-50 flex items-center"
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Analyze Flow'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prediction Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6 text-center py-8">
                <div className="flex justify-center">
                  {result.attack === 'Benign' ? (
                    <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ShieldCheck className="h-12 w-12 text-green-500" />
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                      <ShieldAlert className="h-12 w-12 text-red-500" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{result.attack}</h3>
                  <p className="text-gray-400">{result.action}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-xs text-gray-500">Severity</p>
                    <p className={`text-xl font-bold ${result.severity > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
                      {result.severity.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="text-xl font-bold text-blue-400">High</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500 space-y-4">
                <ShieldAlert className="h-12 w-12 opacity-20" />
                <p>Enter flow features to analyze</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
