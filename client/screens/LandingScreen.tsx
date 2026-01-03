import { StyleSheet, View, Text, Pressable, ScrollView, useWindowDimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { GlassColors, GlassEffect, AppColors } from "@/constants/theme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";

const isWeb = Platform.OS === "web";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isDark: boolean;
  isWide?: boolean;
}

function GlassCard({ children, style, testId }: { children: React.ReactNode; style?: any; testId?: string }) {
  const { isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;
  
  if (isWeb) {
    return (
      <View 
        style={[
          styles.glassCardWeb,
          { 
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
          style
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    );
  }
  
  return (
    <BlurView
      intensity={GlassEffect.blur.regular}
      tint={isDark ? "dark" : "light"}
      style={[styles.glassCard, style]}
    >
      <View 
        style={[
          styles.glassCardInner,
          { 
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          }
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    </BlurView>
  );
}

function FeatureCard({ icon, title, description, testId, isDark, isWide }: FeatureCardProps) {
  return (
    <GlassCard style={[styles.featureCard, isWide && styles.featureCardWide]} testId={`card-feature-${testId}`}>
      <View style={styles.featureIconContainer}>{icon}</View>
      <Text style={[styles.featureTitle, { color: "#FFFFFF" }]} data-testid={`text-feature-title-${testId}`}>
        {title}
      </Text>
      <Text style={[styles.featureDescription, { color: "rgba(255,255,255,0.8)" }]} data-testid={`text-feature-desc-${testId}`}>
        {description}
      </Text>
    </GlassCard>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isDark: boolean;
  isWide?: boolean;
}

function StepCard({ number, title, description, isDark, isWide }: StepCardProps) {
  return (
    <GlassCard style={[styles.stepCard, isWide && styles.stepCardWide]} testId={`card-step-${number}`}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: "#FFFFFF" }]} data-testid={`text-step-title-${number}`}>
          {title}
        </Text>
        <Text style={[styles.stepDescription, { color: "rgba(255,255,255,0.8)" }]} data-testid={`text-step-desc-${number}`}>
          {description}
        </Text>
      </View>
    </GlassCard>
  );
}

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isWide?: boolean;
}

function BenefitCard({ icon, title, description, testId, isWide }: BenefitCardProps) {
  return (
    <View style={[styles.benefitCard, isWide && styles.benefitCardWide]} data-testid={`card-benefit-${testId}`}>
      <View style={styles.benefitIconContainer}>{icon}</View>
      <Text style={styles.benefitTitle} data-testid={`text-benefit-title-${testId}`}>{title}</Text>
      <Text style={styles.benefitDescription} data-testid={`text-benefit-desc-${testId}`}>{description}</Text>
    </View>
  );
}

interface PricingCardProps {
  tier: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  onPress: () => void;
  testId: string;
  isWide?: boolean;
}

function PricingCard({ tier, price, period, description, features, isPopular, buttonText, onPress, testId, isWide }: PricingCardProps) {
  return (
    <GlassCard 
      style={[
        styles.pricingCard, 
        isWide && styles.pricingCardWide,
        isPopular && styles.pricingCardPopular
      ]} 
      testId={`card-pricing-${testId}`}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      )}
      <Text style={styles.pricingTier} data-testid={`text-pricing-tier-${testId}`}>{tier}</Text>
      <View style={styles.pricingPriceContainer}>
        <Text style={styles.pricingPrice} data-testid={`text-pricing-price-${testId}`}>{price}</Text>
        {period && <Text style={styles.pricingPeriod}>/{period}</Text>}
      </View>
      <Text style={styles.pricingDescription} data-testid={`text-pricing-desc-${testId}`}>{description}</Text>
      <View style={styles.pricingFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.pricingFeatureRow}>
            <Feather name="check" size={16} color={AppColors.primary} />
            <Text style={styles.pricingFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [
          isPopular ? styles.pricingButtonPrimary : styles.pricingButtonSecondary,
          pressed && styles.buttonPressed
        ]}
        onPress={onPress}
        data-testid={`button-pricing-${testId}`}
      >
        {isPopular ? (
          <LinearGradient
            colors={[AppColors.primary, "#1E8449"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pricingButtonGradient}
          >
            <Text style={styles.pricingButtonTextPrimary}>{buttonText}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.pricingButtonTextSecondary}>{buttonText}</Text>
        )}
      </Pressable>
    </GlassCard>
  );
}

interface TestimonialCardProps {
  name: string;
  role: string;
  quote: string;
  rating: number;
  testId: string;
  isWide?: boolean;
}

function TestimonialCard({ name, role, quote, rating, testId, isWide }: TestimonialCardProps) {
  return (
    <GlassCard style={[styles.testimonialCard, isWide && styles.testimonialCardWide]} testId={`card-testimonial-${testId}`}>
      <View style={styles.testimonialStars}>
        {[...Array(5)].map((_, i) => (
          <FontAwesome 
            key={i} 
            name={i < rating ? "star" : "star-o"} 
            size={16} 
            color={i < rating ? "#FFD700" : "rgba(255,255,255,0.3)"} 
          />
        ))}
      </View>
      <Text style={styles.testimonialQuote} data-testid={`text-testimonial-quote-${testId}`}>"{quote}"</Text>
      <View style={styles.testimonialAuthor}>
        <View style={styles.testimonialAvatar}>
          <Text style={styles.testimonialAvatarText}>{name.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.testimonialName} data-testid={`text-testimonial-name-${testId}`}>{name}</Text>
          <Text style={styles.testimonialRole}>{role}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  testId: string;
}

function FAQItem({ question, answer, isOpen, onToggle, testId }: FAQItemProps) {
  return (
    <Pressable onPress={onToggle} data-testid={`faq-item-${testId}`}>
      <GlassCard style={styles.faqCard}>
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion} data-testid={`text-faq-question-${testId}`}>{question}</Text>
          <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="rgba(255,255,255,0.7)" />
        </View>
        {isOpen && (
          <Text style={styles.faqAnswer} data-testid={`text-faq-answer-${testId}`}>{answer}</Text>
        )}
      </GlassCard>
    </Pressable>
  );
}

interface LandingScreenProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onAbout?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onSupport?: () => void;
}

export default function LandingScreen({ onGetStarted, onSignIn, onAbout, onPrivacy, onTerms, onSupport }: LandingScreenProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const isWide = width > 768;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    }
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    }
  };

  const handleAbout = () => {
    if (onAbout) {
      onAbout();
    }
  };

  const handlePrivacy = () => {
    if (onPrivacy) {
      onPrivacy();
    }
  };

  const handleTerms = () => {
    if (onTerms) {
      onTerms();
    }
  };

  const handleSupport = () => {
    if (onSupport) {
      onSupport();
    }
  };

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Busy Mom of 3",
      quote: "This app has completely transformed how I manage my kitchen. No more wasted groceries!",
      rating: 5,
    },
    {
      name: "James K.",
      role: "Home Chef",
      quote: "The AI recipe suggestions are incredible. It's like having a personal chef in my pocket.",
      rating: 5,
    },
    {
      name: "Emily R.",
      role: "Sustainability Advocate",
      quote: "I've reduced my food waste by 70% since using ChefSpAIce. Highly recommend!",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How does the AI recipe generation work?",
      answer: "Our AI analyzes the ingredients in your pantry and generates personalized recipes based on what you have. You can also specify dietary preferences, cooking time, and cuisine type for more tailored suggestions.",
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes! We offer a 7-day free trial with full access to all Pro features. No credit card required to start.",
    },
    {
      question: "Can I use the app on multiple devices?",
      answer: "Absolutely! Your account syncs across all your devices. Whether you're on your phone at the grocery store or tablet in the kitchen, your inventory stays up to date.",
    },
    {
      question: "How accurate is the expiration tracking?",
      answer: "We use AI-powered shelf life estimation combined with product data to give you accurate expiration alerts. You'll receive notifications before items expire so you can plan meals accordingly.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees.",
    },
  ];

  const trustLogos = [
    { name: "App Store", iconType: "material", icon: "apple" },
    { name: "Google Play", iconType: "material", icon: "google-play" },
    { name: "Replit", iconType: "custom", icon: "replit" },
    { name: "GitHub", iconType: "feather", icon: "github" },
  ];

  const ReplitLogo = ({ size = 24, color = "rgba(255,255,255,0.5)" }: { size?: number; color?: string }) => {
    return (
      <Svg width={size} height={size} viewBox="0 0 50 50">
        <Path
          d="M40 32H27V19h13c1.657 0 3 1.343 3 3v7C43 30.657 41.657 32 40 32zM14 6h10c1.657 0 3 1.343 3 3v10H14c-1.657 0-3-1.343-3-3V9C11 7.343 12.343 6 14 6zM14 45h10c1.657 0 3-1.343 3-3V32H14c-1.657 0-3 1.343-3 3v7C11 43.657 12.343 45 14 45z"
          fill={color}
        />
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0A1F0F", "#0F1419", "#0A0F14"] : ["#1A3D2A", "#1E4D35", "#0F2A1A"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header} data-testid="header">
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="chef-hat" size={32} color={AppColors.primary} />
            <Text style={styles.logoText} data-testid="text-logo">ChefSpAIce</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handleSignIn}
            data-testid="button-signin-header"
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>

        <View style={[styles.heroSection, isWide && styles.heroSectionWide]} data-testid="section-hero">
          <View style={styles.heroContent}>
            <View style={styles.tagline}>
              <MaterialCommunityIcons name="leaf" size={14} color={AppColors.primary} />
              <Text style={styles.taglineText} data-testid="text-tagline">Reduce Food Waste, Save Money</Text>
            </View>
            
            <Text style={styles.heroTitle} data-testid="text-hero-title">
              Your AI-Powered{"\n"}Kitchen Assistant
            </Text>
            
            <Text style={styles.heroSubtitle} data-testid="text-hero-subtitle">
              Manage your pantry, generate recipes from what you have, plan meals, 
              and never let food go to waste again.
            </Text>

            <View style={styles.heroButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={handleGetStarted}
                data-testid="button-get-started"
              >
                <LinearGradient
                  colors={[AppColors.primary, "#1E8449"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Get Started Free</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={handleSignIn}
                data-testid="button-learn-more"
              >
                <Text style={styles.secondaryButtonText}>Learn More</Text>
              </Pressable>
            </View>
            
            <Text style={styles.trialText}>7-day free trial, no credit card required</Text>
          </View>
        </View>

        <View style={styles.trustSection} data-testid="section-trust">
          <Text style={styles.trustTitle}>Featured On</Text>
          <View style={[styles.trustLogos, isWide && styles.trustLogosWide]}>
            {trustLogos.map((logo, index) => (
              <View key={index} style={styles.trustLogoItem}>
                <View style={styles.trustLogoIconContainer}>
                  {logo.iconType === "material" ? (
                    <MaterialCommunityIcons name={logo.icon as any} size={24} color="rgba(255,255,255,0.5)" />
                  ) : logo.iconType === "custom" && logo.icon === "replit" ? (
                    <ReplitLogo size={24} color="rgba(255,255,255,0.5)" />
                  ) : (
                    <Feather name={logo.icon as any} size={24} color="rgba(255,255,255,0.5)" />
                  )}
                </View>
                <Text style={styles.trustLogoText}>{logo.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} data-testid="section-benefits">
          <Text style={styles.sectionTitle} data-testid="text-benefits-title">Why Choose ChefSpAIce?</Text>
          <Text style={styles.sectionSubtitle} data-testid="text-benefits-subtitle">
            Save money, reduce waste, and eat better
          </Text>
          
          <View style={[styles.benefitsGrid, isWide && styles.benefitsGridWide]}>
            <BenefitCard
              testId="save-money"
              isWide={isWide}
              icon={<Feather name="dollar-sign" size={32} color={AppColors.primary} />}
              title="Save $200+/month"
              description="Stop throwing away expired food. Our users save an average of $200 per month on groceries."
            />
            <BenefitCard
              testId="reduce-waste"
              isWide={isWide}
              icon={<Feather name="trash-2" size={32} color={AppColors.primary} />}
              title="Reduce Waste by 70%"
              description="Smart expiration tracking and AI-powered meal planning means less food in the trash."
            />
            <BenefitCard
              testId="eat-better"
              isWide={isWide}
              icon={<Feather name="heart" size={32} color={AppColors.primary} />}
              title="Eat Healthier"
              description="Personalized recipes based on your dietary preferences and what's actually in your kitchen."
            />
            <BenefitCard
              testId="save-time"
              isWide={isWide}
              icon={<Feather name="clock" size={32} color={AppColors.primary} />}
              title="Save 5+ Hours/Week"
              description="No more wondering 'what's for dinner?' AI suggests meals in seconds, not hours."
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-how-it-works">
          <Text style={styles.sectionTitle} data-testid="text-howitworks-title">How It Works</Text>
          <Text style={styles.sectionSubtitle} data-testid="text-howitworks-subtitle">
            Get started in three simple steps
          </Text>
          
          <View style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}>
            <StepCard
              number="1"
              title="Add Your Food"
              description="Scan barcodes, take photos, or manually add items to your inventory."
              isDark={isDark}
              isWide={isWide}
            />
            <StepCard
              number="2"
              title="Get AI Recipes"
              description="Tell us what you're craving and we'll create recipes using your ingredients."
              isDark={isDark}
              isWide={isWide}
            />
            <StepCard
              number="3"
              title="Plan & Cook"
              description="Add recipes to your meal plan and follow step-by-step instructions."
              isDark={isDark}
              isWide={isWide}
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-features">
          <Text style={styles.sectionTitle} data-testid="text-features-title">Smart Features</Text>
          <Text style={styles.sectionSubtitle} data-testid="text-features-subtitle">
            Everything you need to run an efficient kitchen
          </Text>
          
          <View style={[styles.featuresGrid, isWide && styles.featuresGridWide]}>
            <FeatureCard
              testId="barcode"
              isDark={isDark}
              isWide={isWide}
              icon={<MaterialCommunityIcons name="barcode-scan" size={28} color={AppColors.primary} />}
              title="Barcode Scanning"
              description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
            />
            <FeatureCard
              testId="ai-recipes"
              isDark={isDark}
              isWide={isWide}
              icon={<MaterialCommunityIcons name="creation" size={28} color={AppColors.primary} />}
              title="AI Recipe Generation"
              description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
            />
            <FeatureCard
              testId="expiration"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="clock" size={28} color={AppColors.primary} />}
              title="Expiration Tracking"
              description="Never forget about food again. Get notifications before items expire."
            />
            <FeatureCard
              testId="meal-planning"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="calendar" size={28} color={AppColors.primary} />}
              title="Meal Planning"
              description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
            />
            <FeatureCard
              testId="shopping"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="shopping-cart" size={28} color={AppColors.primary} />}
              title="Smart Shopping Lists"
              description="Auto-generate shopping lists from recipes. Check off items as you shop."
            />
            <FeatureCard
              testId="analytics"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="bar-chart-2" size={28} color={AppColors.primary} />}
              title="Waste Analytics"
              description="Track your food waste and savings over time. See your environmental impact."
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-pricing">
          <Text style={styles.sectionTitle} data-testid="text-pricing-title">Simple, Transparent Pricing</Text>
          <Text style={styles.sectionSubtitle} data-testid="text-pricing-subtitle">
            Choose the plan that works best for you
          </Text>
          
          <View style={styles.billingToggleContainer}>
            <Pressable 
              style={styles.billingToggle}
              onPress={() => setIsAnnual(!isAnnual)}
              data-testid="toggle-billing-period"
            >
              <View style={[styles.billingOption, !isAnnual && styles.billingOptionActive]}>
                <Text style={[styles.billingOptionText, !isAnnual && styles.billingOptionTextActive]}>Monthly</Text>
              </View>
              <View style={[styles.billingOption, isAnnual && styles.billingOptionActive]}>
                <Text style={[styles.billingOptionText, isAnnual && styles.billingOptionTextActive]}>Annually</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 17%</Text>
                </View>
              </View>
            </Pressable>
          </View>
          
          <View style={[styles.pricingGrid, isWide && styles.pricingGridWide]}>
            <PricingCard
              tier="Basic"
              price={isAnnual ? "$49.90" : "$4.99"}
              period={isAnnual ? "year" : "month"}
              description="Perfect for getting started"
              features={[
                "25 pantry items",
                "5 AI recipes per month",
                "Standard storage areas",
                "5 cookware items",
                "Item scanning",
                "Daily meal planning",
              ]}
              buttonText="Start Free Trial"
              onPress={handleGetStarted}
              testId="basic"
              isWide={isWide}
            />
            <PricingCard
              tier="Pro"
              price={isAnnual ? "$99.90" : "$9.99"}
              period={isAnnual ? "year" : "month"}
              description="Best for home cooks"
              features={[
                "Unlimited pantry items",
                "Unlimited AI recipes",
                "Recipe & Bulk Scanning",
                "Customizable storage areas",
                "Live AI Kitchen Assistant",
                "Weekly meal prepping",
              ]}
              isPopular={true}
              buttonText="Start Free Trial"
              onPress={handleGetStarted}
              testId="pro"
              isWide={isWide}
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-testimonials">
          <Text style={styles.sectionTitle} data-testid="text-testimonials-title">Loved by Thousands</Text>
          <Text style={styles.sectionSubtitle} data-testid="text-testimonials-subtitle">
            See what our users are saying
          </Text>
          
          <View style={[styles.testimonialsGrid, isWide && styles.testimonialsGridWide]}>
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                {...testimonial}
                testId={`${index + 1}`}
                isWide={isWide}
              />
            ))}
          </View>
        </View>

        <View style={styles.section} data-testid="section-faq">
          <Text style={styles.sectionTitle} data-testid="text-faq-title">Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle} data-testid="text-faq-subtitle">
            Got questions? We've got answers
          </Text>
          
          <View style={styles.faqContainer}>
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === index}
                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                testId={`${index + 1}`}
              />
            ))}
          </View>
        </View>

        <View style={styles.ctaSection} data-testid="section-cta">
          <GlassCard style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to reduce food waste?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of users saving money and the planet
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleGetStarted}
              data-testid="button-cta-get-started"
            >
              <LinearGradient
                colors={[AppColors.primary, "#1E8449"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButtonGradient}
              >
                <Text style={styles.ctaButtonText}>Start Your Free Trial</Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.ctaNote}>No credit card required</Text>
          </GlassCard>
        </View>

        <View style={styles.footer} data-testid="footer">
          <View style={styles.footerContent}>
            <View style={styles.footerLogo}>
              <MaterialCommunityIcons name="chef-hat" size={24} color={AppColors.primary} />
              <Text style={styles.footerLogoText}>ChefSpAIce</Text>
            </View>
            <Text style={styles.footerText}>Your AI-powered kitchen companion</Text>
            <View style={[styles.footerLinks, isWide ? {} : styles.footerLinksWrap]}>
              <Pressable onPress={handleAbout} data-testid="link-about">
                <Text style={styles.footerLink}>About</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={handlePrivacy} data-testid="link-privacy">
                <Text style={styles.footerLink}>Privacy</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={handleTerms} data-testid="link-terms">
                <Text style={styles.footerLink}>Terms</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={handleSupport} data-testid="link-support">
                <Text style={styles.footerLink}>Support</Text>
              </Pressable>
            </View>
            <Text style={styles.copyright}>&copy; 2025 ChefSpAIce. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  signInButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingVertical: 80,
  },
  heroContent: {
    alignItems: "center",
    maxWidth: 600,
  },
  tagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: GlassEffect.borderRadius.pill,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(39, 174, 96, 0.3)",
    marginBottom: 24,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.primary,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 28,
    maxWidth: 500,
  },
  heroButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  trialText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  trustSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 24,
  },
  trustLogos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  trustLogosWide: {
    gap: 48,
  },
  trustLogoItem: {
    alignItems: "center",
    gap: 8,
  },
  trustLogoIconContainer: {
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLogoText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 40,
  },
  benefitsGrid: {
    flexDirection: "column",
    gap: 24,
    width: "100%",
    maxWidth: 800,
  },
  benefitsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  benefitCard: {
    alignItems: "center",
    padding: 24,
  },
  benefitCardWide: {
    width: "45%",
    minWidth: 280,
  },
  benefitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  benefitDescription: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  featuresGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
  glassCard: {
    borderRadius: GlassEffect.borderRadius.lg,
    overflow: "hidden",
  },
  glassCardWeb: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
  },
  glassCardInner: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
    padding: 20,
  },
  featureCard: {
    padding: 24,
  },
  featureCardWide: {
    minWidth: 280,
    maxWidth: 300,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  stepsContainer: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  stepsContainerWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  stepCardWide: {
    flex: 1,
    minWidth: 280,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  billingToggleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  billingOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: AppColors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  billingOptionTextActive: {
    color: "#FFFFFF",
  },
  saveBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pricingGrid: {
    flexDirection: "column",
    gap: 20,
    width: "100%",
    maxWidth: 400,
  },
  pricingGridWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 24,
  },
  pricingCard: {
    padding: 28,
    alignItems: "center",
  },
  pricingCardWide: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
  },
  pricingCardPopular: {
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: GlassEffect.borderRadius.pill,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pricingTier: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    marginTop: 8,
  },
  pricingPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pricingPeriod: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  pricingDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
  },
  pricingFeatures: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  pricingFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  pricingButtonPrimary: {
    width: "100%",
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  pricingButtonSecondary: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
  },
  pricingButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  pricingButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pricingButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  testimonialsGrid: {
    flexDirection: "column",
    gap: 20,
    width: "100%",
    maxWidth: 400,
  },
  testimonialsGridWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 24,
  },
  testimonialCard: {
    padding: 24,
  },
  testimonialCardWide: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
  },
  testimonialStars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
  },
  testimonialQuote: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: "italic",
  },
  testimonialAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  testimonialRole: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  faqContainer: {
    width: "100%",
    maxWidth: 700,
    gap: 12,
  },
  faqCard: {
    padding: 20,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
    marginTop: 16,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  ctaCard: {
    padding: 40,
    alignItems: "center",
    maxWidth: 500,
    width: "100%",
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 24,
  },
  ctaButton: {
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  ctaButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaNote: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 16,
  },
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  footerContent: {
    alignItems: "center",
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  footerLogoText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 24,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  footerLinksWrap: {
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  footerDivider: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  copyright: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
