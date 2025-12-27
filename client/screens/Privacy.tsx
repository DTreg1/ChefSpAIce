import React from "react";
import { Link } from "wouter";

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-muted-foreground mb-6">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
              <p className="text-muted-foreground mb-4">
                At PantryPro, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
              </p>
              <p className="text-muted-foreground">
                Please read this Privacy Policy carefully. By accessing or using PantryPro, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy and our Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <p className="text-muted-foreground mb-4">We collect several types of information from and about users of our application:</p>
              
              <h3 className="text-xl font-medium mb-2">Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                When you register for an account, we collect your name, email address, and password. If you choose to sign in with a social media account, we may receive additional profile information from your social media provider.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Food Inventory Data</h3>
              <p className="text-muted-foreground mb-4">
                We collect information about the food items you add to your inventory, including product names, quantities, expiration dates, and nutritional information.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Usage Information</h3>
              <p className="text-muted-foreground mb-4">
                We collect information about how you interact with our application, including recipes viewed, food items added, and features used.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Device Information</h3>
              <p className="text-muted-foreground">
                We may collect information about your device, including your IP address, browser type, operating system, and mobile device identifiers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">We use the information we collect about you for various purposes:</p>
              
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>To provide, maintain, and improve our application</li>
                <li>To process your account registration and provide you with access to certain features</li>
                <li>To generate personalized recipe recommendations based on your inventory items</li>
                <li>To respond to your inquiries and provide customer support</li>
                <li>To send you technical notices, updates, security alerts, and administrative messages</li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>To protect the security and integrity of our application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <p className="text-muted-foreground mb-4">
                Our application integrates with third-party services to provide certain features. These third parties may receive your information only for the purpose of providing these services to us:
              </p>
              
              <h3 className="text-xl font-medium mb-2">OpenAI</h3>
              <p className="text-muted-foreground mb-4">
                We use OpenAI's services for generating recipe recommendations and images. When you request recipe suggestions, we send your inventory data to OpenAI's API. This data is used in accordance with <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI's Privacy Policy</a>.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Open Food Facts</h3>
              <p className="text-muted-foreground mb-4">
                We access the Open Food Facts database to retrieve product information when you scan barcodes. Your device sends the barcode information directly to the Open Food Facts API. This interaction is subject to the <a href="https://world.openfoodfacts.org/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Open Food Facts Terms of Use</a>.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Social Media Providers</h3>
              <p className="text-muted-foreground">
                If you choose to connect your social media account, we may receive information from the social media provider. The information we receive is governed by this Privacy Policy, while information the social media provider collects is subject to their privacy practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
              <p className="text-muted-foreground">
                Your account is protected by a password. You are responsible for keeping your password confidential and for restricting access to your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights and Choices</h2>
              <p className="text-muted-foreground mb-4">You have several rights regarding your personal information:</p>
              
              <h3 className="text-xl font-medium mb-2">Account Information</h3>
              <p className="text-muted-foreground mb-4">
                You can review and update your account information by logging into your account settings.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Data Access and Portability</h3>
              <p className="text-muted-foreground mb-4">
                You may request a copy of your personal information that we hold.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Deletion</h3>
              <p className="text-muted-foreground mb-4">
                You may request the deletion of your account and personal information. Note that some information may be retained for legitimate business purposes or to comply with legal obligations.
              </p>
              
              <h3 className="text-xl font-medium mb-2">Communication Preferences</h3>
              <p className="text-muted-foreground">
                You can opt out of receiving promotional communications from us by following the instructions in those communications or by updating your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our application is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us so that we can delete the information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to Our Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update our Privacy Policy from time to time. If we make material changes, we will notify you by email or by posting a notice on our application. Your continued use of the application after the effective date of the revised Privacy Policy constitutes your acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions or concerns about our Privacy Policy or our data practices, please contact us at privacy@pantrypro.app.
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