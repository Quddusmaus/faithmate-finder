import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import { LegalBackButton } from "@/components/LegalBackButton";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal";

const PrivacyPolicy = () => {
  // The store listings link to https://unityhearts.app/privacy#delete-account
  // (Google Play asks for a web page explaining account deletion). The browser
  // can't jump to that anchor on its own because the page renders after load.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">Uniting Hearts</span>
          </Link>
          <LegalBackButton />
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="bg-card rounded-2xl p-8 md:p-12 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mb-8">
            Privacy Policy
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Last updated: {LEGAL_LAST_UPDATED}
          </p>

          <div className="space-y-8 text-card-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Uniting Hearts (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
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
                <li><strong>Account Information:</strong> Name, email address and password (stored only in encrypted, hashed form)</li>
                <li><strong>Profile Information:</strong> Photos, age, gender, faith, the town or region you type in as your location, bio, interests, what you are looking for, and your preferred language. We do not use your device&apos;s GPS location.</li>
                <li><strong>Communication Data:</strong> Messages and message reactions you send to your matches. Video and voice calls are connected live and are not recorded.</li>
                <li><strong>Verification Data:</strong> If you choose to verify your profile, the selfie you take and the result of the automated check</li>
                <li><strong>Activity Data:</strong> Likes, Super Likes, matches, blocks and reports you make, and the notification settings you choose</li>
                <li><strong>Support Data:</strong> Messages you send through the contact form or a suspension appeal</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We also collect some information automatically:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Security Data:</strong> The IP address and time of sign-in attempts, used to stop password-guessing attacks, and a captcha check when you sign up or reset your password</li>
                <li><strong>Error Reports:</strong> When something in the app fails, a technical report (the page, browser or device type, and the error) linked to your account so we can fix it</li>
                <li><strong>Device Token:</strong> If you use our phone app and allow notifications, a push token for your device so we can tell you about new matches and messages. Signing out removes it.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                We do not use advertising or third-party analytics trackers, and we do not track you across
                other apps or websites.
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
                <li>Find and fix errors, and keep the service secure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>With Other Users:</strong> Your profile information is visible to other users as part of the matching process</li>
                <li><strong>Service Providers:</strong> Companies that run parts of the service for us and may only use your data to do so (listed below)</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
                <li><strong>Safety:</strong> We may share information to protect the safety of our users or the public</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4 mb-3">
                The service providers we use are:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Supabase:</strong> stores your account, profile, photos and messages (database, sign-in and file storage)</li>
                <li><strong>Lovable:</strong> hosts the website and app</li>
                <li><strong>Daily.co:</strong> connects video and voice calls (calls are not recorded)</li>
                <li><strong>Resend:</strong> sends our emails (account, match, message and safety notices)</li>
                <li><strong>Google (Gemini, through Lovable&apos;s AI service):</strong> checks your verification selfie, only when you choose to verify</li>
                <li><strong>Cloudflare Turnstile:</strong> the captcha that stops automated sign-ups</li>
                <li><strong>Google Firebase Cloud Messaging and Apple Push Notification service:</strong> deliver notifications to the phone app; they receive your device token and the notification text</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not sell your personal information and do not share it for advertising.
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

            <section id="delete-account" className="scroll-mt-6">
              <h2 className="text-xl font-semibold mb-3">6. Keeping and Deleting Your Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                We keep your information while your account exists. You can delete your account
                at any time in the app under Profile → Settings → Delete Account. This immediately
                and permanently deletes your profile, photos, messages, likes, matches, verification
                data and sign-in account. Error reports are kept without your name or account
                attached, and records of sign-in attempts are kept for security. If we are legally
                required to keep something longer, we keep only that. Pausing your profile hides it
                from other members without deleting anything.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To delete your account on the website, sign in at unityhearts.app, open Profile →
                Settings and choose Delete Account. If you can&apos;t sign in, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                from the address on your account and we will delete it for you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights and Choices</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Download a copy of your data yourself in Profile → Settings, or ask us for it</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Delete your account and data yourself in Profile → Settings, or ask us to</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We only store what the service needs to work on your device: your sign-in session,
                your language, and your cookie-banner choice, kept in your browser&apos;s or app&apos;s
                local storage. We do not use advertising or analytics cookies. Clearing your browser
                data signs you out.
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
                Uniting Hearts is not intended for users under 18 years of age. We do not knowingly 
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
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
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
                necessity, and legitimate interests. Your faith, if you add it to your profile, is
                shown to other members because you chose to share it; you can change or remove it
                at any time in your profile.
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
            <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Uniting Hearts.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
