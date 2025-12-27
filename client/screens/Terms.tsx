import { Link } from "wouter";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#0F1419]" data-testid="page-terms">
      <header className="bg-[#1A1F25] border-b border-white/10">
        <div className="container mx-auto py-4 px-4">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-[#27AE60]" data-testid="link-home">
              ChefSpAIce
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white" data-testid="text-page-title">Terms of Service</h1>
          <p className="text-gray-400 mb-6">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Introduction</h2>
              <p className="text-gray-400 mb-4">
                Welcome to ChefSpAIce. These Terms of Service ("Terms") govern your access to and use of the ChefSpAIce application and services. Please read these Terms carefully. By accessing or using our application, you agree to be bound by these Terms and our Privacy Policy.
              </p>
              <p className="text-gray-400">
                If you disagree with any part of the Terms, you may not access or use our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Account Registration</h2>
              <p className="text-gray-400 mb-4">
                ChefSpAIce can be used as a guest without registration. However, to sync your data across devices and access all features, you may register for an account. When you register, you agree to provide accurate information and to keep your account information updated.
              </p>
              <p className="text-gray-400 mb-4">
                You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
              <p className="text-gray-400">
                We reserve the right to suspend or terminate your account if any information provided during registration proves to be inaccurate, false, or misleading.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Free Service</h2>
              <p className="text-gray-400 mb-4">
                ChefSpAIce is currently provided as a free service. We reserve the right to introduce paid features or subscriptions in the future, with reasonable notice to users.
              </p>
              <p className="text-gray-400">
                We also accept voluntary donations to support the development and maintenance of the application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">User Content</h2>
              <p className="text-gray-400 mb-4">
                Our application allows you to store content, including food inventory data, recipes, and meal plans ("User Content"). You retain ownership of your User Content.
              </p>
              <p className="text-gray-400 mb-4">
                By using ChefSpAIce, you grant us a limited license to store and process your User Content for the purpose of providing our services.
              </p>
              <p className="text-gray-400">
                You are solely responsible for your User Content and the accuracy of the information you provide.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Acceptable Use</h2>
              <p className="text-gray-400 mb-4">
                You agree to use our application only for lawful purposes and in accordance with these Terms. Specifically, you agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-400 mb-4">
                <li>Use our application in any way that violates any applicable law or regulation</li>
                <li>Use our application to impersonate any person or entity</li>
                <li>Engage in any activity that interferes with or disrupts the functioning of our application</li>
                <li>Attempt to gain unauthorized access to our application or its related systems</li>
                <li>Use any automated means to access our application without our permission</li>
                <li>Share your account credentials with third parties</li>
              </ul>
              <p className="text-gray-400">
                Violation of these acceptable use provisions may result in suspension or termination of your access to our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Third-Party Services</h2>
              <p className="text-gray-400 mb-4">
                Our application integrates with third-party services, including OpenAI, Open Food Facts, and USDA FoodData Central. Your use of these third-party services is subject to their respective terms and privacy policies.
              </p>
              <p className="text-gray-400 mb-4">
                We do not control these third-party services and are not responsible for their content, privacy practices, or performance.
              </p>
              <p className="text-gray-400">
                We encourage you to review the terms and privacy policies of any third-party services that you interact with through our application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Intellectual Property</h2>
              <p className="text-gray-400 mb-4">
                Our application and its original content, features, and functionality are owned by ChefSpAIce and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-400">
                The ChefSpAIce name and logo are trademarks of ChefSpAIce. You may not use such marks without our prior written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Disclaimers</h2>
              <p className="text-gray-400 mb-4">
                Our application is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not warrant that our application will be uninterrupted or error-free.
              </p>
              <p className="text-gray-400 mb-4">
                We do not guarantee the accuracy, completeness, or usefulness of information available from our application, including nutritional information and recipe recommendations. Any reliance you place on such information is strictly at your own risk.
              </p>
              <p className="text-gray-400">
                The nutritional information and expiration date suggestions provided through our application should not be considered as professional medical or food safety advice. Always use your own judgment regarding food safety and consult with healthcare professionals for dietary advice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Limitation of Liability</h2>
              <p className="text-gray-400 mb-4">
                To the maximum extent permitted by law, ChefSpAIce and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-400 mb-4">
                <li>Your access to or use of or inability to access or use our application</li>
                <li>Any conduct or content of any third party on our application</li>
                <li>Errors or inaccuracies in the content or data provided through our application</li>
                <li>Food spoilage or waste that occurs despite using our application</li>
                <li>Any health issues arising from following recipes or nutritional information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Changes to Terms</h2>
              <p className="text-gray-400">
                We may revise these Terms from time to time. The most current version will always be available in the application. By continuing to access or use our application after revisions become effective, you agree to be bound by the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Contact Us</h2>
              <p className="text-gray-400">
                If you have any questions about these Terms, please contact us at terms@chefspice.app.
              </p>
            </section>
          </div>
          
          <div className="border-t border-white/10 pt-6 mt-8">
            <Link href="/" className="text-[#27AE60] hover:underline" data-testid="link-back-home">&larr; Back to Home</Link>
          </div>
        </div>
      </main>

      <footer className="bg-[#1A1F25] py-6 mt-auto border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500" data-testid="text-copyright">
            &copy; {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
