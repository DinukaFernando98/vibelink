import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';

export const metadata = { title: 'Terms and Conditions – VibeLink' };

export default function TermsPage() {
  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-slate-500">Last updated: 1 May 2025</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-400">

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using VibeLink (&ldquo;the Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;). If you do not agree to all of these Terms, you must not use the Service. We reserve the right to amend these Terms at any time, and your continued use of the Service after any such amendments constitutes your acceptance of the new Terms.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>VibeLink is an online platform that enables users to engage in anonymous text and video conversations with other users worldwide. The Service operates using WebRTC peer-to-peer technology for video communications and provides optional account registration for enhanced features including friend connections and direct messaging.</p>
          </Section>

          <Section title="3. Eligibility">
            <p>You must be at least <strong className="text-slate-900 dark:text-white">18 years of age</strong> to use VibeLink. By using the Service, you represent and warrant that you are 18 years of age or older. If you are under 18, you are not permitted to use this Service under any circumstances. We reserve the right to terminate any account and refuse service to anyone who misrepresents their age.</p>
          </Section>

          <Section title="4. Account Registration">
            <p>Certain features of the Service require account registration. When you create an account, you must provide accurate, complete, and current information. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorised use of your account. VibeLink will not be liable for any loss or damage arising from your failure to comply with this requirement.</p>
          </Section>

          <Section title="5. Prohibited Conduct">
            <p>You agree that you will not use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Transmit, upload, or share any content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, sexually explicit, or otherwise objectionable.</li>
              <li>Expose minors to inappropriate or explicit content of any kind.</li>
              <li>Engage in, solicit, or facilitate the exchange of child sexual abuse material (CSAM) — any such activity will be immediately reported to law enforcement authorities.</li>
              <li>Harass, intimidate, stalk, or threaten any individual.</li>
              <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with any person or entity.</li>
              <li>Record, screenshot, or capture another user&apos;s video or audio stream without their explicit consent.</li>
              <li>Solicit personal information from other users for commercial, illegal, or harmful purposes.</li>
              <li>Distribute spam, unsolicited messages, or promotional content.</li>
              <li>Upload or transmit viruses, malware, or any other malicious code.</li>
              <li>Attempt to circumvent, disable, or interfere with the security features of the Service.</li>
              <li>Use automated bots, scrapers, or other automated tools to access the Service.</li>
              <li>Engage in any activity that violates applicable local, national, or international laws or regulations.</li>
            </ul>
          </Section>

          <Section title="6. Content and Intellectual Property">
            <p>VibeLink does not claim ownership of content you share through the Service. By using the Service, you represent that you have the necessary rights to any content you transmit. You grant VibeLink a limited, non-exclusive licence to process and transmit your content solely for the purpose of providing the Service.</p>
            <p className="mt-3">The VibeLink name, logo, and all related marks, designs, and service names are the intellectual property of VibeLink. Nothing in these Terms grants you a right or licence to use any of VibeLink&apos;s intellectual property.</p>
          </Section>

          <Section title="7. Privacy">
            <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline transition-colors">Privacy Policy</Link>, which is incorporated into these Terms by reference. Please review the Privacy Policy carefully to understand our data practices.</p>
          </Section>

          <Section title="8. Video Communications and Recording">
            <p>VibeLink uses WebRTC (Web Real-Time Communication) technology for video and audio communications. Video and audio streams are transmitted directly between users on a peer-to-peer basis and are <strong className="text-slate-900 dark:text-white">not stored, recorded, or monitored</strong> by VibeLink&apos;s servers.</p>
            <p className="mt-3">Unauthorised recording of any video or audio session without the explicit consent of all parties is strictly prohibited and may violate applicable laws, including wiretapping and privacy statutes. VibeLink accepts no liability for any unlawful recording undertaken by users.</p>
          </Section>

          <Section title="9. Termination">
            <p>We reserve the right, in our sole discretion, to suspend or terminate your access to the Service at any time and for any reason, including but not limited to a breach of these Terms, without notice or liability. Upon termination, your right to use the Service will immediately cease.</p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p className="text-slate-500">THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p className="text-slate-500">TO THE FULLEST EXTENT PERMITTED BY LAW, VIBELINK AND ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.</p>
          </Section>

          <Section title="12. Indemnification">
            <p>You agree to defend, indemnify, and hold harmless VibeLink and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, judgements, awards, losses, costs, expenses, or fees (including reasonable legal fees) arising out of or relating to your violation of these Terms or your use of the Service.</p>
          </Section>

          <Section title="13. Third-Party Links and Services">
            <p>The Service may contain links to third-party websites or services that are not owned or controlled by VibeLink. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.</p>
          </Section>

          <Section title="14. Governing Law and Dispute Resolution">
            <p>These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising under or in connection with these Terms shall first be subject to good-faith negotiation. If the dispute cannot be resolved by negotiation, it shall be submitted to binding arbitration.</p>
          </Section>

          <Section title="15. Severability">
            <p>If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.</p>
          </Section>

          <Section title="16. Entire Agreement">
            <p>These Terms, together with our Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and VibeLink concerning the Service.</p>
          </Section>

          <Section title="17. Contact Us">
            <p>If you have any questions about these Terms, please <Link href="/contact" className="text-violet-400 hover:text-violet-300 underline transition-colors">contact us</Link> through our enquiry form.</p>
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
