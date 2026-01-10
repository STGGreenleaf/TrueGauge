export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-zinc-500 mb-8">Last updated: January 9, 2026</p>
        
        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TrueGauge ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              TrueGauge is a business health dashboard that helps operators track and analyze their business metrics. 
              The Service is provided "as is" and we reserve the right to modify or discontinue it at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities 
              that occur under your account. You agree to notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. User Data</h2>
            <p>
              You retain ownership of all data you input into the Service. We will not share your data with third parties 
              except as necessary to provide the Service or as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p>
              You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, 
              or impair the Service. You may not attempt to gain unauthorized access to any part of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TrueGauge shall not be liable for any indirect, incidental, 
              special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the Service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Contact</h2>
            <p>
              For questions about these Terms, please contact us at{' '}
              <a href="mailto:collingreenleaf@gmail.com" className="text-cyan-400 hover:underline">
                collingreenleaf@gmail.com
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
