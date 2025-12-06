"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Database, Lock, Hash, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

// Types based on blockchain_ledger.json
interface Batch {
  batch_id: number;
  sealed_at: string;
  merkle_root: string;
  entry_count: number;
  signature: string;
}

interface Block {
  index: number;
  batch: Batch;
  prev_block_hash: string;
  block_hash: string;
  created_at: string;
}

interface Ledger {
  batch_size: number;
  open_entries: any[];
  sealed_batch_count: number;
  blocks: Block[];
  public_key_pem: string;
}

export default function BlockchainPage() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}blockchain/ledger`);
        if (!res.ok) throw new Error('Failed to fetch ledger');
        const data = await res.json();
        setLedger(data);
        if (data.blocks && data.blocks.length > 0) {
          setSelectedBlock(data.blocks[data.blocks.length - 1]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading Immutable Ledger...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-black text-red-500">Error: {error}</div>;
  if (!ledger) return null;

  return (
    <div className="min-h-screen bg-black text-white p-8 pt-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] animate-glowFloat1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px] animate-glowFloat1 delay-1000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4">
            Immutable Threat Log
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Cryptographically secured audit trail of all detected threats. 
            Verifiable via Merkle Trees and Digital Signatures.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatCard icon={<Database />} label="Total Blocks" value={ledger.blocks.length} color="blue" />
          <StatCard icon={<Shield />} label="Sealed Batches" value={ledger.sealed_batch_count} color="green" />
          <StatCard icon={<FileText />} label="Batch Size" value={ledger.batch_size} color="purple" />
          <StatCard icon={<Lock />} label="Security" value="RSA-2048" color="orange" />
        </div>

        {/* Main Content: Blocks List & Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Blocks List */}
          <div className="lg:col-span-1 space-y-4">
             <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
               <Clock className="w-5 h-5 text-blue-400" /> Recent Blocks
             </h2>
             <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
               {[...ledger.blocks].reverse().map((block) => (
                 <motion.div
                   key={block.index}
                   whileHover={{ scale: 1.02 }}
                   onClick={() => setSelectedBlock(block)}
                   className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                     selectedBlock?.index === block.index 
                       ? 'bg-blue-900/30 border-blue-500 shadow-lg shadow-blue-500/20' 
                       : 'bg-white/5 border-white/10 hover:bg-white/10'
                   }`}
                 >
                   <div className="flex justify-between items-center mb-2">
                     <span className="font-mono text-sm text-blue-300">#{block.index}</span>
                     <span className="text-xs text-gray-500">{new Date(block.created_at).toLocaleTimeString()}</span>
                   </div>
                   <div className="text-xs text-gray-400 truncate font-mono">
                     {block.block_hash.substring(0, 20)}...
                   </div>
                 </motion.div>
               ))}
             </div>
          </div>

          {/* Block Detail View */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Hash className="w-5 h-5 text-purple-400" /> Block Details
            </h2>
            {selectedBlock ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={selectedBlock.index}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-1">Block #{selectedBlock.index}</h3>
                    <p className="text-gray-400 text-sm">{new Date(selectedBlock.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Sealed & Verified</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <DetailRow label="Block Hash" value={selectedBlock.block_hash} copyable />
                  <DetailRow label="Previous Hash" value={selectedBlock.prev_block_hash || "Genesis Block"} copyable />
                  <DetailRow label="Merkle Root" value={selectedBlock.batch.merkle_root} copyable />
                  
                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div className="bg-black/20 p-4 rounded-lg">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Batch ID</span>
                      <p className="text-xl font-mono text-white mt-1">{selectedBlock.batch.batch_id}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-lg">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Entry Count</span>
                      <p className="text-xl font-mono text-white mt-1">{selectedBlock.batch.entry_count}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Digital Signature</span>
                    <div className="bg-black/40 p-4 rounded-lg font-mono text-xs text-gray-400 break-all border border-white/5">
                      {selectedBlock.batch.signature}
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                <Database className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a block to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* System Info Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Public Key */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-400" /> Public Key (PEM)
            </h3>
            <div className="bg-black/40 p-4 rounded-lg border border-white/5 overflow-x-auto">
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-all">
                {ledger.public_key_pem}
              </pre>
            </div>
          </div>

          {/* Pending Entries */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" /> Pending Entries ({ledger.open_entries.length})
            </h3>
            {ledger.open_entries.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {ledger.open_entries.map((entry: any, i: number) => (
                  <div key={i} className="bg-black/20 p-3 rounded border border-white/5 text-sm text-gray-300 font-mono">
                    {JSON.stringify(entry)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">No pending entries in the mempool.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  const colorClasses: any = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  };

  return (
    <div className={`p-6 rounded-xl border backdrop-blur-md ${colorClasses[color]}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-black/20`}>
          {React.cloneElement(icon, { className: "w-6 h-6" })}
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, copyable }: { label: string, value: string, copyable?: boolean }) {
  return (
    <div>
      <span className="text-gray-500 text-xs uppercase tracking-wider block mb-1">{label}</span>
      <div className="group relative">
        <p className="font-mono text-sm text-gray-300 break-all bg-white/5 p-3 rounded-lg border border-white/5 hover:border-white/20 transition-colors">
          {value}
        </p>
      </div>
    </div>
  );
}
