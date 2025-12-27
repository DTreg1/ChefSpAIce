import { Link } from "wouter";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0F1419]" data-testid="page-about">
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
          <h1 className="text-3xl font-bold mb-6 text-white" data-testid="text-page-title">About ChefSpAIce</h1>
          
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Our Mission</h2>
            <p className="text-gray-400 mb-4">
              ChefSpAIce was developed to help individuals manage their food inventory more efficiently, 
              reduce food waste, and discover new recipes based on ingredients they already have. 
              Our AI-powered platform provides personalized recommendations and a comprehensive kitchen 
              management system that makes cooking easier and more enjoyable.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Technology Stack</h2>
            <p className="text-gray-400 mb-4">
              ChefSpAIce is built using modern mobile and web technologies to provide a seamless experience across all platforms:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-400">
              <li><span className="font-medium text-white">Mobile App:</span> React Native with Expo for iOS and Android</li>
              <li><span className="font-medium text-white">Backend:</span> Node.js with Express</li>
              <li><span className="font-medium text-white">Database:</span> PostgreSQL for reliable data storage</li>
              <li><span className="font-medium text-white">AI:</span> OpenAI GPT-4o-mini for recipe generation and kitchen assistance</li>
              <li><span className="font-medium text-white">Hosting:</span> Deployed on Replit for seamless cloud operation</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Partners and Attributions</h2>
            
            <div className="space-y-6">
              <div className="border border-white/10 rounded-lg p-6 bg-[#1A1F25]" data-testid="card-attribution-openai">
                <div className="flex items-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white mr-3">
                    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white">OpenAI</h3>
                </div>
                <p className="text-gray-400 mb-3">
                  ChefSpAIce leverages OpenAI's advanced AI models to provide intelligent features:
                </p>
                <ul className="list-disc pl-6 text-gray-400">
                  <li>GPT-4o-mini for recipe generation based on available ingredients</li>
                  <li>AI-powered Kitchen Assistant for cooking guidance and tips</li>
                  <li>Smart shelf-life suggestions for food items</li>
                </ul>
                <div className="mt-4">
                  <a 
                    href="https://openai.com" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#27AE60] hover:underline"
                    data-testid="link-openai"
                  >
                    Learn more about OpenAI
                  </a>
                </div>
              </div>
              
              <div className="border border-white/10 rounded-lg p-6 bg-[#1A1F25]" data-testid="card-attribution-replit">
                <div className="flex items-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white mr-3">
                    <path d="M12.265 1.12534C12.8634 0.653685 13.7366 0.653685 14.335 1.12534L22.4534 7.51756C23.1818 8.09465 23.1818 9.14116 22.4534 9.71826L14.335 16.1105C13.7366 16.5821 12.8634 16.5821 12.265 16.1105L4.14661 9.71826C3.41825 9.14116 3.41825 8.09465 4.14661 7.51756L12.265 1.12534Z" />
                    <path d="M12.265 7.88969C12.8634 7.41804 13.7366 7.41804 14.335 7.88969L22.4534 14.2819C23.1818 14.859 23.1818 15.9055 22.4534 16.4826L14.335 22.8748C13.7366 23.3465 12.8634 23.3465 12.265 22.8748L4.14661 16.4826C3.41825 15.9055 3.41825 14.859 4.14661 14.2819L12.265 7.88969Z" fillOpacity="0.5" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white">Replit</h3>
                </div>
                <p className="text-gray-400 mb-3">
                  ChefSpAIce is proudly hosted on Replit, a powerful cloud development platform that enables:
                </p>
                <ul className="list-disc pl-6 text-gray-400">
                  <li>Seamless deployment and hosting</li>
                  <li>Real-time collaborative development</li>
                  <li>Efficient CI/CD workflows</li>
                </ul>
                <div className="mt-4">
                  <a 
                    href="https://replit.com" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#27AE60] hover:underline"
                    data-testid="link-replit"
                  >
                    Learn more about Replit
                  </a>
                </div>
              </div>
              
              <div className="border border-white/10 rounded-lg p-6 bg-[#1A1F25]" data-testid="card-attribution-openfoodfacts">
                <div className="flex items-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white mr-3">
                    <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white">Open Food Facts</h3>
                </div>
                <p className="text-gray-400 mb-3">
                  ChefSpAIce integrates with Open Food Facts, a free and open food product database that provides:
                </p>
                <ul className="list-disc pl-6 text-gray-400">
                  <li>Comprehensive nutritional information</li>
                  <li>Barcode scanning capabilities</li>
                  <li>Access to a global database of food products</li>
                </ul>
                <div className="mt-4">
                  <a 
                    href="https://openfoodfacts.org" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#27AE60] hover:underline"
                    data-testid="link-openfoodfacts"
                  >
                    Learn more about Open Food Facts
                  </a>
                </div>
              </div>

              <div className="border border-white/10 rounded-lg p-6 bg-[#1A1F25]" data-testid="card-attribution-usda">
                <div className="flex items-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white mr-3">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white">USDA FoodData Central</h3>
                </div>
                <p className="text-gray-400 mb-3">
                  ChefSpAIce uses the USDA FoodData Central API to provide:
                </p>
                <ul className="list-disc pl-6 text-gray-400">
                  <li>Comprehensive nutrition data lookup</li>
                  <li>Accurate calorie and macronutrient information</li>
                  <li>Vitamin and mineral content for food items</li>
                </ul>
                <div className="mt-4">
                  <a 
                    href="https://fdc.nal.usda.gov/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#27AE60] hover:underline"
                    data-testid="link-usda"
                  >
                    Learn more about USDA FoodData Central
                  </a>
                </div>
              </div>
            </div>
          </section>
          
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-white">Legal Information</h2>
            <p className="text-gray-400 mb-4">
              ChefSpAIce uses services and data from third-party providers according to their respective terms and licenses:
            </p>
            <ul className="list-disc pl-6 text-gray-400">
              <li>OpenAI services are used under OpenAI's <a href="https://openai.com/policies/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-[#27AE60] hover:underline">Terms of Use</a></li>
              <li>Open Food Facts data is used under the <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer" className="text-[#27AE60] hover:underline">Open Database License</a></li>
              <li>Replit services are used under Replit's <a href="https://replit.com/site/terms" target="_blank" rel="noopener noreferrer" className="text-[#27AE60] hover:underline">Terms of Service</a></li>
              <li>USDA FoodData Central is a public domain resource provided by the U.S. Department of Agriculture</li>
            </ul>
          </section>
          
          <div className="border-t border-white/10 pt-6">
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
