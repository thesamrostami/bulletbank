import Link from 'next/link'
import ManageCookiesButton from '@/components/ManageCookiesButton'

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-8 block">
        ← Back to BulletBank
      </Link>

      <h1 className="text-2xl font-semibold mb-2">Privacy notice</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: [DATE]</p>

      <div className="prose prose-sm prose-gray max-w-none space-y-8">

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">What BulletBank is</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            BulletBank is a career tool that helps you build a bank of professional achievements,
            tailor your CV to specific roles, and track your job applications. It uses AI to help
            you produce stronger applications, faster.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">What data we collect</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            BulletBank collects the information you provide to build and maintain your career profile:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside ml-1">
            <li>Your email address and password (used for authentication only)</li>
            <li>Personal information you enter: name, phone, location, LinkedIn and other profile URLs</li>
            <li>Career history: work experience, education, certifications, and projects</li>
            <li>Professional content: CV bullet points, summaries, cover letters, and career goals</li>
            <li>Job application records: companies applied to, application status, and interview notes</li>
            <li>Uploaded documents: CVs and cover letters you choose to upload</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">How we use your data</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your data is used solely to provide the BulletBank service to you. It is never sold, shared
            with third parties for marketing, or used to build advertising profiles.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Third-party services</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            BulletBank relies on the following third-party services:
          </p>

          <div className="space-y-4">
            {/* TODO: Update or remove this section if you use a different service or region */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">Supabase</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your data is stored in a Supabase database hosted in the European Union (Frankfurt, Germany).
                Supabase acts as a data processor under a Data Processing Agreement. Your data is encrypted
                at rest and in transit. Supabase does not use your data for any purpose other than
                providing database and authentication services.{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                  Supabase privacy policy →
                </a>
              </p>
            </div>

            {/* TODO: Update or remove this section if you use a different service or region */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">Anthropic (Claude AI)</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                When you use AI features (CV generation, cover letter writing, interview prep, bullet
                improvement), your career content is sent to Anthropic&apos;s API to generate responses.
                This includes your work history, skills, bullet points, and job descriptions — but
                not your contact details such as phone number or home address. Anthropic processes
                this data under their API terms and Data Processing Addendum and does not use API
                inputs to train their models by default.{' '}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                  Anthropic privacy policy →
                </a>
              </p>
            </div>

            {/* TODO: Update or remove this section if you use a different service or region */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">Lemon Squeezy (payments)</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                When you purchase credits, your payment is processed by Lemon Squeezy. They receive
                your email address and billing details to process the transaction. Lemon Squeezy is a
                merchant of record — they handle VAT and payment compliance on our behalf. They do not
                receive your career content or CV data.{' '}
                <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                  Lemon Squeezy privacy policy →
                </a>
              </p>
            </div>

            {/* TODO: Update or remove this section if you use a different service or region */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">Google Analytics (optional)</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Only loaded if you accept analytics cookies. Google Analytics collects anonymised
                usage data — page views, navigation patterns, device and browser type, and
                approximate location — to help us understand how the product is used and improve it.
                It does not receive your career content or CV data. You can withdraw consent at any
                time using the &ldquo;Manage cookies&rdquo; link.{' '}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                  Google privacy policy →
                </a>
              </p>
            </div>

            {/* TODO: Update or remove this section if you use a different service or region */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">Microsoft Clarity (optional)</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Only loaded if you accept analytics cookies. Microsoft Clarity records anonymised
                session interactions — clicks, scrolls, and heatmaps — to help us spot usability
                issues. Inputs are masked by default and it does not receive your career content or
                CV data. You can withdraw consent at any time using the &ldquo;Manage cookies&rdquo; link.{' '}
                <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                  Microsoft privacy statement →
                </a>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Cookies</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">Strictly necessary cookies</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Session cookies set by Supabase keep you signed in. These are essential for the
                service to function and cannot be disabled.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">Analytics cookies (optional, consent-based)</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                With your consent, we use Google Analytics (usage patterns and page views) and
                Microsoft Clarity (session recordings and heatmaps) to understand how the product is
                used and improve it. These are only loaded if you accept. You can withdraw consent at
                any time by clicking &ldquo;Manage cookies&rdquo; at the bottom of any page.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">How long we keep your data</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your data is kept for as long as your account exists. You can delete your data at any
            time from your profile settings. When you delete your account, all personal data,
            career content, and uploaded documents are permanently and irreversibly removed from
            all systems within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Your rights</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Under applicable data protection law, you have the right to:
          </p>
          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside ml-1">
            <li>Access the personal data held about you</li>
            <li>Correct inaccurate data (you can do this directly in the profile settings)</li>
            <li>Delete your data and account (available in profile settings → Danger zone)</li>
            <li>Data portability — export your data on request</li>
            <li>Object to processing — though this would prevent use of the service</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            To exercise any right or to ask a question about your data, open an issue on our GitHub repository or use the contact details provided in your instance&apos;s deployment. We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Legal basis for processing</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            BulletBank processes your personal data on the basis of your consent, given when you
            create an account and use the service. You can withdraw consent at any time by
            deleting your account.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          ← Back to BulletBank
        </Link>
        <ManageCookiesButton />
      </div>
    </main>
  )
}
