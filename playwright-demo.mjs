import { chromium } from 'playwright';
import fs from 'fs';

console.log('🚀 Starting comprehensive Playwright demonstration...\n');
console.log('=' .repeat(60));

async function demonstratePlaywright() {
  let browser;
  
  try {
    // Step 1: Launch browser
    console.log('\n📌 STEP 1: Launching Chromium browser...');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('   ✅ Browser launched successfully!');
    console.log('   Browser version:', await browser.version());

    // Step 2: Create context and page
    console.log('\n📌 STEP 2: Creating browser context and page...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Playwright Demo Bot'
    });
    const page = await context.newPage();
    console.log('   ✅ Context created with viewport: 1280x720');
    console.log('   ✅ New page instance created');

    // Step 3: Navigate to app
    console.log('\n📌 STEP 3: Navigating to ChefSpAIce app...');
    const response = await page.goto('http://localhost:5000', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    console.log('   ✅ Navigation successful!');
    console.log('   Response status:', response.status());
    console.log('   Response URL:', response.url());

    // Step 4: Analyze page content
    console.log('\n📌 STEP 4: Analyzing page content...');
    const title = await page.title();
    const url = page.url();
    console.log('   📄 Page Title:', title || '(no title set)');
    console.log('   🔗 Current URL:', url);

    // Check for various elements
    console.log('\n📌 STEP 5: Checking for UI elements...');
    
    // Check for login button
    const loginButtonCount = await page.locator('[data-testid="auth-login-btn"]').count();
    if (loginButtonCount > 0) {
      console.log('   ✅ Found login button - authentication UI present');
      const buttonText = await page.locator('[data-testid="auth-login-btn"]').first().textContent();
      console.log('      Button text:', buttonText.trim());
    } else {
      console.log('   ℹ️  No login button found');
    }

    // Check for brand title
    const brandCount = await page.locator('[data-testid="brand-title"]').count();
    if (brandCount > 0) {
      const brandText = await page.locator('[data-testid="brand-title"]').first().textContent();
      console.log('   ✅ Found brand title:', brandText.trim());
    }

    // Check for any buttons
    const allButtons = await page.locator('button').count();
    console.log(`   📊 Total buttons on page: ${allButtons}`);

    // Check for any links
    const allLinks = await page.locator('a').count();
    console.log(`   📊 Total links on page: ${allLinks}`);

    // Step 6: Test JavaScript execution
    console.log('\n📌 STEP 6: Testing JavaScript execution...');
    const jsResult = await page.evaluate(() => {
      return {
        windowLocation: window.location.href,
        documentTitle: document.title,
        bodyClasses: document.body.className,
        hasReactRoot: !!document.getElementById('root'),
        timestamp: new Date().toISOString()
      };
    });
    console.log('   ✅ JavaScript execution successful!');
    console.log('   Window location:', jsResult.windowLocation);
    console.log('   Has React root:', jsResult.hasReactRoot);
    console.log('   Body classes:', jsResult.bodyClasses || '(none)');

    // Step 7: Take screenshots
    console.log('\n📌 STEP 7: Capturing screenshots...');
    
    // Full page screenshot
    await page.screenshot({ 
      path: 'demo-fullpage.png',
      fullPage: true 
    });
    console.log('   ✅ Full page screenshot saved: demo-fullpage.png');
    
    // Viewport screenshot
    await page.screenshot({ 
      path: 'demo-viewport.png' 
    });
    console.log('   ✅ Viewport screenshot saved: demo-viewport.png');

    // Step 8: Test network monitoring
    console.log('\n📌 STEP 8: Testing network monitoring...');
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/'),
      { timeout: 5000 }
    ).catch(() => null);
    
    // Try to trigger an API call by reloading
    await page.reload();
    const apiResponse = await apiPromise;
    
    if (apiResponse) {
      console.log('   ✅ Captured API call:', apiResponse.url());
      console.log('   Response status:', apiResponse.status());
    } else {
      console.log('   ℹ️  No API calls detected during page load');
    }

    // Step 9: Performance metrics
    console.log('\n📌 STEP 9: Collecting performance metrics...');
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart,
        domInteractive: timing.domInteractive - timing.domLoading
      };
    });
    console.log('   ⏱️  DOM Content Loaded:', metrics.domContentLoaded, 'ms');
    console.log('   ⏱️  Page Load Complete:', metrics.loadComplete, 'ms');
    console.log('   ⏱️  DOM Interactive:', metrics.domInteractive, 'ms');

    // Final summary
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎉 PLAYWRIGHT DEMONSTRATION COMPLETE!\n');
    console.log('✅ Successfully demonstrated:');
    console.log('   • Browser launch and control');
    console.log('   • Page navigation and loading');
    console.log('   • Element detection and interaction');
    console.log('   • JavaScript execution in browser context');
    console.log('   • Screenshot capture capabilities');
    console.log('   • Network monitoring');
    console.log('   • Performance metrics collection');
    console.log('\n💪 Playwright is fully operational and ready for testing!');
    
    // List created files
    console.log('\n📁 Created files:');
    if (fs.existsSync('demo-fullpage.png')) {
      const stats = fs.statSync('demo-fullpage.png');
      console.log(`   • demo-fullpage.png (${(stats.size / 1024).toFixed(1)} KB)`);
    }
    if (fs.existsSync('demo-viewport.png')) {
      const stats = fs.statSync('demo-viewport.png');
      console.log(`   • demo-viewport.png (${(stats.size / 1024).toFixed(1)} KB)`);
    }

  } catch (error) {
    console.error('\n❌ Error during demonstration:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed successfully');
    }
  }
}

// Run the demonstration
demonstratePlaywright().then(() => {
  console.log('\n✨ Demo completed successfully!\n');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Demo failed:', error.message);
  process.exit(1);
});