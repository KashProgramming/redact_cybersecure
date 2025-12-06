"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Download, Loader2, Sparkles, Eye } from 'lucide-react';
import { getFeatureImportance, generateReport } from '@/lib/api';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useDashboard } from '@/contexts/DashboardContext';
import jsPDF from 'jspdf';

export default function Analytics() {
  const [featureImportance, setFeatureImportance] = useState<any[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingInterpretation, setGeneratingInterpretation] = useState(false);
  const [showPreview, setShowPreview] = useState<'interpretation' | 'report' | null>(null);
  
  const { interpretation, setInterpretation, report, setReport } = useAnalytics();
  const { stats: dashboardData } = useDashboard();

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setLoadingFeatures(true);
    const data = await getFeatureImportance();
    if (data) {
      let features = [];
      if (data.importances) {
        features = data.importances.map((val: number, i: number) => ({ name: `Feature ${i}`, value: val }));
      } else if (data.importances_dict) {
        features = Object.entries(data.importances_dict)
          .map(([k, v]) => ({ name: k, value: v }))
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 20);
      }
      setFeatureImportance(features);
    }
    setLoadingFeatures(false);
  };

  const handleGenerateInterpretation = async () => {
    if (featureImportance.length === 0) return;
    
    setGeneratingInterpretation(true);
    try {
      const topFeatures = featureImportance.slice(0, 10);
      const featureList = topFeatures.map(f => `${f.name}: ${f.value.toFixed(4)}`).join('\n');
      
      const prompt = `As a cybersecurity expert, provide a concise SHAP (SHapley Additive exPlanations) interpretation for these top network intrusion detection features:

${featureList}

Provide a clear, professional explanation in plain text format (no markdown symbols like **, #, etc.):

1. What SHAP values represent and why they matter for network security
2. Analysis of the top 3-5 most important features and what they indicate
3. How these features help identify different attack types (DoS, BruteForce, Malware, etc.)
4. Key takeaways for security teams

Keep it concise (under 250 words), professional, and actionable. Use proper paragraphs and clear language.`;

      const response = await fetch('/api/groq-interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        setInterpretation(data.interpretation);
      } else {
        setInterpretation('Failed to generate interpretation. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setInterpretation('Error generating interpretation.');
    } finally {
      setGeneratingInterpretation(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    
    const reportData = dashboardData ? {
      attack_summary: dashboardData.attack_counts,
      classification_report: { accuracy: 0.98, precision: 0.96, recall: 0.94 },
      threat_statistics: {
        total: dashboardData.total_flows,
        malicious: dashboardData.total_flows - (dashboardData.attack_counts['Benign'] || 0),
        benign: dashboardData.attack_counts['Benign'] || 0
      },
      attack_counts: dashboardData.attack_counts,
      protocol_counts: dashboardData.protocol_counts
    } : {
      attack_summary: { 'DoS': 150, 'Benign': 2000, 'BruteForce': 50, 'Malware': 30 },
      classification_report: { accuracy: 0.98, precision: 0.96, recall: 0.94 },
      threat_statistics: { total: 2230, malicious: 230, benign: 2000 },
      attack_counts: { 'Benign': 2000, 'DoS': 150, 'BruteForce': 50, 'Malware': 30 },
      protocol_counts: { 'TCP': 1500, 'UDP': 600, 'ICMP': 130 }
    };
    
    const result = await generateReport(reportData);
    setReport(result);
    setGeneratingReport(false);
  };

  const downloadTXT = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async (type: 'interpretation' | 'report') => {
    if (type === 'interpretation' && interpretation) {
      // Simple PDF for interpretation
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SHAP Feature Interpretation', margin, margin);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 10);
      
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(interpretation, maxWidth);
      let y = margin + 25;
      
      lines.forEach((line: string) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 7;
      });
      
      doc.save(`shap_interpretation_${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (type === 'report') {
      // Use backend PDF generation with charts
      try {
        const reportData = dashboardData ? {
          attack_summary: dashboardData.attack_counts,
          classification_report: { accuracy: 0.98, precision: 0.96, recall: 0.94 },
          threat_statistics: {
            total: dashboardData.total_flows,
            malicious: dashboardData.total_flows - (dashboardData.attack_counts['Benign'] || 0),
            benign: dashboardData.attack_counts['Benign'] || 0
          },
          attack_counts: dashboardData.attack_counts,
          protocol_counts: dashboardData.protocol_counts
        } : {
          attack_summary: { 'DoS': 150, 'Benign': 2000, 'BruteForce': 50, 'Malware': 30 },
          classification_report: { accuracy: 0.98, precision: 0.96, recall: 0.94 },
          threat_statistics: { total: 2230, malicious: 230, benign: 2000 },
          attack_counts: { 'Benign': 2000, 'DoS': 150, 'BruteForce': 50, 'Malware': 30 },
          protocol_counts: { 'TCP': 1500, 'UDP': 600, 'ICMP': 130 }
        };
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}reports/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
          const data = await response.json();
          // Convert base64 to blob and download
          const pdfBlob = base64ToBlob(data.pdf, 'application/pdf');
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.filename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          alert('Failed to generate PDF report');
        }
      } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF report');
      }
    }
  };

  const base64ToBlob = (base64: string, type: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Row 1: Feature Importance Chart + AI Interpretation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[600px]">
          <CardHeader>
            <CardTitle>Top Feature Importance (SHAP Values)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFeatures ? (
              <div className="h-[500px] flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="h-[520px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={featureImportance} 
                    layout="vertical" 
                    margin={{ left: 150, right: 20, top: 10, bottom: 10 }}
                  >
                    <XAxis type="number" stroke="#888" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#888" 
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.1)'}}
                      contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {featureImportance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${260 - index * 8}, 70%, 60%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-purple-400" />
              AI Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-gray-400">
              Get AI-powered SHAP interpretation of feature importance for threat detection.
            </p>
            
            <button
              onClick={handleGenerateInterpretation}
              disabled={generatingInterpretation || featureImportance.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-lg transition disabled:opacity-50 flex items-center justify-center"
            >
              {generatingInterpretation ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Interpretation
                </>
              )}
            </button>

            {interpretation && (
              <>
                <div className="flex-1 p-4 rounded-lg bg-white/5 border border-white/10 overflow-y-auto custom-scrollbar max-h-[350px]">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {interpretation}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview('interpretation')}
                    className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition flex items-center justify-center"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Preview
                  </button>
                  <button
                    onClick={() => downloadTXT(interpretation, `shap_interpretation_${new Date().toISOString().split('T')[0]}.txt`)}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition flex items-center justify-center"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    TXT
                  </button>
                  <button
                    onClick={() => downloadPDF('interpretation')}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition flex items-center justify-center"
                  >
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Threat Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-blue-400" />
            Comprehensive Threat Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Generate a detailed threat analysis report with MITRE ATT&CK mapping and mitigation strategies.
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg transition disabled:opacity-50 flex items-center whitespace-nowrap"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>

          {report && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20 max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-white">Report Preview</h4>
                  <button
                    onClick={() => setShowPreview('report')}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Full Preview
                  </button>
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {report}
                </pre>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-white text-sm">Download Options</h4>
                <button
                  onClick={() => downloadTXT(report, `threat_report_${new Date().toISOString().split('T')[0]}.txt`)}
                  className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition flex items-center justify-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as TXT
                </button>
                <button
                  onClick={() => downloadPDF('report')}
                  className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition flex items-center justify-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download as PDF
                </button>
                <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400">
                    <strong>Note:</strong> PDF format includes proper formatting, headers, and page breaks for professional documentation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowPreview(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {showPreview === 'interpretation' ? 'SHAP Interpretation' : 'Threat Report'} - Full Preview
              </h3>
              <button
                onClick={() => setShowPreview(null)}
                className="text-gray-400 hover:text-white transition text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                {showPreview === 'interpretation' ? interpretation : report}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
