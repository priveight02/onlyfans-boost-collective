import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

const TermsAndConditions = () => {
  const lastUpdated = "February 15, 2026";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-primary to-blue-900 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-8 w-8 text-white" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Terms and Conditions</h1>
          </div>
          <p className="text-white/60 mb-10">Last updated: {lastUpdated}</p>

          <div className="space-y-8 text-white/80 leading-relaxed">
            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">1. Agreement to Terms</h2>
              <p>These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("Client," "you," or "your") and Ozc Agency ("Company," "we," "our," or "us"). By accessing our website, engaging our services, or submitting an onboarding form, you agree to be bound by these Terms in their entirety.</p>
              <p className="mt-3">If you do not agree to these Terms, you must not access or use our services. These Terms are governed by and comply with applicable consumer protection laws, distance selling regulations, and digital services legislation.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">2. Eligibility</h2>
              <p>To use our services, you must:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into a binding agreement</li>
                <li>Provide accurate, current, and complete information during onboarding</li>
                <li>Comply with all applicable laws and regulations in your jurisdiction</li>
                <li>Be the rightful owner or authorized representative of any accounts you connect to our services</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">3. Services Description</h2>
              <p>Ozc Agency provides content creator management services, which may include but are not limited to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Account management and growth strategy</li>
                <li>Content planning, scheduling, and optimization</li>
                <li>Social media management and engagement</li>
                <li>Fan interaction and messaging management</li>
                <li>Analytics, reporting, and performance tracking</li>
                <li>Branding and marketing consultation</li>
              </ul>
              <p className="mt-3">The specific scope of services will be defined in the individual service agreement or onboarding documentation agreed upon between you and Ozc Agency.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">4. Client Obligations</h2>
              <p>As a client of Ozc Agency, you agree to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide timely and accurate information required for service delivery</li>
                <li>Grant necessary access to platforms and accounts as agreed upon</li>
                <li>Respond to communications from Ozc Agency within a reasonable timeframe</li>
                <li>Comply with the terms of service of all third-party platforms used in connection with our services</li>
                <li>Not engage in any illegal, fraudulent, or deceptive activities</li>
                <li>Ensure all content you provide is legally owned or licensed by you</li>
                <li>Maintain the security of your account credentials shared with us</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">5. Fees and Payment</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Service fees, payment schedules, and commission structures will be outlined in your individual service agreement</li>
                <li>All fees are exclusive of applicable taxes unless stated otherwise</li>
                <li>Payments are due according to the schedule specified in your service agreement</li>
                <li>Late payments may incur interest at a rate of 1.5% per month or the maximum rate permitted by law, whichever is lower</li>
                <li>We reserve the right to suspend services for accounts with outstanding payments exceeding 14 days past due</li>
                <li>Refunds, if applicable, will be processed according to the terms specified in your service agreement</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">6. Intellectual Property</h2>
              <h3 className="text-lg font-medium text-white/90 mb-2">6.1 Client Content</h3>
              <p>You retain all ownership rights to the content you provide to us. By providing content, you grant Ozc Agency a limited, non-exclusive, revocable license to use, modify, and distribute such content solely for the purpose of providing our services.</p>

              <h3 className="text-lg font-medium text-white/90 mt-4 mb-2">6.2 Ozc Agency Materials</h3>
              <p>All materials, strategies, templates, tools, software, and proprietary methodologies developed by Ozc Agency remain our exclusive intellectual property. You may not reproduce, distribute, or create derivative works from our proprietary materials without our prior written consent.</p>

              <h3 className="text-lg font-medium text-white/90 mt-4 mb-2">6.3 Feedback</h3>
              <p>Any feedback, suggestions, or ideas you provide regarding our services may be used by Ozc Agency without obligation or compensation to you.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">7. Confidentiality</h2>
              <p>Both parties agree to maintain the confidentiality of proprietary information exchanged during the course of our business relationship. Confidential information includes, but is not limited to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Account credentials and access tokens</li>
                <li>Financial information and revenue data</li>
                <li>Business strategies and marketing plans</li>
                <li>Subscriber lists and fan interaction data</li>
                <li>Any information marked as confidential</li>
              </ul>
              <p className="mt-3">This confidentiality obligation survives termination of the business relationship for a period of 2 years.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
              <p>To the maximum extent permitted by applicable law:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ozc Agency shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to your use of our services</li>
                <li>Our total liability for any claim arising under these Terms shall not exceed the total fees paid by you to Ozc Agency in the 3 months preceding the event giving rise to the claim</li>
                <li>We are not liable for any losses resulting from third-party platform changes, outages, or policy modifications</li>
                <li>We do not guarantee specific results, revenue increases, or follower growth</li>
              </ul>
              <p className="mt-3">Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any liability that cannot be excluded by law.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">9. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless Ozc Agency, its officers, directors, employees, and agents from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of or related to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your breach of these Terms</li>
                <li>Your violation of any applicable law or third-party rights</li>
                <li>Content you provide that infringes upon intellectual property or other rights</li>
                <li>Your negligent or wrongful conduct</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">10. Termination</h2>
              <p>Either party may terminate the service relationship under the following conditions:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-white">By Client:</strong> You may terminate services by providing 30 days' written notice to liam@ozcagency.com</li>
                <li><strong className="text-white">By Ozc Agency:</strong> We may terminate services with 30 days' notice, or immediately in cases of breach, non-payment, or illegal activity</li>
                <li><strong className="text-white">Effect of termination:</strong> Upon termination, all access credentials will be returned, outstanding fees become immediately due, and confidentiality obligations survive</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">11. Dispute Resolution</h2>
              <p>In the event of any dispute arising from or relating to these Terms:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-white">Informal resolution:</strong> Both parties agree to first attempt to resolve disputes informally by contacting each other in good faith</li>
                <li><strong className="text-white">Mediation:</strong> If informal resolution fails within 30 days, either party may propose mediation through a mutually agreed-upon mediator</li>
                <li><strong className="text-white">Governing law:</strong> These Terms are governed by and construed in accordance with applicable laws of the jurisdiction in which Ozc Agency operates</li>
              </ul>
              <p className="mt-3">Nothing in this section prevents either party from seeking injunctive or equitable relief from a court of competent jurisdiction.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">12. Prohibited Conduct</h2>
              <p>When using our services, you agree not to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Use our services for any unlawful purpose or in violation of these Terms</li>
                <li>Provide false or misleading information</li>
                <li>Interfere with or disrupt the integrity or performance of our services</li>
                <li>Attempt to gain unauthorized access to our systems or data</li>
                <li>Use automated means (bots, scrapers) to access our website without permission</li>
                <li>Harass, abuse, or harm Ozc Agency staff or other clients</li>
                <li>Infringe upon any third-party intellectual property rights</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">13. Force Majeure</h2>
              <p>Neither party shall be liable for any failure or delay in performing obligations where such failure or delay results from circumstances beyond the reasonable control of that party, including but not limited to: natural disasters, wars, terrorism, pandemics, government actions, power failures, internet outages, or third-party platform disruptions.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">14. Severability</h2>
              <p>If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions of these Terms shall remain in full force and effect.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">15. Entire Agreement</h2>
              <p>These Terms, together with our Privacy Policy and any individual service agreements, constitute the entire agreement between you and Ozc Agency. They supersede all prior or contemporaneous communications, proposals, and agreements, whether oral or written, relating to the subject matter herein.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">16. Modifications</h2>
              <p>Ozc Agency reserves the right to modify these Terms at any time. Material changes will be communicated with at least 30 days' notice via email or a prominent notice on our website. Continued use of our services after modifications take effect constitutes acceptance of the updated Terms.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">17. Contact Information</h2>
              <p>For questions, concerns, or notices regarding these Terms, contact us at:</p>
              <div className="mt-3 space-y-1">
                <p><strong className="text-white">Ozc Agency</strong></p>
                <p>Email: <a href="mailto:liam@ozcagency.com" className="text-accent underline hover:text-white transition-colors">liam@ozcagency.com</a></p>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link to="/privacy" className="text-white/60 hover:text-white underline transition-colors">View Privacy Policy</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
