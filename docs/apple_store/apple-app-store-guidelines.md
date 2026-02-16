# Apple App Store Review Guidelines

Source: https://developer.apple.com/app-store/review/guidelines/

## Introduction

The guiding principle of the App Store is simple—we want to provide a safe experience for users to get apps and a great opportunity for all developers to be successful. We do this by offering a highly curated App Store where every app is reviewed by experts and an editorial team helps users discover new apps every day.

## Before You Submit

Make sure you:
- Test your app for crashes and bugs
- Ensure that all app information and metadata is complete and accurate
- Update your contact information in case App Review needs to reach you
- Provide App Review with full access to your app. If your app includes account-based features, provide either an active demo account or fully-featured demo mode
- Enable backend services so that they're live and accessible during review
- Include detailed explanations of non-obvious features and in-app purchases in the App Review notes

---

## 1. Safety

### 1.1 Objectionable Content
Apps should not include content that is offensive, insensitive, upsetting, intended to disgust, in exceptionally poor taste, or just plain creepy.

- **1.1.1** Defamatory, discriminatory, or mean-spirited content
- **1.1.2** Realistic portrayals of people or animals being killed, maimed, tortured, or abused
- **1.1.3** Depictions that encourage illegal or reckless use of weapons
- **1.1.4** Overtly sexual or pornographic material
- **1.1.5** Inflammatory religious commentary
- **1.1.6** False information and features, including inaccurate device data or trick/joke functionality
- **1.1.7** Harmful concepts which capitalize on recent or current events

### 1.2 User-Generated Content
Apps with user-generated content or social networking services must include:
- A method for filtering objectionable material from being posted to the app
- A mechanism to report offensive content and timely responses to concerns
- The ability to block abusive users from the service
- Published contact information so users can easily reach you

### 1.3 Kids Category
Apps in the Kids Category must not include links out of the app, purchasing opportunities, or other distractions to kids unless reserved for a designated area behind a parental gate.

### 1.4 Physical Harm
- **1.4.1** Medical apps that could provide inaccurate data or information must clearly disclose limitations
- **1.4.2** Drug dosage calculators must come from the drug manufacturer, a hospital, university, health insurance company, pharmacy, or other approved entity
- **1.4.3** Apps that encourage consumption of tobacco and vape products, illegal drugs, or excessive amounts of alcohol are not permitted
- **1.4.4** Apps may only display DUI checkpoints that are published by law enforcement agencies
- **1.4.5** Apps should not urge customers to use their devices in a way that contradicts safety documentation

### 1.5 Developer Information
People need to know how to reach you with questions and support issues. The support URL you provide will be visible on the App Store.

### 1.6 Data Security
- **1.6.1** Apps that use or store user data should have a defined privacy policy
- **1.6.2** Remote desktops that provide access to user devices must protect against fraud
- **1.6.3** Apps may not use cryptographic mechanisms for encrypting data within their apps
- **1.6.4** Apps that share data with law enforcement must identify these usages in their privacy policy

---

## 2. Performance

### 2.1 App Completeness
Submissions should be final versions and must include all necessary metadata. Apps with incomplete features, placeholder text, or test data will be rejected.

### 2.2 Beta Testing
Demos, betas, and trial versions of your app don't belong on the App Store. Use TestFlight instead.

### 2.3 Accurate Metadata
- **2.3.1** Don't include any hidden, dormant, or undocumented features
- **2.3.2** Include current, descriptive screenshots in your app listing. Don't use generic placeholder images
- **2.3.3** Screenshots should show the app in use, not merely the title art, login page, or splash screen
- **2.3.4** Previews must be captured from the app, contain only content that is appropriate for all audiences, and should clearly identify what users will see when they download the app
- **2.3.5** Select the most appropriate category for your app
- **2.3.6** Answer the age rating questions accurately
- **2.3.7** Choose a unique app name, assign keywords that accurately describe your app
- **2.3.8** Metadata should be appropriate for all audiences
- **2.3.9** You are responsible for securing the rights to use all materials in your app
- **2.3.10** Make sure your app is focused on the experience of the Apple platforms it supports
- **2.3.11** Apps submitted for pre-order must be complete and deliverable as submitted
- **2.3.12** Apps must clearly describe new features and product changes in their "What's New" text

### 2.4 Hardware Compatibility
- **2.4.1** iPhone apps should run on iPad whenever possible
- **2.4.2** Design your app to use power efficiently
- **2.4.3** Apple TV apps should work without hardware inputs beyond the Siri remote

### 2.5 Software Requirements
- **2.5.1** Apps may only use public APIs
- **2.5.2** Apps should be self-contained in their bundles
- **2.5.3** Apps that transmit viruses, files, computer code, or programs that may harm or disrupt normal operation will be rejected
- **2.5.4** Multitasking apps may only use background services for their intended purposes
- **2.5.5** Avoid using private APIs
- **2.5.6** Apps that browse the web must use the appropriate WebKit framework
- **2.5.7** Video streaming content that uses cellular data must use HLS
- **2.5.8** Apps that create alternate desktop/home screen environments are not appropriate for the App Store
- **2.5.9** Apps that alter or disable the functions of standard switches will be rejected
- **2.5.10** Apps should not have embedded advertising slots that are empty
- **2.5.11** SiriKit and Shortcuts should only target intents for which they are specifically designed
- **2.5.12** Apps using CallKit or including an SMS Fraud Extension should only block phone numbers
- **2.5.13** Apps using facial recognition for account authentication must use LocalAuthentication
- **2.5.14** Apps must use StoreKit for in-app purchasing
- **2.5.15** Apps must implement App Tracking Transparency
- **2.5.16** App Clips must only launch apps published by the same developer
- **2.5.17** Apps that support third-party keyboards should include the standard system keyboard
- **2.5.18** Widgets, extensions, and notifications should only display content from the primary app
- **2.5.19** Custom push notification alert sounds must be under 30 seconds

---

## 3. Business

### 3.1 Payments

#### 3.1.1 In-App Purchase
- If you want to unlock features or functionality within your app (by way of subscriptions, in-game currencies, game levels, access to premium content, or unlocking a full version), you must use in-app purchase
- Apps may not use their own mechanisms to unlock content or functionality
- Apps may not include buttons, external links, or other calls to action that direct customers to purchasing mechanisms other than in-app purchase (except as permitted in specific regions)

#### 3.1.2 Subscriptions
- Subscriptions may be offered alongside one-time purchases
- Subscription services must provide ongoing value
- Subscriptions must clearly explain what the user is getting for the price
- Auto-renewable subscriptions should make the duration of each subscription clearly evident in the title
- Customers must be able to easily see subscription management and clearly understand how to cancel their subscription

#### 3.1.3 Other Purchase Methods
- **3.1.3(a) Reader Apps**: Apps that allow users to access previously purchased content or content subscriptions (e.g., magazines, newspapers, books, audio, music, video) can allow users to access these items through in-app purchase
- **3.1.3(b) Multiplatform Services**: Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired elsewhere
- **3.1.3(c) Enterprise Services**: Apps that are sold to businesses rather than consumers may offer alternative payment methods
- **3.1.3(d) Person-to-Person Services**: If your app enables people to purchase digital content or services that will be consumed outside of the app, those purchases may use payment methods other than in-app purchase
- **3.1.3(e) Goods and Services Outside of the App**: You may only enable users to purchase goods and services to be consumed outside of the app through payment methods other than in-app purchase
- **3.1.3(f) Free Stand-alone Apps**: Free apps acting as a stand-alone companion to a paid, web-based tool may provide functionality without in-app purchase

#### 3.1.4 Hardware-Specific Content
In limited circumstances, in-app purchase is not required for content that is tied to physical products

#### 3.1.5 Cryptocurrencies
- Apps may not mine for cryptocurrencies unless the processing is performed off-device
- Apps may facilitate transactions or transmissions of cryptocurrency on an approved exchange
- Apps may not offer cryptocurrency for completing tasks

#### 3.1.6 Apple Pay
Apps using Apple Pay must provide all material purchase information to the user

#### 3.1.7 Advertising
- Ads displayed in an app must be appropriate for the app's age rating
- Apps in the Kids Category cannot include third-party advertising or analytics
- Human or animal subjects should not be portrayed in an offensive way

### 3.2 Other Business Model Issues

#### 3.2.1 Acceptable
- Displaying your own apps for purchase or promotion within your app
- Promoting verified cross-platform memberships
- Using approved platforms to promote verified physical goods

#### 3.2.2 Unacceptable
- Creating an interface for displaying third-party apps, extensions, or plug-ins similar to the App Store
- Monetizing built-in capabilities provided by the hardware or operating system
- Inflating referral sources
- Using apps primarily for advertising or marketing
- Ignoring requests to remove non-authorized uses of Apple services
- Apps should not require users to rate the app, review the app, watch videos, download other apps, tap on advertisements, enable tracking, or take other similar actions in order to access functionality, content, use the app, or receive monetary or other compensation

---

## 4. Design

### 4.1 Copycats
Don't create an app that appears confusingly similar to an existing Apple product, interface, app, or advertising theme. Don't copy another developer's app name, icons, description, screenshots, or product imagery.

### 4.2 Minimum Functionality
Your app should include features, content, and UI that elevate it beyond a repackaged website.

### 4.3 Spam
Don't create multiple apps with the same functionality. Don't continually submit substantially the same app.

### 4.4 Extensions
Extensions should be related to the host app's functionality.

### 4.5 Apple Sites and Services
- **4.5.1** Apps may use approved Apple RSS feeds
- **4.5.2** Using Apple's trademarks requires permission
- **4.5.3** Apps that use Game Center must include real gameplay
- **4.5.4** Push notifications must not be required for the app to function
- **4.5.5** Using Apple services for push notifications should not reveal personal info
- **4.5.6** Do not use Apple Services to send unsolicited messages

### 4.6 Alternate App Icons
Apps may offer customized icons but each change must be initiated by the user and include appropriate disclosures.

### 4.7 Third-Party Software
Apps may host and execute code that is not embedded in the binary, provided that this code:
- Does not change the primary purpose of the app
- Does not create an alternative distribution path for other code or apps
- Does not provide unlocking or extended functionality to other apps
- The code is not offered in an app store
- Does not bypass device security

### 4.8 Sign in with Apple
Apps that exclusively use a third-party sign-in service must also offer Sign in with Apple as an equivalent option.

### 4.9 Streaming Games
Apps may offer streaming games from a catalog as long as each game follows all App Store guidelines.

---

## 5. Legal

### 5.1 Privacy

#### 5.1.1 Data Collection and Storage
- **(i)** Privacy Policy Required: Apps that collect user or usage data must have a privacy policy
- **(ii)** Permission: Apps that collect user data must secure explicit user consent
- **(iii)** Data Minimization: Only request access to data relevant to the core functionality
- **(iv)** Access: Apps must respect the user's permission settings
- **(v)** Account Sign-In: If your app requires users to sign in, you must also offer account deletion
- **(vi)** Account Deletion: Apps must let users initiate deletion of their accounts and personal data
- **(vii)** Apps may not request user location data more than necessary
- **(viii)** Apps may not share data with third parties for tracking without user consent
- **(ix)** Apps in highly regulated fields (banking, healthcare, insurance, crypto) must be submitted by legal entities that provide the services

#### 5.1.2 Data Use and Sharing
- **(i)** Apps must have a clear privacy policy explaining what data is collected and how it's used
- **(ii)** Data collected from apps may not be used for advertising or data mining unless authorized
- **(iii)** Apps may not secretly mine user contacts for advertising
- **(iv)** Do not build or display a user profile based on collected data without permission

#### 5.1.3 Health and Health Research
Health data must be handled with special care and may not be shared for advertising.

#### 5.1.4 Kids
Apps in the Kids Category may not include third-party advertising or analytics.

#### 5.1.5 Location Services
Use of location data should be necessary for the app's core functionality.

### 5.2 Intellectual Property
Make sure your app only includes content that you created or that you have a license to use.

#### 5.2.1 Generally
Ensure you have all necessary licenses before submitting your app.

#### 5.2.2 Third-Party Sites/Services
If your app uses, accesses, monetizes access to, or displays content from a third-party service, ensure you are specifically permitted to do so.

#### 5.2.3 Audio/Video Downloading
Apps must not facilitate unauthorized downloading or distribution of copyrighted media.

#### 5.2.4 Trademarks
Don't use protected third-party material without permission.

#### 5.2.5 Apple Endorsements
Don't suggest your app is endorsed by Apple.

### 5.3 Gaming, Gambling, and Lotteries
Gambling apps must be offered by organizations with proper gambling licenses.

### 5.4 VPN Apps
VPN apps must make a clear declaration of what user data will be collected.

### 5.5 Mobile Device Management
MDM apps may not sell, use, or disclose to third parties any data for any purpose.

### 5.6 Developer Code of Conduct
- Act with integrity in all interactions
- Respect App Review decisions and don't manipulate customers
- Accurate representations in all communications
- Respond to App Review requests in a timely manner

### 5.7 HTML5 Games, Bots, and Plug-ins
Apps may include or run code that is not embedded in the binary, provided that code is embedded in HTML5, run by the built-in WebKit framework, and that:
- Developers must provide discovery of mini apps through the App Store
- Developers must provide a mechanism for users to report objectionable content
- Developers must verify that mini apps are compliant with guidelines

---

## After You Submit

Once you've submitted your app and metadata, App Review will review your app. There are a few things to know:

- **Timing**: In most cases, review takes 24 hours
- **Expedited Review**: If you have a critical issue, you can request an expedited review
- **Rejection Response**: If your app is rejected, you can respond or resubmit
- **Appeals**: You may appeal decisions using the App Store Review Board

---

## Key Requirements Summary

### For Login-Required Apps:
- Provide demo account credentials in App Review notes
- Offer Sign in with Apple if using third-party sign-in
- Provide account deletion functionality

### For In-App Purchases:
- Use StoreKit for all digital goods and subscriptions
- Include a "Restore Purchases" button for non-consumables and subscriptions
- Clearly display subscription terms and pricing
- Make subscription management easily accessible

### For Privacy:
- Include a privacy policy accessible from within the app and in App Store Connect
- Request only necessary permissions
- Implement App Tracking Transparency for tracking
- Enable account deletion

### For Content:
- Ensure content is appropriate for the selected age rating
- Moderate user-generated content
- Don't include objectionable or harmful content

### For Technical Quality:
- Test thoroughly on all supported devices
- Don't crash or have major bugs
- Support iPad if you're an iPhone app
- Use power efficiently
