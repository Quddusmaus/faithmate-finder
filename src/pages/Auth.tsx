import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

type AuthMode = "login" | "signup" | "forgot-password" | "update-password";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for password recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    
    if (type === "recovery" && accessToken) {
      setMode("update-password");
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only redirect on SIGNED_IN event (not on initial load which uses INITIAL_SESSION)
        if (event === 'SIGNED_IN' && session?.user && mode !== "update-password") {
          // Check if user has a profile - use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("user_id", session.user.id)
                .maybeSingle();
              
              if (profile) {
                navigate("/profiles", { replace: true });
              } else {
                navigate("/profile-setup", { replace: true });
              }
            } catch (err) {
              console.error('Error checking profile:', err);
              navigate("/profile-setup", { replace: true });
            }
          }, 0);
        }
      }
    );

    // Check for existing session and clear stale tokens
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // If there's an error (like invalid refresh token), sign out to clear stale data
      if (error) {
        console.log('Clearing stale session:', error.message);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (profile) {
          navigate("/profiles");
        } else {
          navigate("/profile-setup");
        }
      }
    }).catch(async (err) => {
      // Handle any unexpected errors by clearing session
      console.log('Session check failed, clearing:', err);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    });

    return () => subscription.unsubscribe();
  }, [navigate, mode]);

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
        
        const { error, data } = await Promise.race([signInPromise, timeoutPromise]) as any;

        // Record the login attempt (don't block on this)
        Promise.resolve(supabase.rpc('record_login_attempt', {
          p_email: email,
          p_success: !error
        })).catch(e => console.error('Failed to record login attempt:', e));

        if (error) throw error;

        // If "Remember me" is unchecked, mark session for clearing on browser close
        if (!rememberMe && data?.session) {
          sessionStorage.setItem("clearSessionOnClose", "true");
        }

        toast({
          title: "Welcome back!",
          description: rememberMe ? "Successfully signed in." : "Successfully signed in. Session will end when you close the browser.",
        });

        // Explicitly navigate after successful login using window.location for guaranteed redirect
        if (data?.user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", data.user.id)
              .maybeSingle();
            
            console.log('Profile check:', { profile, profileError, userId: data.user.id });
            
            // Use window.location.href for guaranteed navigation
            if (profile) {
              window.location.href = "/profiles";
            } else {
              window.location.href = "/profile-setup";
            }
          } catch (profileErr) {
            console.error('Profile check failed:', profileErr);
            window.location.href = "/profile-setup";
          }
          return; // Don't continue to finally block until navigation completes
        }
      } else if (mode === "signup") {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to Unity Hearts.",
        });
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
      case "login":
        return "Welcome Back";
      case "signup":
        return "Join Us";
      case "forgot-password":
        return "Reset Password";
      case "update-password":
        return "Set New Password";
      default:
        return "Welcome";
    }
  };

  const getCardDescription = () => {
    switch (mode) {
      case "login":
        return "Sign in to continue your journey";
      case "signup":
        return "Create an account to start connecting";
      case "forgot-password":
        return "Enter your email to receive a reset link";
      case "update-password":
        return "Enter your new password below";
      default:
        return "";
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
