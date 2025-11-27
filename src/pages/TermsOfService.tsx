import { Link } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
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
            Terms of Service
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="space-y-8 text-card-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Unity Hearts, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service. Unity Hearts is a 
                dating and matchmaking platform designed for members of the Baháʼí community seeking 
                meaningful connections.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed">
                You must be at least 18 years old to use Unity Hearts. By using our service, you 
                represent and warrant that you are at least 18 years of age and have the legal 
                capacity to enter into these Terms of Service. You must also be legally permitted 
                to use dating services in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To use Unity Hearts, you must create an account and provide accurate, complete, 
                and current information. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your profile information is truthful and accurate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                As a member of Unity Hearts, you agree to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Treat all users with respect and dignity</li>
                <li>Not engage in harassment, bullying, or abusive behavior</li>
                <li>Not post inappropriate, offensive, or explicit content</li>
                <li>Not use the platform for commercial solicitation or spam</li>
                <li>Not impersonate another person or misrepresent your identity</li>
                <li>Not attempt to circumvent security measures</li>
                <li>Report any violations or suspicious activity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Content Guidelines</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Users are solely responsible for the content they post. You agree not to post content that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Is false, misleading, or deceptive</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains nudity, sexually explicit material, or violence</li>
                <li>Promotes illegal activities or substances</li>
                <li>Contains hate speech or discriminatory content</li>
                <li>Includes personal contact information of others without consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Safety and Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to create a safe environment, Unity Hearts cannot guarantee the 
                conduct of any user. We encourage you to exercise caution when interacting with 
                others and to report any suspicious behavior. Always meet in public places for 
                initial meetings and inform someone you trust about your plans.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, with or 
                without notice, for violations of these Terms of Service or for any other reason 
                we deem appropriate. You may also delete your account at any time through your 
                account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                Unity Hearts is provided &quot;as is&quot; without warranties of any kind. We do not 
                guarantee that you will find a match, that the service will be uninterrupted, 
                or that other users&apos; information is accurate. Use of the service is at your 
                own risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Unity Hearts shall not be liable for any 
                indirect, incidental, special, consequential, or punitive damages arising out of 
                your use of the service, including but not limited to emotional distress, loss of 
                data, or personal injury.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify these Terms of Service at any time. We will notify users of 
                significant changes via email or through the platform. Your continued use of 
                Unity Hearts after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:support@unityhearts.com" className="text-primary hover:underline">
                  support@unityhearts.com
                </a>
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
          <p>&copy; 2024 Unity Hearts.</p>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
