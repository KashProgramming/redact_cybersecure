"use client";
import React from 'react';
import { Cloud, Lock, Shield, Database, Key } from 'lucide-react';

const CloudSecurityViz = () => {
  return (
    <div className="relative w-full h-[600px] bg-slate-900 flex items-center justify-center overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>

      {/* 3D Scene Container */}
      <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1000px' }}>
        
        {/* ROTATING GROUP - This holds the perspective */}
        <div className="relative w-[400px] h-[400px]" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(60deg) rotateZ(-45deg)' }}>

          {/* --- CONNECTION GRID (Floor) --- */}
          <div className="absolute inset-0 border-2 border-white/5 rounded-full scale-150" style={{ transform: 'translateZ(-40px)' }}></div>
          <div className="absolute inset-0 border border-white/5 rounded-full scale-110 border-dashed" style={{ transform: 'translateZ(-40px)' }}></div>

          {/* --- CONNECTING LINES (SVG) --- */}
          {/* These lines lie flat on the plane to connect the base of the items */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ transform: 'translateZ(-10px)' }}>
            {/* Line to Top Left (Lock) */}
            <line x1="50%" y1="50%" x2="20%" y2="20%" className="stroke-blue-400/30 stroke-2" strokeDasharray="5,5">
               <animate attributeName="stroke-dashoffset" from="10" to="0" dur="2s" repeatCount="indefinite" />
            </line>
            {/* Line to Bottom Right (Shield) */}
            <line x1="50%" y1="50%" x2="80%" y2="80%" className="stroke-purple-400/30 stroke-2" strokeDasharray="5,5" />
            {/* Line to Top Right (Database) */}
            <line x1="50%" y1="50%" x2="80%" y2="20%" className="stroke-cyan-400/30 stroke-2" strokeDasharray="5,5" />
          </svg>

          {/* --- CENTER: MAIN CLOUD PLATFORM --- */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48" style={{ transform: 'translateZ(20px)' }}>
            {/* Platform Base Shadow */}
            <div className="absolute inset-0 bg-blue-900/40 blur-xl rounded-full transform translate-z-[-20px]"></div>
            
            {/* The Platform Itself */}
            <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-3xl shadow-2xl flex items-center justify-center group transition-all duration-500 hover:scale-105 hover:shadow-blue-500/20">
              <div className="absolute inset-0 bg-blue-500/10 rounded-3xl animate-pulse"></div>
              
              {/* Counter-rotate the icon so it faces the user */}
              <div style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                 <Cloud className="w-20 h-20 text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
              </div>

              {/* Little data dots moving on the platform */}
              <div className="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
            </div>
          </div>

          {/* --- SATELLITE 1: LOCK (Top Left) --- */}
          <div className="absolute top-[10%] left-[10%] w-24 h-24 animate-float-slow" style={{ transform: 'translateZ(60px)' }}>
             <div className="relative w-full h-full bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center">
                <div style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                  <Lock className="w-10 h-10 text-white/90" />
                </div>
                {/* Floating badge */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
             </div>
          </div>

          {/* --- SATELLITE 2: SHIELD (Bottom Right) --- */}
          <div className="absolute bottom-[10%] right-[10%] w-28 h-28 animate-float-delayed" style={{ transform: 'translateZ(80px)' }}>
            <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center">
                <div style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                  <Shield className="w-12 h-12 text-white/90" />
                </div>
            </div>
          </div>

          {/* --- SATELLITE 3: DATABASE/KEY (Top Right) --- */}
          <div className="absolute top-[10%] right-[10%] w-20 h-20 animate-float" style={{ transform: 'translateZ(40px)' }}>
            <div className="relative w-full h-full bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center">
                <div style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                  <Database className="w-8 h-8 text-white/90" />
                </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateZ(40px) translateY(0px); }
          50% { transform: translateZ(40px) translateY(-10px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateZ(60px) translateY(0px); }
          50% { transform: translateZ(60px) translateY(-15px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateZ(80px) translateY(0px); }
          50% { transform: translateZ(80px) translateY(-12px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 5s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 4.5s ease-in-out infinite; animation-delay: 1s; }
      `}</style>
    </div>
  );
};

export default CloudSecurityViz;