import { chromium } from 'playwright';

(async () => {
  console.log('Starting Playwright test...');
  
  try {
    // Create browser instance
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Browser launched successfully!');
    
    // Create a new page
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('Page created successfully!');
    
    // Navigate to a simple URL
    await page.goto('about:blank');
    
    console.log('Navigation successful!');
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Close browser
    await browser.close();
    
    console.log('✅ Playwright is working correctly!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Playwright test failed:', error);
    console.error('Full error:', error.stack);
    process.exit(1);
  }
})();