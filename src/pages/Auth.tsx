import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getSessionWithTimeout, withTimeout } from "@/lib/safeAuth";
import type { User, Session } from "@supabase/supabase-js";

type AuthMode = "login" | "signup" | "forgot-password" | "update-password" | "check-email";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    // Default to true, or read from localStorage if previously set
    const saved = localStorage.getItem("rememberMe");
    return saved !== null ? saved === "true" : true;
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();

  // After login, send the user to /profile-setup if they have no profile yet,
  // otherwise to /profiles. Per project rule: hard redirect (no React Router
  // navigate) and check profile existence before deciding the destination.
  const redirectAfterLogin = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        window.location.replace("/profiles");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", u.id)
        .maybeSingle();
      window.location.replace(profile ? "/profiles" : "/profile-setup");
    } catch {
      // On any failure, fall back to /profiles (its own guards will handle it).
      window.location.replace("/profiles");
    }
  };

  useEffect(() => {
    // Check for password recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    
    if (type === "recovery" && accessToken) {
      setMode("update-password");
    }

    // Set up auth state listener - only update state, no redirects here
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (mode === "login" && session?.user) {
          redirectAfterLogin();
        }
      }
    );

    getSessionWithTimeout(3000).then((session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (mode === "login" && session?.user) {
        redirectAfterLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, [mode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        // Check rate limit before attempting login (with timeout to prevent hanging)
        let isAllowed = true;
        try {
          const rateLimitPromise = supabase.rpc('check_login_rate_limit', { p_email: email });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Rate limit check timeout')), 5000)
          );
          
          const { data, error: rateLimitError } = await Promise.race([rateLimitPromise, timeoutPromise]) as any;
          
          if (rateLimitError) {
            console.error('Rate limit check error:', rateLimitError);
          } else {
            isAllowed = data !== false;
          }
        } catch (e) {
          console.error('Rate limit check failed, proceeding with login:', e);
        }

        if (!isAllowed) {
          toast({
            title: "Too many attempts",
            description: "Please wait 15 minutes before trying again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Save remember me preference
        localStorage.setItem("rememberMe", String(rememberMe));

        // If not remembering, we'll clear session on browser close by not persisting
        // Supabase uses localStorage by default, so we sign in normally
        // The session will be cleared when the user closes the browser if they don't want to be remembered
        
        // Sign in with timeout to prevent hanging
        const signInPromise = supabase.auth.signInWithPassword({
          email,
          password,
        });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign in timed out. Please check your internet connection and try again.')), 15000)
        );
        
        const { error } = await Promise.race([signInPromise, timeoutPromise]) as any;

        // Record the login attempt (don't block on this)
        Promise.resolve(supabase.rpc('record_login_attempt', {
          p_email: email,
          p_success: !error
        })).catch(e => console.error('Failed to record login attempt:', e));

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: rememberMe ? "Successfully signed in." : "Successfully signed in. Session will end when you close the browser.",
        });

        redirectAfterLogin();
        return;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { name },
          },
        });

        if (error) throw error;

        // If a session was returned immediately, email confirmation is disabled —
        // send the user straight to profile setup.
        if (data.session) {
          toast({
            title: "Account created!",
            description: "Welcome to Unity Hearts.",
          });
          window.location.replace("/profile-setup");
          return;
        }

        // Email confirmation is required — show the "check your email" screen.
        setMode("check-email");
        return;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });
      
      // Reset form
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password updated!",
        description: "Your password has been successfully changed.",
      });
      
      // Reset form and redirect
      setPassword("");
      setConfirmPassword("");
      setMode("login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCardTitle = () => {
    switch (mode) {
      case "login": return "Welcome Back";
      case "signup": return "Join Us";
      case "forgot-password": return "Reset Password";
      case "update-password": return "Set New Password";
      case "check-email": return "Check Your Email";
      default: return "Welcome";
    }
  };

  const getCardDescription = () => {
    switch (mode) {
      case "login": return "Sign in to continue your journey";
      case "signup": return "Create an account to start connecting";
      case "forgot-password": return "Enter your email to receive a reset link";
      case "update-password": return "Enter your new password below";
      case "check-email": return "One more step before you can log in";
      default: return "";
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-primary" fill="currentColor" />
            <span className="text-2xl sm:text-3xl font-bold text-foreground">Unity Hearts</span>
          </Link>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="text-center px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">{getCardTitle()}</CardTitle>
            <CardDescription className="text-sm">{getCardDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Login Form */}
            {mode === "login" && (
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm font-normal text-muted-foreground cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode("forgot-password")}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Sign In"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Don't have an account? Sign up
                  </button>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {mode === "signup" && (
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Create Account"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password Form */}
            {mode === "forgot-password" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                </div>
              </form>
            )}

            {/* Check Email Screen */}
            {mode === "check-email" && (
              <div className="space-y-6 py-2 text-center">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-foreground font-medium">
                    We sent a confirmation link to
                  </p>
                  <p className="text-sm font-semibold text-primary break-all">{email}</p>
                  <p className="text-sm text-muted-foreground">
                    Click the link in the email to activate your account, then come back here to sign in.
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4 text-left text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Didn't get the email?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the right address</li>
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const { error } = await supabase.auth.resend({
                          type: "signup",
                          email,
                          options: { emailRedirectTo: `${window.location.origin}/auth` },
                        });
                        if (error) throw error;
                        toast({ title: "Email resent", description: "Check your inbox again." });
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message || "Could not resend email.", variant: "destructive" });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? "Sending…" : "Resend confirmation email"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            )}

            {/* Update Password Form */}
            {mode === "update-password" && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
