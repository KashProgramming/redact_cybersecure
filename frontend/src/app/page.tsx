"use client"


import React, { useEffect, useRef } from "react";
import { Shield, Lock, Cloud, Zap, CheckCircle, Users } from "lucide-react";
import ModelStatsCard from "@/components/ModelStatsCard";
import Link from "next/link";

export default function Landing() {
  const vantaRef = useRef<HTMLDivElement | null>(null);
  const vantaEffectRef = useRef<any>(null);

  useEffect(() => {
    const threeScript = document.createElement("script");
    threeScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js";

    threeScript.onload = () => {
      const vantaScript = document.createElement("script");
      vantaScript.src =
        "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.globe.min.js";

      vantaScript.onload = () => {
        if (!vantaEffectRef.current && (window as any).VANTA && vantaRef.current) {
          vantaEffectRef.current = (window as any).VANTA.GLOBE({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            minHeight: 200,
            minWidth: 200,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0x515151,
            backgroundColor: 0x1d1d1d,
          });
        }
      };

      document.body.appendChild(vantaScript);
    };

    document.body.appendChild(threeScript);

    return () => {
      if (vantaEffectRef.current) vantaEffectRef.current.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1d1d1d] text-white overflow-hidden">
      {/* Ambient Glows */}
      {/* <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1d1d1d] via-[#262626] to-[#3a3a3a]" />
        <div className="absolute top-[10%] left-1/4 w-80 h-80 bg-[#515151]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-[10%] w-80 h-80 bg-[#6a6a6a]/20 rounded-full blur-3xl animate-pulse" />
      </div> */}

      {/* Ambient Interactive Glows */}
<div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">

  {/* Soft radial base wash */}
  <div className="absolute inset-0 bg-gradient-to-br from-[#1d1d1d] via-[#222222] to-[#3a3a3a]" />

  {/* Glow 1 – Floating metallic orb */}
  <div
    className="
      absolute top-[12%] left-[18%] 
      w-[420px] h-[420px] 
      bg-[#515151]/25 
      rounded-full 
      blur-[120px] 
      animate-glowFloat1
    "
  />

  {/* Glow 2 – Smooth pulsing ambient halo */}
  <div
    className="
      absolute bottom-[20%] right-[10%] 
      w-[500px] h-[500px] 
      bg-[#6a6a6a]/20 
      rounded-full 
      blur-[150px] 
      animate-glowPulse
    "
  />

  {/* Glow 3 – Rotating soft-back glow */}
  <div
    className="
      absolute top-[40%] left-[50%] 
      w-[600px] h-[600px] 
      bg-[#3a3a3a]/20 
      rounded-full 
      blur-[200px]
      animate-slowRotate
    "
  />

</div>



      {/* Hero Section */}
      <section ref={vantaRef} className="w-screen h-screen mt-[47px]">
        <div className="w-full h-full relative z-10 grid md:grid-cols-2 gap-12 items-center px-8">
          
          <div className="pl-4">
            <p className="text-[#bfbfbf] text-sm mb-4 ml-2 tracking-wider">
              SIMPLIFY YOUR SECURITY
            </p>

            <h1 className="text-6xl font-bold mb-6 leading-tight text-[#e3e3e3]">
              CyberSecure
            </h1>

            <p className="text-3xl font-light mb-4 text-[#cfcfcf]">
              Turning network data into security intelligence
            </p>

            <p className="text-gray-400 mb-8 leading-relaxed">
              CyberSecure is simple and easy to use — no IT department required.
              Your team stays secured from anywhere in the world.
            </p>

            {/* Buttons */}
            <div className="flex space-x-4">
               {/* <Link href="/analyze"> 
              <button className="bg-[#515151] hover:bg-[#6a6a6a] px-8 py-3 rounded-full font-semibold transition">
                SIGN UP NOW
              </button>
              </Link> */}
 <Link href="/guide">
              <button className="border border-[#515151]/60 hover:border-[#6a6a6a] px-8 py-3 rounded-full font-semibold transition">
                READ MORE
              </button>
               </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why SkyFort Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <p className="text-[#bfbfbf] text-sm mb-4 tracking-wider">
            POWERFUL FEATURES
          </p>
          <h2 className="text-4xl font-bold mb-4">Why CyberSecure</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Advanced AI-powered intrusion detection with real-time monitoring,
            comprehensive analytics, and MITRE ATT&CK mapping.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Shield,
              title: "AI-Powered Detection",
              desc: "XGBoost model with 98% accuracy for real-time threat identification.",
            },
            {
              icon: Zap,
              title: "Live Monitoring",
              desc: "Real-time network flow analysis with instant threat classification.",
            },
            {
              icon: CheckCircle,
              title: "SHAP Interpretability",
              desc: "Understand model decisions with feature importance analysis.",
            },
          ].map((box, i) => (
            <div
              key={i}
              className="bg-[#515151]/10 border border-[#515151]/30 rounded-2xl p-8 backdrop-blur-sm hover:border-[#6a6a6a]/50 transition"
            >
              <div className="bg-gradient-to-br from-[#515151] to-[#6a6a6a] w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <box.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-xl font-bold mb-4">{box.title}</h3>
              <p className="text-gray-400">{box.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Lock, title: "Dashboard Analytics", desc: "Comprehensive threat statistics and visualizations" },
            { icon: Shield, title: "Attack Classification", desc: "Detect DoS, Brute Force, Malware, Web Attacks" },
            { icon: Cloud, title: "CSV File Analysis", desc: "Upload and analyze custom network flow data" },
            { icon: Users, title: "MITRE ATT&CK Guide", desc: "Interactive cybersecurity education tool" },
            { icon: Zap, title: "PDF Reports", desc: "Professional reports with charts and AI insights" },
            { icon: CheckCircle, title: "Multi-File Support", desc: "Analyze multiple datasets simultaneously" },
            { icon: Lock, title: "Feature Importance", desc: "SHAP values for model transparency" },
            { icon: Shield, title: "Persistent State", desc: "Context-based data persistence across sessions" },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-[#515151]/10 border border-[#515151]/20 rounded-xl p-6 backdrop-blur-sm hover:border-[#6a6a6a]/40 transition"
            >
              <f.icon className="w-8 h-8 text-[#bfbfbf] mb-4" />
              <h4 className="font-semibold mb-2">{f.title}</h4>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Model Stats Component */}
      <ModelStatsCard />

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
       

        <Link href="/analyze">
        <button className="bg-[#515151] hover:bg-[#6a6a6a] px-10 py-4 rounded-full text-lg font-semibold transition">
          Get Started Now
        </button></Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#515151]/20 mt-20">
        <div className="max-w-7xl mx-auto px-8 py-12 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-[#bfbfbf]" />
            <span className="text-xl font-bold">CyberSecure</span>
          </div>

          <div className="text-gray-400 text-sm">
            © 2025 CyberSecure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
