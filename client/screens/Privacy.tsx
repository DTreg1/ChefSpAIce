import { Link } from "wouter";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0F1419]" data-testid="page-privacy">
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
          <h1 className="text-3xl font-bold mb-6 text-white" data-testid="text-page-title">Privacy Policy</h1>
          <p className="text-gray-400 mb-6">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Introduction</h2>
              <p className="text-gray-400 mb-4">
                At ChefSpAIce, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
              </p>
              <p className="text-gray-400">
                Please read this Privacy Policy carefully. By accessing or using ChefSpAIce, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy and our Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Information We Collect</h2>
              <p className="text-gray-400 mb-4">We collect several types of information from and about users of our application:</p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Personal Information</h3>
              <p className="text-gray-400 mb-4">
                When you register for an account, we collect your username and password. Your password is securely hashed and never stored in plain text.
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Food Inventory Data</h3>
              <p className="text-gray-400 mb-4">
                We collect information about the food items you add to your inventory, including product names, quantities, expiration dates, storage locations, and nutritional information.
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Usage Information</h3>
              <p className="text-gray-400 mb-4">
                We collect information about how you interact with our application, including recipes viewed, food items added, and features used.
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Device Information</h3>
              <p className="text-gray-400">
                We may collect information about your device, including your device type, operating system, and app version.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">How We Use Your Information</h2>
              <p className="text-gray-400 mb-4">We use the information we collect about you for various purposes:</p>
              
              <ul className="list-disc pl-6 space-y-2 text-gray-400">
                <li>To provide, maintain, and improve our application</li>
                <li>To process your account registration and provide you with access to certain features</li>
                <li>To generate personalized recipe recommendations based on your inventory items</li>
                <li>To send you expiration notifications for food items</li>
                <li>To sync your data across devices when you're signed in</li>
                <li>To monitor and analyze usage patterns and trends</li>
                <li>To protect the security and integrity of our application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Third-Party Services</h2>
              <p className="text-gray-400 mb-4">
                Our application integrates with third-party services to provide certain features. These third parties may receive your information only for the purpose of providing these services to us:
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">OpenAI</h3>
              <p className="text-gray-400 mb-4">
                We use OpenAI's services for generating recipe recommendations and providing kitchen assistance. When you request recipe suggestions, we send your inventory data to OpenAI's API. This data is used in accordance with <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#27AE60] hover:underline">OpenAI's Privacy Policy</a>.
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Open Food Facts</h3>
              <p className="text-gray-400 mb-4">
                We access the Open Food Facts database to retrieve product information when you scan barcodes. Your device sends the barcode information directly to the Open Food Facts API. This interaction is subject to the <a href="https://world.openfoodfacts.org/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-[#27AE60] hover:underline">Open Food Facts Terms of Use</a>.
              </p>

              <h3 className="text-xl font-medium mb-2 text-white">USDA FoodData Central</h3>
              <p className="text-gray-400">
                We use the USDA FoodData Central API to provide nutrition information for food items. This is a public domain service provided by the U.S. Department of Agriculture.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Data Storage</h2>
              <p className="text-gray-400 mb-4">
                ChefSpAIce uses a local-first approach to data storage:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-400">
                <li><span className="text-white font-medium">Guest Users:</span> Your data is stored locally on your device and is not synced to our servers.</li>
                <li><span className="text-white font-medium">Registered Users:</span> Your data is stored both locally and synced to our cloud database for access across devices.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Data Security</h2>
              <p className="text-gray-400 mb-4">
                We implement appropriate technical and organizational measures to protect the security of your personal information. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
              <p className="text-gray-400">
                Your account is protected by a password that is hashed using SHA-256. You are responsible for keeping your password confidential.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Your Rights and Choices</h2>
              <p className="text-gray-400 mb-4">You have several rights regarding your personal information:</p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Account Information</h3>
              <p className="text-gray-400 mb-4">
                You can review and update your account information in the app settings.
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Data Deletion</h3>
              <p className="text-gray-400 mb-4">
                You may request the deletion of your account and personal information by contacting us.
              </p>
              
              <h3 className="text-xl font-medium mb-2 text-white">Notifications</h3>
              <p className="text-gray-400">
                You can control expiration notifications in the app settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Children's Privacy</h2>
              <p className="text-gray-400">
                Our application is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us so that we can delete the information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Changes to Our Privacy Policy</h2>
              <p className="text-gray-400">
                We may update our Privacy Policy from time to time. If we make material changes, we will notify you through the application. Your continued use of the application after the effective date of the revised Privacy Policy constitutes your acceptance of the changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-white">Contact Us</h2>
              <p className="text-gray-400">
                If you have any questions or concerns about our Privacy Policy or our data practices, please contact us at privacy@chefspice.app.
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
