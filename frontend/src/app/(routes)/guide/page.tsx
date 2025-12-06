'use client';

import React, { useState } from 'react';
import { 
  Shield, Zap, Search, Bug, Globe, AlertTriangle, X, 
  MessageSquare, ChevronRight, Eye, Book, MessageCircle,
  type LucideIcon 
} from 'lucide-react';

// --- Types & Interfaces ---

interface AttackType {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  mitre_id: string;
  mitre_name: string;
  mitre_tactic: string;
  description: string;
}

interface LLMOutput {
  title: string;
  summary: string;
  detailed_explanation: string;
  indicators: string[];
  attacker_goals: string[];
  defender_actions: string[];
  examples: string[];
  risk_level: 'low' | 'medium' | 'high' | 'unknown';
  confidence: 'low' | 'medium' | 'high';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- Component ---

const MITREAttackGuide = () => {
  const [selectedAttack, setSelectedAttack] = useState<AttackType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState('summary');
  const [llmOutput, setLlmOutput] = useState<LLMOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const attackTypes: AttackType[] = [
    {
      id: 'benign',
      name: 'Benign Traffic',
      icon: Shield,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      mitre_id: 'N/A',
      mitre_name: 'Normal Network Activity',
      mitre_tactic: 'None',
      description: 'Legitimate network traffic and normal user behavior'
    },
    {
      id: 'dos',
      name: 'DoS Attack',
      icon: Zap,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      mitre_id: 'T1498',
      mitre_name: 'Network Denial of Service',
      mitre_tactic: 'Impact',
      description: 'Overwhelming system resources to deny service to legitimate users'
    },
    {
      id: 'bruteforce',
      name: 'Brute Force',
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      mitre_id: 'T1110',
      mitre_name: 'Brute Force',
      mitre_tactic: 'Credential Access',
      description: 'Systematic password guessing to gain unauthorized access'
    },
    {
      id: 'port_scan',
      name: 'Port Scanning',
      icon: Search,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      mitre_id: 'T1046',
      mitre_name: 'Network Service Discovery',
      mitre_tactic: 'Discovery',
      description: 'Probing systems to identify open ports and running services'
    },
    {
      id: 'malware',
      name: 'Malware',
      icon: Bug,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      mitre_id: 'T1204',
      mitre_name: 'User Execution',
      mitre_tactic: 'Execution',
      description: 'Malicious software designed to damage, disrupt, or gain unauthorized access'
    },
    {
      id: 'webattack',
      name: 'Web Attack',
      icon: Globe,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      mitre_id: 'T1190',
      mitre_name: 'Exploit Public-Facing Application',
      mitre_tactic: 'Initial Access',
      description: 'Exploiting vulnerabilities in web applications (SQLi, XSS, etc.)'
    }
  ];

  const callGroqAPI = async (attackType: AttackType, userRequest: string, isChatMessage = false) => {
    setIsLoading(true);
    
    // Note: In a production Next.js app, it is safer to move this API call 
    // to a Server Action or API Route to hide your API Key.
    const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (!apiKey) {
        setIsLoading(false);
        alert("Please set NEXT_PUBLIC_GROQ_API_KEY in your .env.local file");
        return;
    }

    const prompt = isChatMessage 
      ? `You are a cybersecurity MITRE ATT&CK expert. Answer this question about ${attackType.name} (MITRE ${attackType.mitre_id}: ${attackType.mitre_name}, Tactic: ${attackType.mitre_tactic}): ${userRequest}. Keep your response concise, educational, and fact-based. Do not output JSON for chat responses.`
      : `You are a cybersecurity MITRE ATT&CK expert.
Your job is to help users understand an attack type and its mapped MITRE technique.
You MUST follow these rules:
1. Stay fact-based and never hallucinate new techniques or behaviors.
2. Only reference the exact MITRE technique and attack type given.
3. You may expand ON the official MITRE definitions, but never alter them.
4. Keep explanations simple, direct, and visually clean.
5. Output only JSON. No prose outside JSON.

INPUT:
AttackType: ${attackType.id}
TechniqueID: ${attackType.mitre_id}
TechniqueName: ${attackType.mitre_name}
Tactic: ${attackType.mitre_tactic}
UserRequest: ${userRequest}

OUTPUT FORMAT (STRICT JSON):
{
  "title": "",
  "summary": "",
  "detailed_explanation": "",
  "indicators": [],
  "attacker_goals": [],
  "defender_actions": [],
  "examples": [],
  "risk_level": "low | medium | high",
  "confidence": "low | medium | high"
}

BEHAVIOR GUIDE:
- If the user clicks "Explain This Technique", deeply explain the MITRE technique.
- If the user clicks "Explain This Attack Type", summarize + compare with MITRE.
- Never include logs, packets, IPs, or details not provided.
- Explanations should sound like a cybersecurity analyst, not a generic assistant.`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      if (isChatMessage) {
        return content;
      } else {
        // Regex to extract JSON in case the LLM adds markdown code blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setLlmOutput(parsed);
          return parsed;
        } else {
          throw new Error('Invalid JSON response');
        }
      }
    } catch (error: any) {
      console.error('Groq API Error:', error);
      if (isChatMessage) {
        return `Error: Unable to process your request. ${error.message}`;
      } else {
        setLlmOutput({
          title: 'Error',
          summary: `Unable to fetch explanation: ${error.message}`,
          detailed_explanation: 'Please check your API key configuration.',
          indicators: [],
          attacker_goals: [],
          defender_actions: [],
          examples: [],
          risk_level: 'unknown',
          confidence: 'low'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainTechnique = () => {
    if (selectedAttack) {
      callGroqAPI(selectedAttack, 'explain technique');
    }
  };

  const handleDeepExplanation = () => {
    if (selectedAttack) {
      callGroqAPI(selectedAttack, 'deep explanation with technical details');
    }
  };

  const handleExplainAttackType = () => {
    if (selectedAttack) {
      callGroqAPI(selectedAttack, 'explain attack type');
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !selectedAttack) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    const response = await callGroqAPI(selectedAttack, chatInput, true);
    const assistantMessage: ChatMessage = { role: 'assistant', content: response };
    setChatMessages(prev => [...prev, assistantMessage]);
  };

  const getRiskColor = (level: string) => {
    const colors: Record<string, string> = {
      low: 'text-green-400 bg-green-500/20',
      medium: 'text-yellow-400 bg-yellow-500/20',
      high: 'text-red-400 bg-red-500/20'
    };
    return colors[level] || 'text-gray-400 bg-gray-500/20';
  };

  const Icon = selectedAttack?.icon || Shield;

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-gray-100 mt-[47px]">
      {/* Header */}
      <div className="border-b border-[#515151]/20 bg-[#1d1d1d]/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#bfbfbf]" />
            <div>
              <h1 className="text-2xl font-bold text-white">MITRE ATT&CK Education Guide</h1>
              <p className="text-sm text-gray-400">Interactive Cybersecurity Attack Analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-89px)]">
        {/* Left Panel - Attack Types */}
        <div className="w-80 border-r border-[#515151]/20 bg-[#1d1d1d]/30 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Attack Types</h2>
            <div className="space-y-2">
              {attackTypes.map((attack) => {
                const AttackIcon = attack.icon;
                return (
                  <button
                    key={attack.id}
                    onClick={() => {
                      setSelectedAttack(attack);
                      setLlmOutput(null);
                      setActiveTab('summary');
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedAttack?.id === attack.id
                        ? `${attack.bgColor} ${attack.borderColor} border-2`
                        : 'bg-[#515151]/10 border-[#515151]/20 hover:bg-[#515151]/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AttackIcon className={`w-5 h-5 mt-0.5 ${attack.color}`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1">{attack.name}</h3>
                        <p className="text-xs text-gray-400 mb-2">{attack.description}</p>
                        {attack.mitre_id !== 'N/A' && (
                          <div className="flex gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                              {attack.mitre_id}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">
                              {attack.mitre_tactic}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Panel - Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {selectedAttack ? (
              <>
                {/* Attack Header Card */}
                <div className={`p-6 rounded-xl border-2 ${selectedAttack.borderColor} ${selectedAttack.bgColor} mb-6`}>
                  <div className="flex items-start gap-4">
                    <Icon className={`w-12 h-12 ${selectedAttack.color}`} />
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-2">{selectedAttack.name}</h2>
                      <p className="text-gray-300 mb-4">{selectedAttack.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                          <span className="text-xs text-gray-400">MITRE ID:</span>
                          <span className="ml-2 text-sm font-mono text-blue-300">{selectedAttack.mitre_id}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                          <span className="text-xs text-gray-400">Technique:</span>
                          <span className="ml-2 text-sm text-purple-300">{selectedAttack.mitre_name}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                          <span className="text-xs text-gray-400">Tactic:</span>
                          <span className="ml-2 text-sm text-red-300">{selectedAttack.mitre_tactic}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LLM Output Section */}
                {llmOutput && (
                  <div className="mb-6">
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                      <div className="p-4 bg-gray-800/80 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-400" />
                          AI Analysis
                        </h3>
                        <button
                          onClick={() => setShowJson(!showJson)}
                          className="text-xs px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
                        >
                          {showJson ? 'Hide JSON' : 'Show JSON'}
                        </button>
                      </div>

                      {showJson ? (
                        <pre className="p-4 text-xs text-green-400 overflow-x-auto bg-gray-900 font-mono">
                          {JSON.stringify(llmOutput, null, 2)}
                        </pre>
                      ) : (
                        <div className="p-6">
                          <div className="flex items-start gap-3 mb-4">
                            <h3 className="text-xl font-bold text-white flex-1">{llmOutput.title}</h3>
                            {llmOutput.risk_level && (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(llmOutput.risk_level)}`}>
                                {llmOutput.risk_level.toUpperCase()} RISK
                              </span>
                            )}
                          </div>

                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Summary</h4>
                              <p className="text-gray-300 leading-relaxed">{llmOutput.summary}</p>
                            </div>

                            {llmOutput.detailed_explanation && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Detailed Explanation</h4>
                                <p className="text-gray-300 leading-relaxed">{llmOutput.detailed_explanation}</p>
                              </div>
                            )}

                            {llmOutput.indicators?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Indicators</h4>
                                <ul className="space-y-2">
                                  {llmOutput.indicators.map((indicator, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                                      <ChevronRight className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                      <span>{indicator}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {llmOutput.attacker_goals?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Attacker Goals</h4>
                                <ul className="space-y-2">
                                  {llmOutput.attacker_goals.map((goal, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                                      <ChevronRight className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                      <span>{goal}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {llmOutput.defender_actions?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Defender Actions</h4>
                                <ul className="space-y-2">
                                  {llmOutput.defender_actions.map((action, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                                      <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {llmOutput.examples?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Examples</h4>
                                <ul className="space-y-2">
                                  {llmOutput.examples.map((example, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                                      <ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                      <span>{example}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="mb-6 p-8 bg-gray-800/50 rounded-xl border border-gray-700 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Analyzing attack pattern...</p>
                  </div>
                )}

                {!llmOutput && !isLoading && (
                  <div className="text-center py-12">
                    <Book className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Select an action from the right panel to begin analysis</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Shield className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">Select an Attack Type</h3>
                  <p className="text-gray-500">Choose from the left panel to begin learning</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Actions */}
        <div className="w-72 border-l border-[#515151]/20 bg-[#1d1d1d]/30 p-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Actions</h2>
          <div className="space-y-3">
            <button
              onClick={handleExplainTechnique}
              disabled={!selectedAttack || isLoading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Book className="w-4 h-4" />
              Explain Technique
            </button>

            <button
              onClick={handleDeepExplanation}
              disabled={!selectedAttack || isLoading}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Deep Explanation
            </button>

            <button
              onClick={handleExplainAttackType}
              disabled={!selectedAttack || isLoading}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Explain Attack Type
            </button>

            <div className="pt-3 border-t border-gray-700">
              <button
                onClick={() => {
                  setChatOpen(true);
                  if (chatMessages.length === 0 && selectedAttack) {
                    setChatMessages([{
                      role: 'assistant',
                      content: `Hi! I'm your MITRE ATT&CK analyst. Ask me anything about ${selectedAttack.name} attacks.`
                    }]);
                  }
                }}
                disabled={!selectedAttack}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Open Analyst Chat
              </button>
            </div>
          </div>

          {selectedAttack && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Quick Reference</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-500">Attack:</span>
                  <span className="ml-2 text-white">{selectedAttack.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">MITRE ID:</span>
                  <span className="ml-2 text-blue-300 font-mono">{selectedAttack.mitre_id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tactic:</span>
                  <span className="ml-2 text-red-300">{selectedAttack.mitre_tactic}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Drawer */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl flex flex-col z-50">
          <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">Analyst Chat</h3>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-200 border border-gray-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                placeholder="Ask about this attack..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleChatSubmit}
                disabled={isLoading || !chatInput.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MITREAttackGuide;