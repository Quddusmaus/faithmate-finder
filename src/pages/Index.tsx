import { Button } from "@/components/ui/button";
import { Heart, Users, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Hero Section */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">Unity Hearts</span>
          </div>
          <div className="flex gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6">
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-5xl font-bold leading-tight text-foreground md:text-6xl">
              Find Your Perfect Match in the{" "}
              <span className="text-primary">Baháʼí Community</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Connect with like-minded individuals who share your values of unity, equality, and spiritual growth.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link to="/profiles">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Browse Profiles
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Join Now
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-card p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Faith-Based Matching</h3>
              <p className="text-muted-foreground">
                Connect with members who share your Baháʼí values and commitment to unity.
              </p>
            </div>

            <div className="rounded-2xl bg-card p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <Shield className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Safe & Respectful</h3>
              <p className="text-muted-foreground">
                A trusted community built on principles of respect, dignity, and genuine connection.
              </p>
            </div>

            <div className="rounded-2xl bg-card p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">Meaningful Connections</h3>
              <p className="text-muted-foreground">
                Find partners who value spiritual growth, service, and building a better world together.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-12 shadow-2xl">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
              Ready to Begin Your Journey?
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/90">
              Join our community of Baháʼí singles seeking meaningful connections.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                Create Your Profile
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2024 Unity Hearts. Built with love for the Baháʼí community.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
