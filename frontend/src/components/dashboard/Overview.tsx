"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Shield, AlertTriangle, Activity, CheckCircle, Loader2, Server } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

const COLORS = ['#00C851', '#ff4444', '#ff8800', '#33b5e5', '#aa66cc', '#2BBBAD'];

export default function Overview() {
  const { stats: data, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-red-400">Error loading dashboard data: {error}</p>
      </div>
    );
  }

  // Process stats
  const total = data.total_flows;
  const benign = data.attack_counts['Benign'] || 0;
  const malicious = total - benign;
  const rate = total > 0 ? (malicious / total * 100).toFixed(2) : 0;
  
  const stats = {
    total,
    benign,
    malicious,
    detectionRate: Number(rate),
    threatsLogged: data.recent_threats.length
  };

  // Attack Distribution (Pie)
  const attackDist = Object.entries(data.attack_counts).map(([name, value]) => ({ name, value }));
  
  // Attack Counts (Bar) - Filter out Benign for better view of attacks
  const attackCounts = attackDist.filter(d => d.name !== 'Benign');

  // Protocol Distribution (All)
  const protocolDist = Object.entries(data.protocol_counts).map(([name, value]) => ({ name, value }));

  // Protocol Distribution (Malicious)
  const malProtocolDist = Object.entries(data.malicious_protocol_counts).map(([name, value]) => ({ name, value }));

  // Recent Threats
  const recentThreats = data.recent_threats;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Flows</p>
              <h3 className="text-xl font-bold text-white">{stats.total.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Benign</p>
              <h3 className="text-xl font-bold text-white">{stats.benign.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Malicious</p>
              <h3 className="text-xl font-bold text-white">{stats.malicious.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Detection Rate</p>
              <h3 className="text-xl font-bold text-white">{stats.detectionRate}%</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Server className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Threats Logged</p>
              <h3 className="text-xl font-bold text-white">{stats.threatsLogged}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 1: Attack Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Attack Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attackDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {attackDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Attack Type Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attackCounts} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" stroke="#888" />
                  <YAxis dataKey="name" type="category" stroke="#888" width={100} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.1)'}}
                    contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                    {attackCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Protocol Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Protocol Distribution (All Traffic)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={protocolDist}>
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.1)'}}
                    contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#33b5e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Protocol Distribution (Malicious Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={malProtocolDist}>
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.1)'}}
                    contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#ff4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent Threats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
             <Shield className="mr-2 h-5 w-5 text-red-400" />
             Recent Threat Detections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-white/5 text-gray-200 uppercase font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Flow ID</th>
                  <th className="px-4 py-3">Attack Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Fwd Packets</th>
                  <th className="px-4 py-3 rounded-r-lg">Bwd Packets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentThreats.length > 0 ? (
                  recentThreats.map((threat) => (
                    <tr key={threat.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 font-mono text-blue-300">#{threat.id}</td>
                      <td className="px-4 py-3 font-bold text-red-400">{threat.attack}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-300">
                          {threat.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">{threat.protocol}</td>
                      <td className="px-4 py-3">{threat.fwd_packets}</td>
                      <td className="px-4 py-3">{threat.bwd_packets}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No threats detected in recent flows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
