import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header with TrueGauge branding */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
            <span className="text-cyan-400" style={{ textShadow: '0 0 20px #22d3ee50' }}>TRUE</span>
            <span className="font-light text-zinc-300">GAUGE</span>
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/50">
            <Shield className="h-4 w-4 text-zinc-400" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">Privacy Policy</span>
          </div>
        </div>
        
        <p className="text-zinc-500 mb-8 text-center">Last updated: January 9, 2026</p>
        
        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>
              When you use TrueGauge, we collect information you provide directly, including your Google account 
              email address for authentication, and any business data you choose to input into the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>
              We use your information solely to provide and improve the Service. This includes authenticating 
              your identity, storing your business data, and generating analytics and reports for your use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Data Storage</h2>
            <p>
              Your data is stored securely using Supabase, a trusted cloud database provider. Each business 
              has its own isolated data space. We implement industry-standard security measures to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Sharing</h2>
            <p>
              We do not sell, trade, or share your personal or business data with third parties. Your data 
              is only shared with service providers necessary to operate the Service (e.g., authentication, hosting).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your data at any time. You may also request 
              a copy of your data or ask us to stop processing it. Contact us to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use tracking 
              cookies or share cookie data with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes 
              by posting the new policy on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Contact</h2>
            <p>
              For questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:hello@colsha.co" className="text-cyan-400 hover:underline">
                hello@colsha.co
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <a href="/" className="text-cyan-400 hover:underline text-sm">
            ← Back to TrueGauge
          </a>
        </div>
      </div>
    </div>
  )
}
