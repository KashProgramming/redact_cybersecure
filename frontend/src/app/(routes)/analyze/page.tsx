"use client";

import React, { useState } from 'react';
import { Shield, Upload, FileText, AlertCircle, CheckCircle, Loader2, BarChart3, PieChart as PieChartIcon, Sparkles, Download, Eye, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateReport } from '@/lib/api';
import { useAnalyze, AnalyzeProvider } from '@/contexts/AnalyzeContext';
import jsPDF from 'jspdf';

const COLORS = ['#00C851', '#ff4444', '#ff8800', '#33b5e5', '#aa66cc', '#2BBBAD'];

function AnalyzePageContent() {
  const { analyses, currentAnalysis, addAnalysis, setCurrentAnalysis, updateAnalysis, removeAnalysis } = useAnalyze();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store files for feature importance calculation
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, File>>(new Map());
  
  // Analytics states
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [generatingInterpretation, setGeneratingInterpretation] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showPreview, setShowPreview] = useState<'interpretation' | 'report' | null>(null);
  
  // Minimized analyses state
  const [expandedAnalyses, setExpandedAnalyses] = useState<Set<string>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}upload/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      
      // Add to context
      const newAnalysis = {
        id: Date.now().toString(),
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        ...data
      };
      
      addAnalysis(newAnalysis);
      
      // Store file for later feature importance calculation
      setUploadedFiles(prev => new Map(prev).set(newAnalysis.id, file));
      
      // Load feature importance for new analysis
      loadFeatures(newAnalysis.id, file);
      
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze file');
    } finally {
      setUploading(false);
    }
  };

  const loadFeatures = async (analysisId: string, fileToAnalyze: File) => {
    setLoadingFeatures(true);
    
    try {
      const formData = new FormData();
      formData.append('file', fileToAnalyze);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}upload/feature-importance`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.importances_dict) {
          const features = Object.entries(data.importances_dict)
            .map(([k, v]) => ({ name: k, value: v }))
            .sort((a: any, b: any) => b.value - a.value)
            .slice(0, 20);
          
          updateAnalysis(analysisId, { featureImportance: features });
        }
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const handleGenerateInterpretation = async () => {
    if (!currentAnalysis?.featureImportance || currentAnalysis.featureImportance.length === 0) return;
    
    setGeneratingInterpretation(true);
    try {
      const topFeatures = currentAnalysis.featureImportance.slice(0, 10);
      const featureList = topFeatures.map((f: any) => `${f.name}: ${f.value.toFixed(4)}`).join('\n');
      
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
        updateAnalysis(currentAnalysis.id, { interpretation: data.interpretation });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingInterpretation(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!currentAnalysis) return;
    
    setGeneratingReport(true);
    const reportData = {
      attack_summary: currentAnalysis.attack_counts,
      classification_report: { accuracy: 0.98, precision: 0.96, recall: 0.94 },
      threat_statistics: {
        total: currentAnalysis.total_flows,
        malicious: currentAnalysis.total_flows - (currentAnalysis.attack_counts['Benign'] || 0),
        benign: currentAnalysis.attack_counts['Benign'] || 0
      },
      attack_counts: currentAnalysis.attack_counts,
      protocol_counts: currentAnalysis.protocol_counts
    };
    
    const result = await generateReport(reportData);
    updateAnalysis(currentAnalysis.id, { report: result });
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
    if (!currentAnalysis) return;
    
    if (type === 'interpretation' && currentAnalysis.interpretation) {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SHAP Feature Interpretation', margin, margin);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`File: ${currentAnalysis.filename}`, margin, margin + 10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 17);
      
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(currentAnalysis.interpretation, maxWidth);
      let y = margin + 30;
      
      lines.forEach((line: string) => {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 7;
      });
      
      doc.save(`shap_interpretation_${currentAnalysis.filename.replace('.csv', '')}.pdf`);
    } else if (type === 'report') {
      try {
        const reportData = {
          attack_summary: currentAnalysis.attack_counts,
          classification_report: { accuracy: 0.98, precision: 0.96, recall: 0.94 },
          threat_statistics: {
            total: currentAnalysis.total_flows,
            malicious: currentAnalysis.total_flows - (currentAnalysis.attack_counts['Benign'] || 0),
            benign: currentAnalysis.attack_counts['Benign'] || 0
          },
          attack_counts: currentAnalysis.attack_counts,
          protocol_counts: currentAnalysis.protocol_counts
        };
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}reports/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportData)
        });
        
        if (response.ok) {
          const data = await response.json();
          const pdfBlob = base64ToBlob(data.pdf, 'application/pdf');
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentAnalysis.filename.replace('.csv', '')}_${data.filename}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('PDF generation error:', error);
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

  const toggleExpanded = (id: string) => {
    setExpandedAnalyses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const results = currentAnalysis;
  const attackDist = results?.attack_counts 
    ? Object.entries(results.attack_counts).map(([name, value]) => ({ name, value }))
    : [];

  const protocolDist = results?.protocol_counts
    ? Object.entries(results.protocol_counts).map(([name, value]) => ({ name, value }))
    : [];

  const total = results?.total_flows || 0;
  const benign = results?.attack_counts?.['Benign'] || 0;
  const malicious = total - benign;

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white p-6 mt-[47px]">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#bfbfbf]" />
            <div>
              <h1 className="text-3xl font-bold text-[#e3e3e3]">
                CSV File Analysis
              </h1>
              <p className="text-gray-400 text-sm">Upload multiple files for comparative threat analysis</p>
            </div>
          </div>
          {analyses.length > 0 && (
            <div className="text-sm text-gray-400">
              {analyses.length} file{analyses.length > 1 ? 's' : ''} analyzed
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Previous Analyses - Minimized */}
        {analyses.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <FileText className="mr-2 h-4 w-4 text-gray-400" />
                Previous Analyses ({analyses.length - 1})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analyses.slice(1).map((analysis) => (
                  <div key={analysis.id} className="border border-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 bg-gray-800/50 cursor-pointer hover:bg-gray-800"
                      onClick={() => toggleExpanded(analysis.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">{analysis.filename}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(analysis.uploadedAt).toLocaleString()} • {analysis.total_flows.toLocaleString()} flows
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                            {analysis.attack_counts['Benign'] || 0} benign
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
                            {analysis.total_flows - (analysis.attack_counts['Benign'] || 0)} threats
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentAnalysis(analysis.id);
                          }}
                          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAnalysis(analysis.id);
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedAnalyses.has(analysis.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedAnalyses.has(analysis.id) && (
                      <div className="p-4 bg-gray-900/30 border-t border-gray-700">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          {Object.entries(analysis.attack_counts).map(([attack, count]) => (
                            <div key={attack} className="flex justify-between">
                              <span className="text-gray-400">{attack}:</span>
                              <span className="text-white font-medium">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5 text-blue-400" />
              Upload New CSV File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-[#6a6a6a] transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                  <p className="text-lg font-medium text-white mb-2">
                    {file ? file.name : 'Click to select CSV file'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Maximum 100,000 rows will be processed
                  </p>
                </label>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-[#515151]/10 border border-[#515151]/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-2 bg-[#515151] hover:bg-[#6a6a6a] rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        Analyze File
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-300">{error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Analysis Results */}
        {results && (
          <>
            {/* File Info Banner */}
            <div className="bg-[#515151]/10 border border-[#515151]/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">Currently Viewing: {results.filename}</h3>
                  <p className="text-sm text-gray-300">Uploaded {new Date(results.uploadedAt).toLocaleString()}</p>
                </div>
                {(results.filename.endsWith('.pcap') || results.filename.endsWith('.pcapng')) && (
                  <button
                    onClick={async () => {
                      const file = uploadedFiles.get(results.id);
                      if (!file) return;
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}upload/convert-pcap`, {
                          method: 'POST',
                          body: formData,
                        });
                        
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${results.filename}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        }
                      } catch (error) {
                        console.error('Error downloading CSV:', error);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Converted CSV
                  </button>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Total Flows</p>
                      <p className="text-3xl font-bold text-white">{total.toLocaleString()}</p>
                    </div>
                    <Shield className="w-12 h-12 text-[#bfbfbf]" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Benign</p>
                      <p className="text-3xl font-bold text-green-400">{benign.toLocaleString()}</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Malicious</p>
                      <p className="text-3xl font-bold text-red-400">{malicious.toLocaleString()}</p>
                    </div>
                    <AlertCircle className="w-12 h-12 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attack Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="mr-2 h-5 w-5 text-purple-400" />
                    Attack Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {attackDist.map((item, index) => {
                      const value = Number(item.value);
                      const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-300 font-medium">{item.name}</span>
                            <span className="text-gray-400">{value.toLocaleString()} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Protocol Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-blue-400" />
                    Protocol Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={protocolDist}>
                        <XAxis dataKey="name" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#333', color: '#fff' }}
                        />
                        <Bar dataKey="value" fill="#33b5e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Section - Feature Importance + AI */}
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
                  ) : results.featureImportance && results.featureImportance.length > 0 ? (
                    <div className="h-[520px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={results.featureImportance} 
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
                            {results.featureImportance.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${260 - index * 8}, 70%, 60%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[500px] flex items-center justify-center text-gray-500">
                      <p>No feature importance data available</p>
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
                    disabled={generatingInterpretation || !results.featureImportance || results.featureImportance.length === 0}
                    className="w-full py-3 rounded-xl bg-[#515151] hover:bg-[#6a6a6a] text-white font-bold shadow-lg transition disabled:opacity-50 flex items-center justify-center"
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

                  {results.interpretation && (
                    <>
                      <div className="flex-1 p-4 rounded-lg bg-white/5 border border-white/10 overflow-y-auto custom-scrollbar max-h-[350px]">
                        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {results.interpretation}
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
                          onClick={() => downloadTXT(results.interpretation!, `shap_interpretation_${results.filename.replace('.csv', '')}.txt`)}
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

            {/* Threat Report */}
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
                    className="px-6 py-2.5 rounded-lg bg-[#515151] hover:bg-[#6a6a6a] text-white font-bold shadow-lg transition disabled:opacity-50 flex items-center whitespace-nowrap"
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

                {results.report && (
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
                        {results.report}
                      </pre>
                    </div>
                    <div className="flex flex-col gap-3">
                      <h4 className="font-bold text-white text-sm">Download Options</h4>
                      <button
                        onClick={() => downloadTXT(results.report!, `threat_report_${results.filename.replace('.csv', '')}.txt`)}
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
                          <strong>Note:</strong> PDF format includes proper formatting, headers, charts, and page breaks for professional documentation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Threats */}
            {results.recent_threats?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="mr-2 h-5 w-5 text-red-400" />
                    Recent Threats Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {results.recent_threats.map((threat: any, idx: number) => (
                      <div key={idx} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-bold text-red-300">{threat.attack}</p>
                          <p className="text-sm text-gray-400">
                            Flow #{threat.id} • Protocol: {threat.protocol}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Fwd: {threat.fwd_packets}</p>
                          <p className="text-xs text-gray-500">Bwd: {threat.bwd_packets}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && results && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowPreview(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {showPreview === 'interpretation' ? 'SHAP Interpretation' : 'Threat Report'} - {results.filename}
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
                {showPreview === 'interpretation' ? results.interpretation : results.report}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <AnalyzeProvider>
      <AnalyzePageContent />
    </AnalyzeProvider>
  );
}
