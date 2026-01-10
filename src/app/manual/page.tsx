'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Nav } from '@/components/Nav';
import { 
  Gauge, 
  Compass, 
  Eye, 
  MousePointerClick, 
  MessageCircle, 
  Heart, 
  Shield, 
  FileText,
  Zap,
  BookOpen,
  X
} from 'lucide-react';

export default function ManualPage() {
  const [showVenmo, setShowVenmo] = useState(false);
  
  return (
    <div className="min-h-screen bg-black">
      {/* Ambient background - matching dashboard */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-violet-600/10 blur-[100px]" />
        {/* Subtle grid overlay for HUD feel */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <Nav showRefresh={false} showDashboard={true} />

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-14 pb-16">
        
        {/* Header - Glovebox Manual Style */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">Operator&apos;s Manual</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            <span className="text-cyan-400" style={{ textShadow: '0 0 20px #22d3ee50' }}>TRUE</span>
            <span className="font-light text-zinc-300">GAUGE</span>
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide">v1.0 • Instrument Panel Reference Guide</p>
        </div>

        {/* Quick Start */}
        <section className="mb-10 p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Zap className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Quick Start</h2>
          </div>
          <ol className="space-y-3 text-zinc-300 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
              <span>Fill in your <strong className="text-cyan-400">NUT</strong> (monthly overhead) in Settings</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
              <span>Log today&apos;s sales using the MTD Sales input</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
              <span>Check your gauges — you&apos;re navigating</span>
            </li>
          </ol>
        </section>

        {/* Why It Exists */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Compass className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Why It Exists</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            Running a business has enough noise. TrueGauge is the calm cockpit view that helps you orient fast, 
            stay on course, and make decisions without living inside spreadsheets.
          </p>
        </section>

        {/* What It Is */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Gauge className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">What It Is</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            A simple instrument panel for business health. Everything is clickable, and the tooltips act like 
            your onboard labels so you can understand each gauge as you go.
          </p>
        </section>

        {/* Who It Is For */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Eye className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Who It Is For</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed mb-4">
            Owners and operators who want a lightweight daily habit and a clear heading:
          </p>
          <ul className="space-y-2 text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Where are we right now?
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Are we tracking on pace this month?
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              What is real vs estimated?
            </li>
          </ul>
        </section>

        {/* How It Helps */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <MousePointerClick className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">How It Helps</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-cyan-400 mb-1">At-a-Glance Clarity</h3>
              <p className="text-zinc-400 text-sm">Your key instruments are front and center so you can get your bearings fast.</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-cyan-400 mb-1">Truth Over Vibes</h3>
              <p className="text-zinc-400 text-sm">Missing inputs show up as missing, estimates are labeled as estimates.</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-cyan-400 mb-1">Pace You Can Trust</h3>
              <p className="text-zinc-400 text-sm">Progress reflects real open days and store hours so you&apos;re not navigating off bad assumptions.</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-sm font-semibold text-cyan-400 mb-1">Click to Navigate</h3>
              <p className="text-zinc-400 text-sm">Tap into any gauge to drill down, check the math, and correct course if needed.</p>
            </div>
          </div>
        </section>

        {/* Glossary */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <BookOpen className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Glossary</h2>
          </div>
          <div className="grid gap-3">
            <div className="flex gap-4 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-cyan-400 font-mono text-sm font-semibold w-24 flex-shrink-0">NUT</span>
              <span className="text-zinc-400 text-sm">Monthly overhead — the number you need to cover before profit.</span>
            </div>
            <div className="flex gap-4 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-cyan-400 font-mono text-sm font-semibold w-24 flex-shrink-0">Runway</span>
              <span className="text-zinc-400 text-sm">Days of operating cash remaining based on current burn rate.</span>
            </div>
            <div className="flex gap-4 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-cyan-400 font-mono text-sm font-semibold w-24 flex-shrink-0">Confidence</span>
              <span className="text-zinc-400 text-sm">Data quality score — how much of your dashboard is real vs estimated.</span>
            </div>
            <div className="flex gap-4 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-cyan-400 font-mono text-sm font-semibold w-24 flex-shrink-0">Pace</span>
              <span className="text-zinc-400 text-sm">Your projected month-end based on actual open days, not calendar days.</span>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Support</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            The developer is a message away for fix-it items and feature requests. If something feels off, 
            call it out and we&apos;ll get you back on a clean line.
          </p>
        </section>

        {/* Pricing */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Heart className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Pricing & Support</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed mb-4">
            TrueGauge is currently <strong className="text-white">free</strong> and in test mode for the foreseeable future. Use it freely.
          </p>
          <p className="text-zinc-400 leading-relaxed">
            If it helps you and you want to support it:{' '}
            <button 
              onClick={() => setShowVenmo(true)}
              className="text-cyan-400 font-medium hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              Venmo @cgreenleaf
            </button>
          </p>
        </section>

        {/* Privacy */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Privacy</h2>
          </div>
          <p className="text-zinc-400 leading-relaxed mb-4">
            TrueGauge is designed to be <strong className="text-white">local-first</strong>.
          </p>
          <ul className="space-y-2 text-zinc-400 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5"></span>
              Your business data stays on your device by default
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5"></span>
              No required bank linking
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5"></span>
              No required account to get value from the tool
            </li>
          </ul>
          <p className="text-zinc-500 text-sm mt-4 italic">
            If this ever changes (analytics, accounts, cloud sync), the privacy statement will be updated clearly before it ships.
          </p>
        </section>

        {/* Terms */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-zinc-800">
              <FileText className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white uppercase tracking-wide">Terms of Use</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-4">By using TrueGauge, you agree:</p>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-zinc-300 font-medium">No financial advice:</span>
              <span className="text-zinc-500 ml-2">This is a visibility and planning tool, not accounting, tax, or legal advice.</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-zinc-300 font-medium">As-is:</span>
              <span className="text-zinc-500 ml-2">Use at your own risk. Verify important decisions with your own records.</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-zinc-300 font-medium">You own your data:</span>
              <span className="text-zinc-500 ml-2">You are responsible for protecting your device and any exports or backups.</span>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <span className="text-zinc-300 font-medium">Be cool:</span>
              <span className="text-zinc-500 ml-2">Do not abuse or attempt to disrupt the service.</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center border-t border-zinc-800/50 pt-8">
          <p className="text-zinc-600 text-xs uppercase tracking-[0.2em]">
            TrueGauge • Operator&apos;s Manual • v1.0
          </p>
        </footer>

      </main>

      {/* Venmo QR Popup */}
      {showVenmo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowVenmo(false)}
        >
          <div 
            className="relative bg-zinc-900 rounded-2xl border border-cyan-500/30 p-6 shadow-2xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVenmo(false)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-4">
              <p className="text-cyan-400 font-medium text-lg">Venmo @cgreenleaf</p>
              <p className="text-zinc-500 text-sm">Scan to support TrueGauge</p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <Image 
                src="/venmo_cgreenleaf.png" 
                alt="Venmo QR Code" 
                width={280} 
                height={280}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
