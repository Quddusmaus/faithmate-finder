import { Button } from "@/components/ui/button";
import { Heart, Globe, Users, MessageCircleHeart, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Index = () => {
  const { isAdmin } = useAdminStatus();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Hero Section */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="text-2xl font-bold text-foreground">{t('common.appName')}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" className="gap-2">
                  <Settings className="h-4 w-4" />
                  {t('nav.admin')}
                </Button>
              </Link>
            )}
            <Link to="/auth">
              <Button variant="ghost">{t('nav.login')}</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary hover:bg-primary/90">{t('landing.getStarted')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6">
        {/* Hero */}
        <section className="py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <p className="text-2xl font-medium text-primary md:text-3xl">
              {t('landing.greeting')}
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">
              {t('landing.welcomeTitle')}{" "}
              <span className="text-primary">{t('common.appName')}</span>
              {" – "}
              <span className="text-muted-foreground font-normal text-3xl md:text-4xl">
                {t('landing.welcomeSubtitle')}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t('landing.description')}
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link to="/profiles">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t('profiles.browseProfiles')}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  {t('nav.signup')}
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
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                {t('landing.smartMatching')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.smartMatchingDesc')}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                {t('landing.verifiedProfiles')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.verifiedProfilesDesc')}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <MessageCircleHeart className="h-8 w-8 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                {t('landing.secureMessaging')}
              </h3>
              <p className="text-muted-foreground">
                {t('landing.secureMessagingDesc')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-12 shadow-2xl">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
              {t('landing.howItWorks')}
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/90">
              {t('landing.createProfileDesc')}
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                {t('landing.createProfile')}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2024 {t('common.appName')}.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
