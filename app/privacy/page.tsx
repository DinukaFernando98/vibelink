import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';

export const metadata = { title: 'Privacy Policy – VibeLink' };

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: 1 May 2025</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-400">

          <Section title="1. Introduction">
            <p>VibeLink (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our anonymous video and text chat platform. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.</p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">2.1 Information You Provide Voluntarily</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong className="text-slate-700 dark:text-slate-300">Account registration:</strong> When you create an account, we collect your display name, email address, date of birth, and an optional profile photo.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Country information:</strong> We may collect your country of origin, which you may provide voluntarily during registration.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Direct messages:</strong> Messages sent between registered friends are stored on our servers to enable conversation history.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Contact form submissions:</strong> If you submit a general enquiry, we collect your name, email address, and message content.</li>
            </ul>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-slate-700 dark:text-slate-300">Technical data:</strong> We may collect your IP address, browser type, and operating system for security and fraud prevention purposes.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Session data:</strong> A unique session token is stored in your browser&apos;s local storage to maintain your authenticated state.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Usage data:</strong> Aggregate, anonymised usage statistics may be collected to improve service performance.</li>
            </ul>
          </Section>

          <Section title="3. Video and Audio Communications">
            <p>VibeLink uses <strong className="text-slate-900 dark:text-white">WebRTC (Web Real-Time Communication)</strong> technology for all video and audio chat sessions. All such communications are transmitted directly between users on a <strong className="text-slate-900 dark:text-white">peer-to-peer basis</strong>. This means:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Video and audio data is <strong className="text-slate-900 dark:text-white">not routed through, stored on, or recorded by</strong> VibeLink&apos;s servers.</li>
              <li>We cannot access the content of your video or audio conversations.</li>
              <li>Standard WebRTC signalling is transmitted through our servers solely to establish the peer-to-peer connection, but this data does not include actual video or audio content.</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Information">
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Create and manage your user account.</li>
              <li>Enable communication features including anonymous chat and direct messaging between friends.</li>
              <li>Prevent abuse, fraud, and violations of our Terms &amp; Conditions.</li>
              <li>Respond to reports of inappropriate behaviour and enforce our content policies.</li>
              <li>Respond to your enquiries submitted through our contact form.</li>
              <li>Analyse aggregate, anonymised usage patterns to improve the Service.</li>
              <li>Comply with applicable legal obligations.</li>
            </ul>
          </Section>

          <Section title="5. Legal Bases for Processing (GDPR)">
            <p>If you are located in the European Economic Area (EEA) or the United Kingdom, we process your personal data on the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-slate-700 dark:text-slate-300">Contract performance:</strong> Processing necessary to provide the Service.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Legitimate interests:</strong> Security monitoring, fraud prevention, and service improvement.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Consent:</strong> Where you have given explicit consent.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Legal obligation:</strong> Where we are required by law.</li>
            </ul>
          </Section>

          <Section title="6. Cookies and Local Storage">
            <p>VibeLink does not currently use tracking cookies or advertising cookies. We use browser <strong className="text-slate-900 dark:text-white">local storage</strong> to store your session authentication token, which is necessary for the Service to function. This data remains solely on your device and is not accessible to third parties.</p>
          </Section>

          <Section title="7. Disclosure of Your Information">
            <p>We do not sell, trade, or rent your personal information to third parties. We may disclose your information only in the following limited circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-slate-700 dark:text-slate-300">Service providers:</strong> Trusted providers who assist in operating the Service, subject to confidentiality obligations.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Legal requirements:</strong> Where required by law, regulation, or court order.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Child safety:</strong> We are legally obligated to report any suspected child sexual exploitation or abuse to relevant law enforcement authorities.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Business transfers:</strong> In the event of a merger or acquisition, your information may be transferred subject to the same privacy commitments.</li>
            </ul>
          </Section>

          <Section title="8. Data Retention">
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-slate-700 dark:text-slate-300">Account data:</strong> Retained until you request deletion.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Direct messages:</strong> Retained until deleted by you or your contact.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Technical logs:</strong> Retained for up to 90 days.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Contact submissions:</strong> Retained for up to 2 years.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Report records:</strong> Retained as necessary to investigate and action the report.</li>
            </ul>
          </Section>

          <Section title="9. Data Security">
            <p>We implement appropriate technical and organisational measures to protect your personal information, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Password hashing using bcrypt with appropriate salt rounds.</li>
              <li>HTTPS/TLS encryption for all data in transit.</li>
              <li>Peer-to-peer WebRTC encryption (DTLS-SRTP) for all video and audio communications.</li>
              <li>Access controls limiting who can access your data.</li>
            </ul>
          </Section>

          <Section title="10. Children's Privacy">
            <p>VibeLink is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected personal data from a person under 18, we will take immediate steps to delete that information and terminate the account. If you believe we may have any information from or about a minor, please <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline transition-colors">contact us</Link> immediately.</p>
          </Section>

          <Section title="11. Your Rights">
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong className="text-slate-700 dark:text-slate-300">Right of access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Right to rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Right to erasure:</strong> Request deletion of your personal data, subject to legal obligations.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Right to data portability:</strong> Request your data in a structured, machine-readable format.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Right to object:</strong> Object to processing based on legitimate interests.</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Right to withdraw consent:</strong> Withdraw consent at any time without affecting prior processing.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline transition-colors">contact us</Link>. We will respond within 30 days.</p>
          </Section>

          <Section title="12. California Privacy Rights (CCPA)">
            <p>If you are a California resident, the CCPA grants you specific rights, including the right to know what personal information we collect, the right to delete personal information, and the right to opt out of the sale of personal information. VibeLink does not sell personal information. To exercise your CCPA rights, please <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline transition-colors">contact us</Link>.</p>
          </Section>

          <Section title="13. International Data Transfers">
            <p>VibeLink operates globally. If you are accessing the Service from outside the country where our servers are located, your information may be transferred internationally. We take appropriate steps to ensure such transfers comply with applicable data protection laws.</p>
          </Section>

          <Section title="14. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or a notice on the Service. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="15. Contact Us">
            <p>If you have questions about this Privacy Policy or our data practices, please <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline transition-colors">get in touch</Link> via our contact form. We will endeavour to respond within 30 days.</p>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/6 rounded-2xl p-6">
      <h2 className="font-heading text-sm font-semibold text-slate-900 dark:text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}
