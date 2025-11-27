import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">Unity Hearts</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mb-8">
            Privacy Policy
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="space-y-8 text-card-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Unity Hearts (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our dating and matchmaking platform. Please read this 
                policy carefully to understand our practices regarding your personal data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li><strong>Account Information:</strong> Name, email address, password, date of birth, gender</li>
                <li><strong>Profile Information:</strong> Photos, bio, location, interests, relationship preferences</li>
                <li><strong>Communication Data:</strong> Messages sent through our platform</li>
                <li><strong>Verification Data:</strong> Information submitted for profile verification</li>
                <li><strong>Usage Data:</strong> How you interact with our service, including likes, matches, and browsing history</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                We also automatically collect certain information when you use our service, including 
                IP address, device information, browser type, and cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Create and manage your account</li>
                <li>Match you with other users based on your preferences</li>
                <li>Facilitate communication between matched users</li>
                <li>Send you notifications about matches, messages, and updates</li>
                <li>Verify user identities and prevent fraud</li>
                <li>Enforce our Terms of Service and community guidelines</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Analyze usage patterns to improve user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>With Other Users:</strong> Your profile information is visible to other users as part of the matching process</li>
                <li><strong>Service Providers:</strong> We may share data with third-party vendors who assist in operating our platform</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
                <li><strong>Safety:</strong> We may share information to protect the safety of our users or the public</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your 
                personal information against unauthorized access, alteration, disclosure, or 
                destruction. However, no method of transmission over the Internet is 100% secure, 
                and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as 
                needed to provide you services. If you delete your account, we will delete or 
                anonymize your information within 30 days, except where we are required to retain 
                certain information for legal or legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights and Choices</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at{" "}
                <a href="mailto:privacy@unityhearts.com" className="text-primary hover:underline">
                  privacy@unityhearts.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to collect information about your 
                browsing activities. You can control cookies through your browser settings. For more 
                information about our use of cookies, please see our Cookie Policy. Essential cookies 
                are necessary for the platform to function and cannot be disabled.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your 
                country of residence. We ensure appropriate safeguards are in place to protect 
                your data in accordance with applicable laws, including GDPR for EU residents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Unity Hearts is not intended for users under 18 years of age. We do not knowingly 
                collect personal information from children. If we become aware that we have 
                collected personal information from a child under 18, we will take steps to 
                delete that information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the new policy on this page and updating the &quot;Last 
                updated&quot; date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, 
                please contact us at:{" "}
                <a href="mailto:privacy@unityhearts.com" className="text-primary hover:underline">
                  privacy@unityhearts.com
                </a>
              </p>
            </section>

            <section className="bg-muted/50 rounded-xl p-6 mt-8">
              <h2 className="text-xl font-semibold mb-3">For EU/EEA Residents (GDPR)</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you are located in the European Union or European Economic Area, you have 
                additional rights under the General Data Protection Regulation (GDPR). This 
                includes the right to lodge a complaint with your local data protection authority. 
                Our legal basis for processing your personal data includes consent, contractual 
                necessity, and legitimate interests.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <div className="flex justify-center gap-6 mb-4">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
          <p>&copy; 2024 Unity Hearts.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
