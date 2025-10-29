import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Database, Globe, Mail, AlertCircle, UserCheck } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { AnimatedCard } from "@/components/animated-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Privacy() {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        "Account information (email, username) when you sign up",
        "Food inventory data you add to the application",
        "Recipe preferences and dietary restrictions",
        "Meal planning and shopping list data",
        "Usage analytics to improve the service",
        "Feedback and support communications"
      ]
    },
    {
      icon: Lock,
      title: "How We Use Your Information",
      content: [
        "Provide personalized recipe recommendations",
        "Track your food inventory and expiration dates",
        "Generate shopping lists based on your meal plans",
        "Improve our AI models and service quality",
        "Send important service updates and notifications",
        "Respond to your support requests"
      ]
    },
    {
      icon: Shield,
      title: "Data Security",
      content: [
        "All data is encrypted in transit using HTTPS",
        "Database encryption at rest for sensitive information",
        "Regular security audits and updates",
        "Access controls and authentication requirements",
        "Secure cloud infrastructure with redundancy",
        "No storage of payment card details (handled by Stripe)"
      ]
    },
    {
      icon: Globe,
      title: "Third-Party Services",
      content: [
        "OpenAI for recipe generation and AI features",
        "Stripe for secure payment processing",
        "USDA FoodData Central for nutrition information",
        "Google Cloud for secure data storage",
        "Analytics services for usage insights",
        "Email services for notifications"
      ]
    },
    {
      icon: Eye,
      title: "Your Privacy Rights",
      content: [
        "Access your personal data at any time",
        "Request correction of inaccurate information",
        "Delete your account and associated data",
        "Export your data in a portable format",
        "Opt-out of non-essential communications",
        "Control sharing preferences"
      ]
    },
    {
      icon: UserCheck,
      title: "Data Retention",
      content: [
        "Active account data kept while account is active",
        "Deleted accounts removed within 30 days",
        "Aggregated analytics data may be retained",
        "Legal obligations may require longer retention",
        "Backup data purged on regular schedule",
        "You can request immediate deletion"
      ]
    }
  ];

  return (
    <PageTransition className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: October 14, 2025
            </p>
          </div>
        </div>
      </div>

      <Alert className="border-primary/50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your privacy is important to us. This policy explains how we collect, use, and protect your information
          when you use ChefSpAIce.
        </AlertDescription>
      </Alert>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Our Commitment to Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            ChefSpAIce is committed to protecting your privacy and ensuring the security of your personal information.
            We believe in transparency about our data practices and giving you control over your information.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This Privacy Policy describes how we collect, use, share, and protect information when you use our 
            application. By using ChefSpAIce, you agree to the collection and use of information in accordance with 
            this policy.
          </p>
        </CardContent>
      </AnimatedCard>

      <div className="space-y-6">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <AnimatedCard key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="w-5 h-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </AnimatedCard>
          );
        })}
      </div>

      <AnimatedCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-primary" />
            Cookies and Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We use cookies and similar tracking technologies to improve your experience:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="text-muted-foreground">
                <strong>Essential cookies:</strong> Required for authentication and core functionality
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="text-muted-foreground">
                <strong>Preference cookies:</strong> Remember your settings and preferences
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span className="text-muted-foreground">
                <strong>Analytics cookies:</strong> Help us understand usage patterns (anonymized)
              </span>
            </li>
          </ul>
          <p className="text-muted-foreground">
            You can control cookie preferences in your browser settings. Disabling cookies may affect functionality.
          </p>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Children&apos;s Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            ChefSpAIce is not intended for use by children under 13 years of age. We do not knowingly collect 
            personal information from children under 13. If you believe we have collected information from 
            a child under 13, please contact us immediately.
          </p>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>International Data Transfers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your information may be transferred to and maintained on servers located outside of your state, 
            province, country, or other governmental jurisdiction. We ensure appropriate safeguards are in 
            place to protect your information in accordance with this Privacy Policy.
          </p>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Changes to This Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
            the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. Continued use of the 
            service after changes indicates acceptance of the updated policy.
          </p>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p>Email: privacy@aichef.app</p>
            <p>Support: Use the in-app feedback feature</p>
            <p>Response time: Within 48 hours</p>
          </div>
        </CardContent>
      </AnimatedCard>

      <div className="text-center text-sm text-muted-foreground pb-8">
        <p>© 2025 ChefSpAIce. All rights reserved.</p>
      </div>
    </PageTransition>
  );
}