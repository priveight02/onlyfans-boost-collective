import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
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
            <Shield className="h-8 w-8 text-white" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
          </div>
          <p className="text-white/60 mb-10">Last updated: {lastUpdated}</p>

          <div className="space-y-8 text-white/80 leading-relaxed">
            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>Ozc Agency ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. This policy complies with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA), the California Privacy Rights Act (CPRA), and other applicable data protection laws.</p>
              <p className="mt-3">By accessing or using our services, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree, please discontinue use of our services immediately.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
              <h3 className="text-lg font-medium text-white/90 mb-2">2.1 Personal Information</h3>
              <p>We may collect the following personal information when you interact with our services:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Full name and display name</li>
                <li>Email address (e.g., when you contact us at liam@ozcagency.com)</li>
                <li>Phone number</li>
                <li>Social media account usernames and profile information</li>
                <li>Billing and payment information</li>
                <li>Content you provide through onboarding forms</li>
                <li>Communication records between you and Ozc Agency</li>
              </ul>

              <h3 className="text-lg font-medium text-white/90 mt-4 mb-2">2.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>IP address (anonymized/hashed where applicable)</li>
                <li>Browser type and version</li>
                <li>Device type and operating system</li>
                <li>Pages visited, time spent, and navigation paths</li>
                <li>Referring URLs and exit pages</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-lg font-medium text-white/90 mt-4 mb-2">2.3 Information from Third Parties</h3>
              <p>We may receive information from third-party platforms you connect to our services, including social media analytics, subscriber data, and engagement metrics, solely for the purpose of providing our management services.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p>We use your information for the following purposes:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>To provide, maintain, and improve our management services</li>
                <li>To process onboarding and account setup</li>
                <li>To communicate with you regarding your account, services, and updates</li>
                <li>To analyze website usage and optimize user experience</li>
                <li>To comply with legal obligations and enforce our terms</li>
                <li>To detect, prevent, and address fraud, abuse, or security issues</li>
                <li>To send marketing communications (only with your explicit consent)</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">4. Legal Basis for Processing (GDPR)</h2>
              <p>Under the GDPR, we process your personal data based on the following legal grounds:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-white">Consent:</strong> Where you have given explicit consent for specific processing activities</li>
                <li><strong className="text-white">Contractual necessity:</strong> Where processing is necessary to perform our contract with you</li>
                <li><strong className="text-white">Legitimate interest:</strong> Where processing is necessary for our legitimate business interests, provided your rights do not override those interests</li>
                <li><strong className="text-white">Legal obligation:</strong> Where processing is required to comply with applicable law</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">5. Data Sharing and Disclosure</h2>
              <p>We do not sell, rent, or trade your personal information. We may share your data with:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-white">Service providers:</strong> Trusted third parties who assist in operating our services (e.g., hosting, analytics, payment processing), bound by confidentiality agreements</li>
                <li><strong className="text-white">Legal authorities:</strong> When required by law, regulation, legal process, or governmental request</li>
                <li><strong className="text-white">Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with prior notice to affected users</li>
              </ul>
              <p className="mt-3">We will never share your data with third parties for their own marketing purposes without your explicit consent.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">6. Data Retention</h2>
              <p>We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law. When data is no longer needed, we will securely delete or anonymize it.</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Active account data: Retained for the duration of our business relationship plus 12 months</li>
                <li>Financial records: Retained for 7 years as required by tax and accounting regulations</li>
                <li>Website analytics: Anonymized data retained for up to 26 months</li>
                <li>Marketing consent records: Retained for the duration of consent plus 3 years</li>
              </ul>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
              <h3 className="text-lg font-medium text-white/90 mb-2">7.1 Under GDPR (EEA/UK Residents)</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-white">Right of access:</strong> Request a copy of your personal data</li>
                <li><strong className="text-white">Right to rectification:</strong> Request correction of inaccurate data</li>
                <li><strong className="text-white">Right to erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong className="text-white">Right to restrict processing:</strong> Request limitation of data processing</li>
                <li><strong className="text-white">Right to data portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong className="text-white">Right to object:</strong> Object to processing based on legitimate interest or direct marketing</li>
                <li><strong className="text-white">Right to withdraw consent:</strong> Withdraw previously given consent at any time</li>
              </ul>

              <h3 className="text-lg font-medium text-white/90 mt-4 mb-2">7.2 Under CCPA/CPRA (California Residents)</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Right to know what personal information is collected, used, and shared</li>
                <li>Right to delete personal information held by us</li>
                <li>Right to opt out of the sale or sharing of personal information</li>
                <li>Right to correct inaccurate personal information</li>
                <li>Right to limit use of sensitive personal information</li>
                <li>Right to non-discrimination for exercising your rights</li>
              </ul>
              <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:liam@ozcagency.com" className="text-accent underline hover:text-white transition-colors">liam@ozcagency.com</a>. We will respond within 30 days (GDPR) or 45 days (CCPA/CPRA).</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">8. Cookies and Tracking Technologies</h2>
              <p>We use cookies and similar technologies to enhance your experience. Types of cookies we use:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-white">Essential cookies:</strong> Necessary for website functionality (no consent required)</li>
                <li><strong className="text-white">Analytics cookies:</strong> Help us understand how visitors interact with our site</li>
                <li><strong className="text-white">Functional cookies:</strong> Remember your preferences and settings</li>
              </ul>
              <p className="mt-3">You can manage cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">9. Data Security</h2>
              <p>We implement industry-standard security measures to protect your personal information, including:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Regular security assessments and vulnerability testing</li>
                <li>Employee training on data protection practices</li>
              </ul>
              <p className="mt-3">While we strive to protect your data, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but will notify you and relevant authorities of any data breach as required by law.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">10. International Data Transfers</h2>
              <p>Your information may be transferred to and processed in countries other than your country of residence. When we transfer data internationally, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission or other legally recognized mechanisms.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">11. Children's Privacy</h2>
              <p>Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we learn that we have collected data from a person under 18, we will delete that information immediately. If you believe a minor has provided us with personal data, please contact us at <a href="mailto:liam@ozcagency.com" className="text-accent underline hover:text-white transition-colors">liam@ozcagency.com</a>.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">12. Changes to This Policy</h2>
              <p>We reserve the right to update this Privacy Policy at any time. Material changes will be communicated via email or a prominent notice on our website at least 30 days before they take effect. Your continued use of our services after changes become effective constitutes acceptance of the updated policy.</p>
            </section>

            <section className="bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">13. Contact Us</h2>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, contact us at:</p>
              <div className="mt-3 space-y-1">
                <p><strong className="text-white">Ozc Agency</strong></p>
                <p>Email: <a href="mailto:liam@ozcagency.com" className="text-accent underline hover:text-white transition-colors">liam@ozcagency.com</a></p>
              </div>
              <p className="mt-3">If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.</p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link to="/terms" className="text-white/60 hover:text-white underline transition-colors">View Terms and Conditions</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
