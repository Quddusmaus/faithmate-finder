import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Globe, Users, MessageCircleHeart, Settings, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Index = () => {
  const { isAdmin } = useAdminStatus();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="currentColor" />
            <span className="text-xl sm:text-2xl font-bold text-foreground">{t('common.appName')}</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
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
            <Link to="/auth?mode=signup">
              <Button className="bg-primary hover:bg-primary/90">{t('landing.getStarted')}</Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <div className="flex flex-col gap-4 mt-8">
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <Settings className="h-4 w-4" />
                        {t('nav.admin')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">{t('nav.login')}</Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-primary/90">{t('landing.getStarted')}</Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="py-12 sm:py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
            <p className="text-xl sm:text-2xl md:text-3xl font-medium text-primary">
              {t('landing.greeting')}
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight text-foreground">
              {t('landing.welcomeTitle')}{" "}
              <span className="text-primary">{t('common.appName')}</span>
              {" – "}
              <span className="text-muted-foreground font-normal text-xl sm:text-3xl md:text-4xl block sm:inline mt-2 sm:mt-0">
                {t('landing.welcomeSubtitle')}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto px-2">
              {t('landing.description')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-4 px-4 sm:px-0">
              <Link to="/profiles" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t('profiles.browseProfiles')}
                </Button>
              </Link>
              <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-10 sm:py-16">
          <div className="grid gap-4 sm:gap-8 grid-cols-1 md:grid-cols-3">
            <div className="rounded-2xl bg-card p-6 sm:p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-card-foreground">
                {t('landing.smartMatching')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('landing.smartMatchingDesc')}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 sm:p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary/10">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-secondary" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-card-foreground">
                {t('landing.coreCompatibility')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('landing.coreCompatibilityDesc')}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 sm:p-8 text-center shadow-lg transition-transform hover:scale-105">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-accent/10">
                <MessageCircleHeart className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold text-card-foreground">
                {t('landing.secureMessaging')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('landing.secureMessagingDesc')}
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-20 text-center px-2">
          <div className="mx-auto max-w-2xl rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-12 shadow-2xl">
            <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold text-primary-foreground">
              {t('landing.howItWorks')}
            </h2>
            <p className="mb-6 sm:mb-8 text-base sm:text-lg text-primary-foreground/90">
              {t('landing.createProfileDesc')}
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90">
                {t('landing.createProfile')}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 text-center text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-4 text-sm sm:text-base">
            <Link to="/install" className="hover:text-primary transition-colors">Install App</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">{t('nav.termsOfService')}</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">{t('nav.privacyPolicy')}</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">{t('nav.contactUs')}</Link>
          </div>
          <p className="text-sm sm:text-base">&copy; 2024 {t('common.appName')}.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
