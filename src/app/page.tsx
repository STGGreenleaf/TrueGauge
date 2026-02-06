'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { Gauge, Compass, Zap, Shield, ChevronRight, MapPin, TrendingUp, Eye, Play, CheckCircle2, MousePointerClick, Lock, Calculator } from 'lucide-react';
import { FuturisticGauge, SideGauge, MonthProgressBar } from '@/components/FuturisticGauge';
import StartupAnimation from '@/components/StartupAnimation';
import { createClient } from '@/lib/supabase/client';

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [processingAuth, setProcessingAuth] = useState(false);
  const [gaugeVisible, setGaugeVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [howVisible, setHowVisible] = useState(false);
  const [whoVisible, setWhoVisible] = useState(false);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const whoRef = useRef<HTMLDivElement>(null);
  
  // Handle OAuth code if it lands here instead of /auth/callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // Clear splash flag so dashboard shows animation
      sessionStorage.removeItem('splashShown');
      
      // Exchange code for session, then redirect to dashboard
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(() => {
        // Redirect to dashboard - animation will play there as overlay
        window.location.href = '/dashboard';
      }).catch(() => {
        window.location.href = '/dashboard';
      });
      
      // Show processing state while exchanging
      setProcessingAuth(true);
    }
  }, [searchParams]);
  
  // Scroll-triggered animations
  useEffect(() => {
    if (checking) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === gaugeRef.current) setGaugeVisible(true);
            if (entry.target === featuresRef.current) setFeaturesVisible(true);
            if (entry.target === howRef.current) setHowVisible(true);
            if (entry.target === whoRef.current) setWhoVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );
    
    const timer = setTimeout(() => {
      // Check if already in view before observing
      const checkVisible = (el: HTMLElement | null, setter: (v: boolean) => void) => {
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight * 0.8) {
            setter(true);
          } else {
            observer.observe(el);
          }
        }
      };
      
      checkVisible(gaugeRef.current, setGaugeVisible);
      checkVisible(featuresRef.current, setFeaturesVisible);
      checkVisible(howRef.current, setHowVisible);
      checkVisible(whoRef.current, setWhoVisible);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [checking]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            router.replace('/dashboard');
            return;
          }
        }
      } catch {
        // Not logged in
      }
      setChecking(false);
    };
    checkAuth();
  }, [router]);

  // Show black screen while exchanging auth code (brief moment)
  if (processingAuth) {
    return <div className="min-h-screen bg-black" />;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xs tracking-widest text-zinc-600">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Ambient background - matching dashboard/manual */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
        {/* Subtle grid overlay for HUD feel */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        {/* Large radial glow behind hero - the "sparkle" */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 35%, transparent 55%)',
          }}
        />
        
        {/* Logo */}
        <div className="mb-6 relative">
          {/* Outer soft glow */}
          <div className="absolute inset-0 bg-cyan-400/25 blur-[80px] rounded-full scale-[3]" />
          {/* Inner bright glow */}
          <div className="absolute inset-0 bg-cyan-300/30 blur-[40px] rounded-full scale-[2]" />
          {/* Core glow */}
          <div className="absolute inset-0 bg-cyan-200/20 blur-[20px] rounded-full scale-150" />
          <Image
            src="/truegauge_icon.png"
            alt="TrueGauge"
            width={140}
            height={140}
            priority
            className="relative z-10"
          />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-center">
          <span className="text-cyan-400" style={{ textShadow: '0 0 30px #22d3ee40' }}>TRUE</span>
          <span className="font-light text-zinc-200">GAUGE</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-zinc-400 text-center max-w-lg mb-3 font-light">
          Your cockpit view for business health.
        </p>
        <p className="text-sm text-zinc-500 text-center max-w-md mb-10">
          Built for the owner who checks their bank balance at 2am.
        </p>

        {/* CTA */}
        <Link
          href="/login"
          className="group flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-all duration-300 shadow-[0_0_30px_#22d3ee30] hover:shadow-[0_0_40px_#22d3ee50]"
        >
          <span>Get Started</span>
          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-zinc-400">
          <span className="text-sm uppercase tracking-widest">Learn More</span>
          <div className="w-px h-10 bg-gradient-to-b from-zinc-400 to-transparent" />
        </div>
      </section>

      {/* Pain Point Section */}
      <section className="relative z-10 py-20 px-6 border-t border-zinc-800/50 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[800px] h-[800px] rounded-full blur-[100px]"
            style={{ 
              background: 'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 60%)',
              left: '-10%',
              top: '20%',
              animation: 'orbFloat1 8s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute w-[700px] h-[700px] rounded-full blur-[100px]"
            style={{ 
              background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 60%)',
              right: '-15%',
              bottom: '-10%',
              animation: 'orbFloat2 10s ease-in-out infinite'
            }}
          />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-2xl md:text-3xl text-zinc-300 font-light leading-relaxed mb-6">
            It&apos;s the 23rd of the month.
          </p>
          <p className="text-3xl md:text-4xl text-white font-semibold leading-relaxed mb-6">
            Will you cover your expenses?
          </p>
          <p className="text-lg text-zinc-500 max-w-xl mx-auto">
            Most owners don&apos;t know the answer until it&apos;s too late. They&apos;re buried in receipts, 
            guessing at margins, hoping the math works out. TrueGauge gives you the answer — every single day.
          </p>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              See it at a glance
            </h2>
            <p className="text-zinc-400">
              A real-time instrument panel. Not a spreadsheet.
            </p>
          </div>

          {/* Stylized Dashboard Mockup - Using Actual Components */}
          <div className="relative rounded-2xl border border-cyan-500/30 bg-[#0a0a0f] overflow-hidden shadow-[0_0_60px_rgba(34,211,238,0.12),0_0_90px_rgba(139,92,246,0.08),0_20px_50px_-12px_rgba(0,0,0,0.75)]">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-violet-500/10" />
            
            {/* Dashboard Header */}
            <div className="relative border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400 uppercase tracking-wider">
                <span className="text-zinc-300 font-medium">Brightline Supply Co.</span>
                <span className="text-zinc-600">•</span>
                <span>As of Aug 23</span>
                <span className="text-zinc-500">(Day 23 of 31)</span>
              </div>
              <div className="text-xs text-cyan-400">2,137 Days in Business</div>
            </div>

            {/* Progress Bar - Using Actual Component */}
            <div className="relative px-6 py-3 border-b border-zinc-800/30">
              <MonthProgressBar current={gaugeVisible ? 23 : 0} total={31} label="August Progress" />
            </div>

            {/* Dashboard Content - Using Actual Components */}
            <div ref={gaugeRef} className="relative p-6 md:p-10">
              {/* Mobile: Side gauges in row above main gauge */}
              <div className="flex md:hidden justify-center gap-8 mb-6">
                <SideGauge 
                  value={gaugeVisible ? 2340 : 0} 
                  label="Pace Delta" 
                  subValue="ahead"
                  variant="left"
                  status="positive"
                  fillOverride={gaugeVisible ? 0.6 : 0}
                />
                <SideGauge 
                  value={gaugeVisible ? 1320 : 0} 
                  label="Velocity" 
                  subValue="$1.3k/day"
                  variant="right"
                  status="negative"
                  fillOverride={gaugeVisible ? 0.35 : 0}
                />
              </div>
              
              {/* Mobile: Center gauge */}
              <div className="flex md:hidden justify-center">
                <FuturisticGauge 
                  value={gaugeVisible ? 78 : 0} 
                  label="SURVIVAL"
                  subLabel="Goal: $38,500"
                  size={280}
                  nutRemaining={gaugeVisible ? 8470 : 38500}
                  nutTotal={38500}
                />
              </div>

              {/* Desktop: All gauges in a row */}
              <div className="hidden md:flex items-center justify-center gap-8">
                <SideGauge 
                  value={gaugeVisible ? 2340 : 0} 
                  label="Pace Delta" 
                  subValue="ahead"
                  variant="left"
                  status="positive"
                  fillOverride={gaugeVisible ? 0.6 : 0}
                />
                <FuturisticGauge 
                  value={gaugeVisible ? 78 : 0} 
                  label="SURVIVAL"
                  subLabel="Goal: $38,500"
                  size={320}
                  nutRemaining={gaugeVisible ? 8470 : 38500}
                  nutTotal={38500}
                />
                <SideGauge 
                  value={gaugeVisible ? 1320 : 0} 
                  label="Velocity" 
                  subValue="$1.3k/day"
                  variant="right"
                  status="negative"
                  fillOverride={gaugeVisible ? 0.35 : 0}
                />
              </div>

              {/* Last Year Comparison */}
              <div className="mt-6 text-center text-sm text-zinc-500">
                LY 2024: <span className="text-zinc-400">$36,200</span>
                <span className="text-cyan-400 ml-3">+$2,340</span>
                <span className="text-zinc-600 ml-1">vs pace (est)</span>
              </div>
            </div>

            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
          </div>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Brightline Supply Co. — Day 23, slightly ahead of pace
          </p>
        </div>
      </section>

      {/* What It Does */}
      <section className="relative z-10 py-14 px-6 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5">
              <Gauge className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">What It Does</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              One glance. Full picture.
            </h2>
            
            <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              TrueGauge shows you exactly where your business stands — are you on pace this month? 
              Is your cash healthy? What do you need to hit your goals? No noise, just&nbsp;signal.
            </p>
          </div>

          {/* Feature Cards */}
          <div ref={featuresRef} className="grid md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/30 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Calculator className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Survival Math, Simplified</h3>
              </div>
              <p className="text-zinc-500 text-sm">Your NUT. Your margin. Your goal. TrueGauge does the math so you don&apos;t have to.</p>
            </div>
            
            <div className={`p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/30 transition-all duration-700 delay-100 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Compass className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Real Pace Tracking</h3>
              </div>
              <p className="text-zinc-500 text-sm">Know if you&apos;re ahead or behind based on actual open days, not calendar math.</p>
            </div>
            
            <div className={`p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/30 transition-all duration-700 delay-200 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">No Bank Linking</h3>
              </div>
              <p className="text-zinc-500 text-sm">You enter the numbers you trust. Simple, secure, and in your control.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tap to Learn Banner */}
      <section className="relative z-10 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-6 md:p-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5 overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(34,211,238,0.1)_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(139,92,246,0.08)_0%,transparent_50%)]" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <MousePointerClick className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Every number tells a story</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Tap any metric to see exactly how it&apos;s calculated. Revenue breakdown, margin math, 
                  runway projections — nothing is hidden. Built for clarity, not&nbsp;complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5">
              <Play className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">How It Works</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              30 seconds. Every day.
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              A simple habit that keeps you oriented. No spreadsheets, no&nbsp;complexity.
            </p>
          </div>

          <div ref={howRef} className="grid md:grid-cols-3 gap-8">
            <div className={`relative transition-all duration-700 ${howVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl border border-cyan-500/30">1</div>
                <h3 className="text-lg font-semibold text-white">Log today&apos;s sales</h3>
              </div>
              <p className="text-zinc-500 text-sm pl-16">Pull the number from your POS or daily report. Takes 10 seconds.</p>
              <div className="hidden md:block absolute top-6 left-[60px] w-[calc(100%-60px)] h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
            </div>

            <div className={`relative transition-all duration-700 delay-100 ${howVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl border border-cyan-500/30">2</div>
                <h3 className="text-lg font-semibold text-white">Check your gauges</h3>
              </div>
              <p className="text-zinc-500 text-sm pl-16">See your pace, survival %, and cash position update instantly.</p>
              <div className="hidden md:block absolute top-6 left-[60px] w-[calc(100%-60px)] h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
            </div>

            <div className={`transition-all duration-700 delay-200 ${howVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl border border-cyan-500/30">3</div>
                <h3 className="text-lg font-semibold text-white">Know where you stand</h3>
              </div>
              <p className="text-zinc-500 text-sm pl-16">Close the app and run your business with confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Free. Private. Yours. Banner */}
      <section className="relative z-10 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-6 md:p-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(139,92,246,0.1)_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(34,211,238,0.08)_0%,transparent_50%)]" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Lock className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Free. Private. Yours.</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  No subscription, no bank linking, no data harvesting. Just enter your numbers and get answers. 
                  TrueGauge is free to use and your data stays yours.&nbsp;Always.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="relative z-10 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">Who It&apos;s For</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Built for operators
            </h2>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Small business owners are drowning in data but starving for insight. TrueGauge changes&nbsp;that.
            </p>
          </div>
          
          <div ref={whoRef} className="grid md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/30 transition-all duration-700 ${whoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Know Where You Stand</h3>
              </div>
              <p className="text-zinc-500 text-sm">Most owners operate on gut feel. TrueGauge gives you a fixed point of reference — your survival number, your pace, your cash position. No more wondering.</p>
            </div>
            
            <div className={`p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/30 transition-all duration-700 delay-100 ${whoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Pace That Reflects Reality</h3>
              </div>
              <p className="text-zinc-500 text-sm">Calendar math lies. A Tuesday isn&apos;t the same as a Saturday. TrueGauge weighs your actual open hours so you know if you&apos;re truly ahead or behind.</p>
            </div>
            
            <div className={`p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:border-cyan-500/30 transition-all duration-700 delay-200 ${whoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Eye className="h-5 w-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Truth Over Vibes</h3>
              </div>
              <p className="text-zinc-500 text-sm">Estimates are labeled as estimates. Missing data shows up as missing. You always know what&apos;s real and what&apos;s projected — no false confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Mode Callout */}
      <section className="relative z-10 py-10 px-6 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto">
          <div className="relative p-6 md:p-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(139,92,246,0.1)_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(34,211,238,0.08)_0%,transparent_50%)]" />
            
            <div className="relative flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Try it before you commit</h3>
                <p className="text-zinc-400 text-sm">
                  Explore TrueGauge with sample data before entering your own numbers. 
                  See exactly how it works — no setup required.
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-violet-400 mt-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Demo mode included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="relative z-10 py-14 px-6 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute w-[700px] h-[700px] rounded-full blur-[100px]"
            style={{ 
              background: 'radial-gradient(circle, rgba(34,211,238,0.45) 0%, transparent 60%)',
              right: '-10%',
              top: '-20%',
              animation: 'orbFloat3 9s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute w-[600px] h-[600px] rounded-full blur-[100px]"
            style={{ 
              background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 60%)',
              left: '-15%',
              bottom: '-30%',
              animation: 'orbFloat4 11s ease-in-out infinite'
            }}
          />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-2xl md:text-3xl text-zinc-300 font-light leading-relaxed mb-6">
            &ldquo;Running a business has enough noise. TrueGauge is the calm cockpit view 
            that helps you orient fast and stay on&nbsp;course.&rdquo;
          </p>
          <p className="text-sm text-zinc-500 mb-6">— The TrueGauge philosophy</p>
          <div className="w-16 h-px bg-cyan-500/50 mx-auto" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-14 px-6 border-t border-zinc-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to see clearly?
          </h2>
          <p className="text-zinc-400 mb-8">
            Free to use. Takes 2 minutes to set up.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-all duration-300 shadow-[0_0_30px_#22d3ee30] hover:shadow-[0_0_40px_#22d3ee50]"
          >
            <span>Get Started</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/truegauge_icon.png"
                alt="TrueGauge"
                width={32}
                height={32}
              />
              <span className="text-sm font-medium text-zinc-400">TrueGauge</span>
            </div>
            
            {/* Links */}
            <div className="flex items-center gap-8 text-sm">
              <Link href="/manual" className="text-zinc-500 hover:text-cyan-400 transition-colors">
                Manual
              </Link>
              <Link href="/privacy" className="text-zinc-500 hover:text-cyan-400 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-zinc-500 hover:text-cyan-400 transition-colors">
                Terms
              </Link>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} TrueGauge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-xs tracking-widest text-zinc-600">LOADING...</div></div>}>
      <LandingPageContent />
    </Suspense>
  );
}
