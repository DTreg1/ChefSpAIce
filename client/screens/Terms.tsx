import React from "react";
import { Link } from "wouter";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto py-4 px-4">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              PantryPro
            </Link>
            <div className="space-x-4">
              <Link href="/login" className="text-foreground hover:text-primary transition-colors">
                Login
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-muted-foreground mb-6">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p className="text-muted-foreground mb-4">
                Welcome to PantryPro. These Terms of Service ("Terms") govern your access to and use of the PantryPro application and services. Please read these Terms carefully. By accessing or using our application, you agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-muted-foreground">
                If you disagree with any part of the Terms, you may not access or use our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Account Registration</h2>
              <p className="text-muted-foreground mb-4">
                To use certain features of our application, you must register for an account. When you register, you agree to provide accurate, current, and complete information and to keep your account information updated.
              </p>
              <p className="text-muted-foreground mb-4">
                You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate your account if any information provided during registration or thereafter proves to be inaccurate, false, or misleading.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Subscription and Payment</h2>
              <p className="text-muted-foreground mb-4">
                Some features of our application may require a paid subscription. By subscribing to a paid plan, you agree to pay the subscription fees according to the pricing terms presented to you.
              </p>
              <p className="text-muted-foreground mb-4">
                Subscription fees are billed in advance and are non-refundable. Your subscription will automatically renew unless you cancel it before the renewal date.
              </p>
              <p className="text-muted-foreground mb-4">
                We reserve the right to change subscription fees upon reasonable notice. If you continue to use our application after the fee change comes into effect, you will be charged the updated fee.
              </p>
              <p className="text-muted-foreground">
                Cancellation of your subscription will take effect at the end of your current billing period. You will not receive a refund for the current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">User Content</h2>
              <p className="text-muted-foreground mb-4">
                Our application allows you to upload, store, and share content, including food inventory data, recipes, and images ("User Content"). You retain ownership of your User Content.
              </p>
              <p className="text-muted-foreground mb-4">
                By uploading User Content, you grant PantryPro a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, and display such content for the purpose of providing and improving our services.
              </p>
              <p className="text-muted-foreground mb-4">
                You are solely responsible for your User Content and the consequences of posting or publishing it. You represent and warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>You own or have the necessary rights to your User Content</li>
                <li>Your User Content does not violate the privacy rights, publicity rights, copyright, contractual rights, or any other rights of any person or entity</li>
                <li>Your User Content does not contain material that is false, intentionally misleading, or defamatory</li>
                <li>Your User Content does not contain malicious code, such as viruses or spyware</li>
              </ul>
              <p className="text-muted-foreground">
                We reserve the right to remove any User Content that violates these Terms or that we find objectionable for any reason, without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">
                You agree to use our application only for lawful purposes and in accordance with these Terms. Specifically, you agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Use our application in any way that violates any applicable law or regulation</li>
                <li>Use our application to impersonate any person or entity or misrepresent your affiliation with a person or entity</li>
                <li>Engage in any activity that interferes with or disrupts the functioning of our application</li>
                <li>Attempt to gain unauthorized access to our application or its related systems or networks</li>
                <li>Use any robot, spider, or other automated device to access our application for any purpose without our express written permission</li>
                <li>Use our application to transmit any material that contains viruses, Trojan horses, worms, or any other malicious or harmful program</li>
                <li>Share your account credentials with third parties or allow others to access your account</li>
              </ul>
              <p className="text-muted-foreground">
                Violation of these acceptable use provisions may result in suspension or termination of your access to our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">
                Our application integrates with third-party services, including OpenAI and Open Food Facts. Your use of these third-party services is subject to their respective terms and privacy policies.
              </p>
              <p className="text-muted-foreground mb-4">
                We do not control these third-party services and are not responsible for their content, privacy practices, or performance. Your interactions with any third-party websites or services are solely between you and the third party.
              </p>
              <p className="text-muted-foreground">
                We encourage you to review the terms and privacy policies of any third-party services that you interact with through our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground mb-4">
                Our application and its original content, features, and functionality are owned by PantryPro and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
              </p>
              <p className="text-muted-foreground mb-4">
                You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, or transmit any of the material from our application without our prior written consent.
              </p>
              <p className="text-muted-foreground">
                The PantryPro name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of PantryPro or its affiliates. You may not use such marks without our prior written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Disclaimers</h2>
              <p className="text-muted-foreground mb-4">
                Our application is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not warrant that our application will be uninterrupted or error-free, that defects will be corrected, or that our application is free of viruses or other harmful components.
              </p>
              <p className="text-muted-foreground mb-4">
                We do not guarantee the accuracy, completeness, or usefulness of information available from our application, including nutritional information and recipe recommendations. Any reliance you place on such information is strictly at your own risk.
              </p>
              <p className="text-muted-foreground">
                The nutritional information provided through our application, including that sourced from Open Food Facts, should not be considered as professional medical advice. You should consult with a healthcare professional before making significant dietary changes based on information provided by our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                To the maximum extent permitted by law, PantryPro and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Your access to or use of or inability to access or use our application</li>
                <li>Any conduct or content of any third party on our application</li>
                <li>Unauthorized access, use, or alteration of your transmissions or content</li>
                <li>Errors or inaccuracies in the content or data provided through our application</li>
                <li>Personal injury or property damage, of any nature whatsoever, resulting from your access to and use of our application</li>
              </ul>
              <p className="text-muted-foreground">
                In no event shall our total liability to you for all claims exceed the amount you have paid to us in the past twelve months, or fifty dollars ($50), whichever is greater.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Indemnification</h2>
              <p className="text-muted-foreground">
                You agree to defend, indemnify, and hold harmless PantryPro and its officers, directors, employees, and agents from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may revise these Terms from time to time. The most current version will always be posted on our application. By continuing to access or use our application after revisions become effective, you agree to be bound by the revised Terms. If you do not agree to the new Terms, you are no longer authorized to use our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed by and construed in accordance with the laws of the state of California, without regard to its conflict of law provisions. Your use of our application may also be subject to other local, state, national, or international laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us at terms@pantrypro.app.
              </p>
            </section>
          </div>
          
          <div className="border-t border-border pt-6 mt-8">
            <Link href="/" className="text-primary hover:underline">← Back to Home</Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PantryPro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}