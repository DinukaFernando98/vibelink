import Link from 'next/link';
import { Zap } from 'lucide-react';

export const metadata = { title: 'Privacy Policy – VibeLink' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">VibeLink</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms and Conditions</Link>
          <Link href="/contact" className="hover:text-violet-600 transition-colors">Get in Touch</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-10">Last updated: 1 May 2025</p>

        <div className="space-y-8 text-sm leading-7 text-slate-700 dark:text-slate-300">

          <Section title="1. Introduction">
            <p>VibeLink (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our anonymous video and text chat platform. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.</p>
          </Section>

          <Section title="2. Information We Collect">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">2.1 Information You Provide Voluntarily</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-4">
              <li><strong>Account registration:</strong> When you create an account, we collect your display name, email address, date of birth, and an optional profile photo.</li>
              <li><strong>Country information:</strong> We may collect your country of origin, which you may provide voluntarily during registration or which may be inferred from your IP address for the purpose of displaying country information to chat partners.</li>
              <li><strong>Direct messages:</strong> Messages sent between registered friends are stored on our servers to enable conversation history.</li>
              <li><strong>Contact form submissions:</strong> If you submit a general enquiry, we collect your name, email address, and message content.</li>
            </ul>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Technical data:</strong> We may collect your IP address, browser type and version, operating system, referring URLs, and pages viewed for security, fraud prevention, and service improvement purposes.</li>
              <li><strong>Session data:</strong> A unique session token is stored in your browser&apos;s local storage to maintain your authenticated state. This token is used solely to identify your session and is not shared with third parties.</li>
              <li><strong>Usage data:</strong> Aggregate, anonymised usage statistics such as connection frequency and session duration may be collected to improve service performance.</li>
            </ul>
          </Section>

          <Section title="3. Video and Audio Communications">
            <p>VibeLink uses <strong>WebRTC (Web Real-Time Communication)</strong> technology for all video and audio chat sessions. All such communications are transmitted directly between users on a <strong>peer-to-peer basis</strong>. This means:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-3">
              <li>Video and audio data is <strong>not routed through, stored on, or recorded by</strong> VibeLink&apos;s servers.</li>
              <li>We cannot access the content of your video or audio conversations.</li>
              <li>Standard WebRTC signalling (ICE candidates, session descriptions) is transmitted through our servers solely to establish the peer-to-peer connection, but this data does not include the actual video or audio content.</li>
              <li>Once a peer-to-peer connection is established, all media flows directly between participants.</li>
            </ul>
          </Section>

          <Section title="4. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Create and manage your user account.</li>
              <li>Enable communication features including anonymous chat and direct messaging between friends.</li>
              <li>Prevent abuse, fraud, and violations of our Terms &amp; Conditions.</li>
              <li>Respond to reports of inappropriate behaviour and enforce our content policies.</li>
              <li>Send administrative communications such as password reset or account notices.</li>
              <li>Respond to your enquiries submitted through our contact form.</li>
              <li>Analyse aggregate, anonymised usage patterns to improve the Service.</li>
              <li>Comply with applicable legal obligations.</li>
            </ul>
          </Section>

          <Section title="5. Legal Bases for Processing (GDPR)">
            <p>If you are located in the European Economic Area (EEA) or the United Kingdom, we process your personal data on the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Contract performance:</strong> Processing necessary to provide the Service you have requested (account management, messaging).</li>
              <li><strong>Legitimate interests:</strong> Security monitoring, fraud prevention, and service improvement, where these interests are not overridden by your rights.</li>
              <li><strong>Consent:</strong> Where you have given explicit consent, such as providing optional information like a profile photo or country.</li>
              <li><strong>Legal obligation:</strong> Where we are required by law to process or disclose information.</li>
            </ul>
          </Section>

          <Section title="6. Cookies and Local Storage">
            <p>VibeLink does not currently use tracking cookies or advertising cookies. We use browser <strong>local storage</strong> to store your session authentication token, which is necessary for the Service to function. This data remains solely on your device and is not accessible to third parties.</p>
            <p className="mt-3">You may clear your browser&apos;s local storage at any time, which will log you out of your account. No persistent cross-site tracking cookies are set by VibeLink.</p>
          </Section>

          <Section title="7. Disclosure of Your Information">
            <p>We do not sell, trade, or rent your personal information to third parties. We may disclose your information only in the following limited circumstances:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Service providers:</strong> We may share information with trusted service providers who assist in operating the Service (e.g., hosting infrastructure), subject to confidentiality obligations.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information where required by law, regulation, court order, or governmental authority, or where we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
              <li><strong>Child safety:</strong> We are legally obligated to report any suspected child sexual exploitation or abuse to the relevant law enforcement authorities and, where applicable, to the National Center for Missing &amp; Exploited Children (NCMEC) or equivalent body.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity, subject to the same privacy commitments.</li>
            </ul>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain your personal data for as long as your account is active or as necessary to provide you with the Service. Specifically:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Account data:</strong> Retained until you request deletion of your account.</li>
              <li><strong>Direct messages:</strong> Retained until you or your friend counterpart deletes the conversation or account.</li>
              <li><strong>Technical logs:</strong> Retained for up to 90 days for security and debugging purposes.</li>
              <li><strong>Contact submissions:</strong> Retained for up to 2 years for record-keeping purposes.</li>
              <li><strong>Report records:</strong> Retained for the period necessary to investigate and action the report, and may be retained longer if required by law.</li>
            </ul>
          </Section>

          <Section title="9. Data Security">
            <p>We implement appropriate technical and organisational measures to protect your personal information against accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access. These measures include:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Password hashing using bcrypt with appropriate salt rounds.</li>
              <li>HTTPS/TLS encryption for all data in transit between your browser and our servers.</li>
              <li>Peer-to-peer WebRTC encryption (DTLS-SRTP) for all video and audio communications.</li>
              <li>Access controls limiting who can access your data within our organisation.</li>
            </ul>
            <p className="mt-3">No method of transmission or storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee absolute security.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>VibeLink is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected personal data from a person under 18 without verified parental consent, we will take immediate steps to delete that information and terminate the account. If you believe we may have any information from or about a minor, please <Link href="/contact" className="text-violet-600 hover:underline">contact us</Link> immediately.</p>
          </Section>

          <Section title="11. Your Rights">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Right of access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Right to erasure (&ldquo;right to be forgotten&rdquo;):</strong> Request deletion of your personal data, subject to legal obligations.</li>
              <li><strong>Right to data portability:</strong> Request your data in a structured, machine-readable format.</li>
              <li><strong>Right to object:</strong> Object to processing based on legitimate interests.</li>
              <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data.</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, withdraw it at any time without affecting prior processing.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please <Link href="/contact" className="text-violet-600 hover:underline">contact us</Link>. We will respond within 30 days. We may need to verify your identity before fulfilling your request.</p>
          </Section>

          <Section title="12. California Privacy Rights (CCPA)">
            <p>If you are a California resident, the California Consumer Privacy Act (CCPA) grants you specific rights, including the right to know what personal information we collect, the right to delete personal information, and the right to opt out of the sale of personal information. VibeLink does not sell personal information. To exercise your CCPA rights, please <Link href="/contact" className="text-violet-600 hover:underline">contact us</Link>.</p>
          </Section>

          <Section title="13. International Data Transfers">
            <p>VibeLink operates globally. If you are accessing the Service from outside the country where our servers are located, your information may be transferred internationally. We take appropriate steps to ensure such transfers comply with applicable data protection laws.</p>
          </Section>

          <Section title="14. Third-Party Services">
            <p>The Service may use third-party APIs for limited purposes such as geolocation (to detect your country). These third parties have their own privacy policies. We encourage you to review those policies. VibeLink is not responsible for the privacy practices of third-party services.</p>
          </Section>

          <Section title="15. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or a notice on the Service. Changes become effective upon posting. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy. We encourage you to review this policy periodically.</p>
          </Section>

          <Section title="16. Contact Us">
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please <Link href="/contact" className="text-violet-600 hover:underline">get in touch</Link> via our contact form. We will endeavour to respond within 30 days.</p>
          </Section>

        </div>
      </main>

      <footer className="border-t border-slate-100 dark:border-slate-800 mt-16 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} VibeLink. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms and Conditions</Link>
            <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-violet-600 transition-colors">Get in Touch</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      {children}
    </div>
  );
}
