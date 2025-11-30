import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChefHat, 
  Refrigerator, 
  Calendar, 
  ShoppingCart, 
  Sparkles,
  Check,
  TrendingUp,
  Users,
  Clock,
  Leaf,
  Heart,
  Lock,
  Mail,
  Chrome,
  Github,
  Twitter,
  Apple,
  Code2,
  Loader2
} from "lucide-react";

interface OAuthConfigStatus {
  providers: {
    google: boolean;
    github: boolean;
    twitter: boolean;
    apple: boolean;
    replit: boolean;
  };
}

export default function AuthUI() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });
  const [emailFormError, setEmailFormError] = useState("");
  const [configuredProviders, setConfiguredProviders] = useState<string[]>(["Email"]);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    async function fetchOAuthConfig() {
      try {
        const response = await fetch("/api/auth/config-status");
        if (response.ok) {
          const config: OAuthConfigStatus = await response.json();
          const available: string[] = ["Email"];
          
          if (config.providers.google) available.push("Google");
          if (config.providers.github) available.push("GitHub");
          if (config.providers.twitter) available.push("X");
          if (config.providers.apple) available.push("Apple");
          if (config.providers.replit) available.push("Replit");
          
          setConfiguredProviders(available);
        }
      } catch (error) {
        console.error("Failed to fetch OAuth config:", error);
      } finally {
        setConfigLoading(false);
      }
    }
    
    fetchOAuthConfig();
  }, []);

  const handleEmailRegister = async () => {
    setIsLoading(true);
    setEmailFormError("");
    
    if (!emailFormData.email || !emailFormData.password) {
      setEmailFormError("Email and password are required");
      setIsLoading(false);
      return;
    }
    
    if (emailFormData.password.length < 8) {
      setEmailFormError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/email/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(emailFormData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        window.location.href = "/";
      } else {
        setEmailFormError(data.error || "Registration failed");
      }
    } catch (error) {
      setEmailFormError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEmailLogin = async () => {
    setIsLoading(true);
    setEmailFormError("");
    
    if (!emailFormData.email || !emailFormData.password) {
      setEmailFormError("Email and password are required");
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: emailFormData.email, // Passport local expects 'username'
          password: emailFormData.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        window.location.href = "/";
      } else {
        setEmailFormError(data.error || "Login failed");
      }
    } catch (error) {
      setEmailFormError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (provider?: string) => {
    if (!provider) return;
    
    setIsLoading(true);
    setSelectedProvider(provider);
    
    // Map provider names to OAuth endpoints
    const providerEndpoints: Record<string, string> = {
      "Google": "/api/auth/google/login",
      "GitHub": "/api/auth/github/login",
      "X": "/api/auth/twitter/login",
      "Apple": "/api/auth/apple/login",
      "Replit": "/api/auth/replit/login",
      "Email": "/api/auth/email/login"
    };
    
    const endpoint = providerEndpoints[provider];
    
    if (endpoint) {
      // For email, show the form instead of redirecting
      if (provider === "Email") {
        setShowEmailForm(true);
        setEmailFormError("");
        setIsLoading(false);
        return;
      }
      
      // Check if OAuth is configured for this provider
      try {
        const response = await fetch("/api/auth/config-status");
        const config = await response.json();
        
        // Map provider names to config keys (X is stored as twitter in backend)
        const providerConfigKey: Record<string, string> = {
          "Google": "google",
          "GitHub": "github", 
          "X": "twitter",
          "Apple": "apple",
          "Replit": "replit"
        };
        
        const configKey = providerConfigKey[provider];
        if (configKey && !config.providers[configKey]) {
          console.error(`${provider} OAuth is not configured. Please add valid OAuth credentials.`);
          alert(`${provider} authentication is not configured yet. Please set up OAuth credentials.`);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Failed to check OAuth configuration:", error);
      }
      
      // Redirect to OAuth provider
      window.location.href = endpoint;
    } else {
      console.error("Unknown provider:", provider);
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Refrigerator, text: "Smart inventory tracking", color: "text-blue-500" },
    { icon: Sparkles, text: "AI-powered recipe suggestions", color: "text-purple-500" },
    { icon: Leaf, text: "Reduce food waste", color: "text-green-500" },
    { icon: Calendar, text: "Meal planning made easy", color: "text-orange-500" },
    { icon: ShoppingCart, text: "Automated shopping lists", color: "text-pink-500" },
    { icon: Heart, text: "Personalized to your dietary needs", color: "text-red-500" }
  ];

  const stats = [
    { value: "50%", label: "Less food waste", icon: TrendingUp },
    { value: "10K+", label: "Active users", icon: Users },
    { value: "2hrs", label: "Weekly time saved", icon: Clock }
  ];

  const providers = [
    { name: "Google", icon: Chrome, color: "hover:bg-blue-50 dark:hover:bg-blue-950", iconColor: "text-blue-500" },
    { name: "GitHub", icon: Github, color: "hover:bg-gray-50 dark:hover:bg-gray-950", iconColor: "text-gray-700 dark:text-gray-300" },
    { name: "X", icon: Twitter, color: "hover:bg-sky-50 dark:hover:bg-sky-950", iconColor: "text-sky-500" },
    { name: "Apple", icon: Apple, color: "hover:bg-gray-50 dark:hover:bg-gray-950", iconColor: "text-gray-900 dark:text-gray-100" },
    { name: "Replit", icon: Code2, color: "hover:bg-orange-50 dark:hover:bg-orange-950", iconColor: "text-orange-500" },
    { name: "Email", icon: Mail, color: "hover:bg-green-50 dark:hover:bg-green-950", iconColor: "text-green-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-lime-950/50 via-background to-green-50/30 dark:from-lime-950/20 dark:via-background dark:to-green-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ChefHat className="w-12 h-12 text-primary" />
            <h1 className="text-5xl font-bold">ChefSpAIce</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Your AI-powered kitchen assistant
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left side - Benefits */}
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Transform Your Kitchen Experience</CardTitle>
                <CardDescription>
                  Join thousands who are saving time, money, and reducing food waste
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3" data-testid={`feature-${index}`}>
                    <div className={`p-2 rounded-lg bg-background ${feature.color}`}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center" data-testid={`stat-${index}`}>
                  <CardContent className="pt-6">
                    <stat.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right side - Auth */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Welcome to ChefSpAIce</CardTitle>
              <CardDescription>
                Sign in or create an account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signup" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="login" data-testid="tab-login">Log In</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signup" className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold mb-2">Start Your Journey</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your free account in seconds
                    </p>
                  </div>

                  {showEmailForm ? (
                    <div className="space-y-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowEmailForm(false);
                          setEmailFormError("");
                        }}
                        className="mb-2"
                        data-testid="button-back-from-email"
                      >
                        ← Back to options
                      </Button>
                      
                      {emailFormError && (
                        <Alert variant="destructive">
                          <AlertDescription>{emailFormError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name (Optional)</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={emailFormData.firstName}
                          onChange={(e) => setEmailFormData({...emailFormData, firstName: e.target.value})}
                          placeholder="John"
                          disabled={isLoading}
                          data-testid="input-firstName"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name (Optional)</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={emailFormData.lastName}
                          onChange={(e) => setEmailFormData({...emailFormData, lastName: e.target.value})}
                          placeholder="Doe"
                          disabled={isLoading}
                          data-testid="input-lastName"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={emailFormData.email}
                          onChange={(e) => setEmailFormData({...emailFormData, email: e.target.value})}
                          placeholder="john@example.com"
                          disabled={isLoading}
                          data-testid="input-email"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={emailFormData.password}
                          onChange={(e) => setEmailFormData({...emailFormData, password: e.target.value})}
                          placeholder="At least 8 characters"
                          disabled={isLoading}
                          data-testid="input-password"
                        />
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={handleEmailRegister}
                        disabled={isLoading}
                        data-testid="button-email-register"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </div>
                  ) : configLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {providers
                        .filter(provider => configuredProviders.includes(provider.name))
                        .map((provider) => (
                        <Button
                          key={provider.name}
                          variant="outline"
                          className={`w-full justify-start gap-3 ${provider.color} hover-elevate`}
                          onClick={() => handleAuth(provider.name)}
                          disabled={isLoading}
                          data-testid={`button-signup-${provider.name.toLowerCase()}`}
                        >
                          {isLoading && selectedProvider === provider.name ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <provider.icon className={`w-5 h-5 ${provider.iconColor}`} />
                          )}
                          Continue with {provider.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Secure & Private
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span>Powered by Replit Auth - Enterprise-grade security</span>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        By signing up, you'll get personalized meal recommendations, 
                        expiration alerts, and access to all premium features - completely free!
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="login" className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold mb-2">Welcome Back!</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign in to access your kitchen dashboard
                    </p>
                  </div>

                  {showEmailForm ? (
                    <div className="space-y-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowEmailForm(false);
                          setEmailFormError("");
                        }}
                        className="mb-2"
                        data-testid="button-back-from-email-login"
                      >
                        ← Back to options
                      </Button>
                      
                      {emailFormError && (
                        <Alert variant="destructive">
                          <AlertDescription>{emailFormError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="email-login">Email</Label>
                        <Input
                          id="email-login"
                          type="email"
                          value={emailFormData.email}
                          onChange={(e) => setEmailFormData({...emailFormData, email: e.target.value})}
                          placeholder="john@example.com"
                          disabled={isLoading}
                          data-testid="input-email-login"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password-login">Password</Label>
                        <Input
                          id="password-login"
                          type="password"
                          value={emailFormData.password}
                          onChange={(e) => setEmailFormData({...emailFormData, password: e.target.value})}
                          placeholder="Enter your password"
                          disabled={isLoading}
                          data-testid="input-password-login"
                        />
                      </div>
                      
                      <Button
                        className="w-full"
                        onClick={handleEmailLogin}
                        disabled={isLoading}
                        data-testid="button-email-login"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </div>
                  ) : configLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {providers
                        .filter(provider => configuredProviders.includes(provider.name))
                        .map((provider) => (
                        <Button
                          key={provider.name}
                          variant="outline"
                          className={`w-full justify-start gap-3 ${provider.color} hover-elevate`}
                          onClick={() => handleAuth(provider.name)}
                          disabled={isLoading}
                          data-testid={`button-login-${provider.name.toLowerCase()}`}
                        >
                          {isLoading && selectedProvider === provider.name ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <provider.icon className={`w-5 h-5 ${provider.iconColor}`} />
                          )}
                          Sign in with {provider.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Quick Access
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">New</Badge>
                      <span>Mobile app coming soon!</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>Your data is encrypted and secure</span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Bottom testimonial */}
        <Card className="mt-8 border-2 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-full bg-primary/20">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm italic mb-2">
                  "ChefSpAIce has completely transformed how I manage my kitchen. 
                  I've cut my food waste in half and discovered amazing recipes I never would have tried!"
                </p>
                <p className="text-xs text-muted-foreground">
                  - Sarah M., ChefSpAIce user for 3 months
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}