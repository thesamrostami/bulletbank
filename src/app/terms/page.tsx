import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 block">
        ← Back to BulletBank
      </Link>

      <h1 className="text-2xl font-semibold mb-2">Terms of service</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: [DATE]</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-8">

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">What BulletBank is</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            BulletBank is a career tool that helps you build a bank of professional achievements,
            tailor your CV to specific roles, and track your job applications. It uses AI to help
            you produce stronger applications, faster. By using the service you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">What you can do</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            You may use BulletBank for your own personal job searching. That means creating and
            managing your own career profile, generating CVs and cover letters for roles you are
            genuinely applying for, and using any features the service provides for your own benefit.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">What you cannot do</h2>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside ml-1">
            <li>Resell or sublicense access to the service, or use it on behalf of other people commercially</li>
            <li>Scrape, crawl, or systematically extract content or data from the service</li>
            <li>Use it to create CVs or applications that are false or materially misleading to employers</li>
            <li>Attempt to reverse-engineer, circumvent, or abuse the service infrastructure</li>
            <li>Share your account credentials with others</li>
          </ul>
        </section>

        {/* TODO: Update or remove this section if you use a different service or region */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">AI-generated content</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            BulletBank uses AI to help generate CVs, cover letters, bullet points, and other
            application materials. These outputs are AI-assisted suggestions, not professional advice.
            You are responsible for reviewing all generated content for accuracy before submitting it
            to employers. Do not submit anything you have not read and verified — AI can make mistakes,
            and misrepresenting yourself to employers is your responsibility, not ours.
          </p>
        </section>

        {/* TODO: Update or remove this section if you use a different service or region */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Credits and payments</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            BulletBank uses a credit system. Credits are deducted each time you use a paid feature.
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside ml-1">
            <li>Credits that have already been used are non-refundable</li>
            <li>
              Unused credits from a purchased pack can be refunded within 14 days of purchase,
              provided no credits from that pack have been used — this reflects your rights under
              applicable consumer law
            </li>
            <li>To request a refund, contact us at the address below before the 14-day window closes</li>
            <li>Free credits granted on signup have no monetary value and cannot be refunded</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Service availability</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            BulletBank is provided as-is. We do not guarantee any specific level of uptime or
            availability at this stage. We will do our best to keep the service running reliably,
            but we are not liable for losses caused by downtime, bugs, or service interruptions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Account termination</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            We reserve the right to suspend or terminate accounts that breach these terms, without
            prior notice. If you believe your account has been terminated in error, contact us using
            the address below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Contact</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            For questions about these terms, to request a refund, or to exercise any rights, contact
            us using the email address listed in the{' '}
            <Link href="/privacy" className="underline hover:text-gray-900">privacy notice</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Governing law</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            These terms are governed by the laws of the jurisdiction in which the operator of this service is established. Any disputes will be subject to the exclusive jurisdiction of the courts of that jurisdiction.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to BulletBank
        </Link>
      </div>
    </main>
  )
}
