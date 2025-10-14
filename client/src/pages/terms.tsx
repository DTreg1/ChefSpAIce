import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Scale, Ban, AlertTriangle, CheckCircle, Info, Gavel, Users } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { AnimatedCard } from "@/components/animated-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Terms() {
  const sections = [
    {
      icon: CheckCircle,
      title: "1. Acceptance of Terms",
      content: `By accessing and using AI Chef ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. We reserve the right to update these terms at any time, and continued use of the Service constitutes acceptance of any changes.`
    },
    {
      icon: Users,
      title: "2. User Accounts",
      content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account. You must be at least 13 years old to use this Service. You may not use another person's account without permission.`
    },
    {
      icon: Scale,
      title: "3. Acceptable Use",
      content: `You agree to use AI Chef only for lawful purposes and in accordance with these Terms. You may not use the Service to: violate any laws or regulations; infringe on intellectual property rights; transmit harmful code or malware; attempt to gain unauthorized access; harass or harm other users; or engage in any activity that disrupts the Service.`
    },
    {
      icon: Info,
      title: "4. Content and Intellectual Property",
      content: `The Service and its original content, features, and functionality are owned by AI Chef and are protected by international copyright, trademark, and other intellectual property laws. User-generated content remains the property of the user, but you grant us a license to use, store, and display such content as necessary to provide the Service.`
    },
    {
      icon: AlertTriangle,
      title: "5. Disclaimers and Limitations",
      content: `AI Chef is provided "as is" without warranties of any kind. We do not guarantee the accuracy of nutritional information, recipe suggestions, or food safety recommendations. Users should verify all information and use their own judgment regarding food safety and dietary requirements. We are not responsible for any allergic reactions or health issues resulting from use of the Service.`
    },
    {
      icon: Ban,
      title: "6. Limitation of Liability",
      content: `To the maximum extent permitted by law, AI Chef shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangible losses resulting from your use of the Service, even if we have been advised of the possibility of such damages.`
    },
    {
      icon: Gavel,
      title: "7. Governing Law",
      content: `These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.`
    }
  ];

  const additionalTerms = [
    {
      title: "Subscription and Payments",
      items: [
        "Free tier includes basic features with usage limits",
        "Premium subscriptions auto-renew unless cancelled",
        "Refunds are available within 7 days of purchase",
        "Prices may change with 30 days notice",
        "Payment processing handled securely by Stripe"
      ]
    },
    {
      title: "Data Usage and Privacy",
      items: [
        "Your data is used to provide and improve the Service",
        "We do not sell personal information to third parties",
        "You can export or delete your data at any time",
        "Analytics data may be used in aggregate form",
        "See our Privacy Policy for detailed information"
      ]
    },
    {
      title: "Service Availability",
      items: [
        "We strive for 99.9% uptime but do not guarantee it",
        "Scheduled maintenance will be announced in advance",
        "We may suspend service for security reasons",
        "Features may be added or removed over time",
        "API access subject to rate limiting"
      ]
    },
    {
      title: "User Responsibilities",
      items: [
        "Maintain accurate account information",
        "Secure your account credentials",
        "Report any unauthorized access immediately",
        "Comply with all applicable laws",
        "Respect other users and their privacy"
      ]
    }
  ];

  return (
    <PageTransition className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ScrollText className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground mt-2">
              Last updated: October 14, 2025 | Effective immediately
            </p>
          </div>
        </div>
      </div>

      <Alert className="border-primary/50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Please read these Terms of Service carefully before using AI Chef. Your use of the Service 
          indicates your acceptance of these terms.
        </AlertDescription>
      </Alert>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Agreement Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            These Terms of Service ("Terms") govern your use of AI Chef, including our website, mobile 
            applications, and all related services (collectively, the "Service"). This is a legal agreement 
            between you and AI Chef.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By using our Service, you acknowledge that you have read, understood, and agree to be bound by 
            these Terms and our Privacy Policy. If you are using the Service on behalf of an organization, 
            you agree to these Terms on behalf of that organization.
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
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </CardContent>
            </AnimatedCard>
          );
        })}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Additional Terms</h2>
        {additionalTerms.map((term, index) => (
          <AnimatedCard key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{term.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {term.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </AnimatedCard>
        ))}
      </div>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Medical and Health Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> AI Chef is not a substitute for professional medical or nutritional advice.
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground">
            The nutritional information and dietary suggestions provided by AI Chef are for informational 
            purposes only. Always consult with a qualified healthcare provider or registered dietitian 
            before making significant changes to your diet, especially if you have health conditions or 
            food allergies.
          </p>
          <p className="text-muted-foreground">
            We make no representations or warranties about the accuracy of nutritional data, recipe safety, 
            or suitability for specific dietary needs. Users are responsible for verifying all information 
            and ensuring food safety practices.
          </p>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Termination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We reserve the right to terminate or suspend your account and access to the Service immediately, 
            without prior notice or liability, for any reason, including breach of these Terms. Upon 
            termination, your right to use the Service will immediately cease.
          </p>
          <p className="text-muted-foreground">
            You may terminate your account at any time through the account settings. Upon termination, 
            your data will be deleted according to our data retention policy outlined in the Privacy Policy.
          </p>
        </CardContent>
      </AnimatedCard>

      <AnimatedCard>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            For questions about these Terms of Service, please contact us:
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p>Email: legal@aichef.app</p>
            <p>Support: Use the in-app feedback feature</p>
            <p>Mailing: AI Chef Legal, PO Box 12345, Tech City, TC 54321</p>
          </div>
        </CardContent>
      </AnimatedCard>

      <div className="text-center text-sm text-muted-foreground pb-8">
        <p>© 2025 AI Chef. All rights reserved.</p>
        <p className="mt-2">
          By using AI Chef, you agree to these Terms of Service and our Privacy Policy.
        </p>
      </div>
    </PageTransition>
  );
}