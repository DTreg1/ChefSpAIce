import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Feather,
  MaterialCommunityIcons,
  FontAwesome,
} from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/hooks/useTheme";
import { GlassColors, GlassEffect, AppColors } from "@/constants/theme";
import { NavigationContext } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useContext, useState } from "react";
import Constants from "expo-constants";

const isWeb = Platform.OS === "web";

// App store URLs - update these when app is published
const APP_STORE_URL = "https://apps.apple.com/app/chefspaice/id000000000"; // Replace with actual App Store URL
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.chefspaice.app"; // Replace with actual Play Store URL

// Safe navigation hook that returns null when not inside NavigationContainer
function useSafeNavigation(): NativeStackNavigationProp<any> | null {
  const navigationContext = useContext(NavigationContext);
  // Return the navigation object from context or null if not available
  return navigationContext as NativeStackNavigationProp<any> | null;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isDark: boolean;
  isWide?: boolean;
}

function GlassCard({
  children,
  style,
  testId,
}: {
  children: React.ReactNode;
  style?: any;
  testId?: string;
}) {
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
          style,
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
          },
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    </BlurView>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  testId,
  isDark,
  isWide,
}: FeatureCardProps) {
  return (
    <GlassCard
      style={[styles.featureCard, isWide && styles.featureCardWide]}
      testId={`card-feature-${testId}`}
    >
      <View style={styles.featureIconContainer}>{icon}</View>
      <Text
        style={[styles.featureTitle, { color: "rgba(255, 255, 255, 0.5)" }]}
        data-testid={`text-feature-title-${testId}`}
      >
        {title}
      </Text>
      <Text
        style={[styles.featureDescription, { color: "rgba(255,255,255,0.8)" }]}
        data-testid={`text-feature-desc-${testId}`}
      >
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

function StepCard({
  number,
  title,
  description,
  isDark,
  isWide,
}: StepCardProps) {
  return (
    <GlassCard
      style={[styles.stepCard, isWide && styles.stepCardWide]}
      testId={`card-step-${number}`}
    >
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text
          style={[styles.stepTitle, { color: "rgba(255, 255, 255, 0.5)" }]}
          data-testid={`text-step-title-${number}`}
        >
          {title}
        </Text>
        <Text
          style={[styles.stepDescription, { color: "rgba(255,255,255,0.8)" }]}
          data-testid={`text-step-desc-${number}`}
        >
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

function BenefitCard({
  icon,
  title,
  description,
  testId,
  isWide,
}: BenefitCardProps) {
  return (
    <View
      style={[styles.benefitCard, isWide && styles.benefitCardWide]}
      data-testid={`card-benefit-${testId}`}
    >
      <View style={styles.benefitIconContainer}>{icon}</View>
      <Text
        style={styles.benefitTitle}
        data-testid={`text-benefit-title-${testId}`}
      >
        {title}
      </Text>
      <Text
        style={styles.benefitDescription}
        data-testid={`text-benefit-desc-${testId}`}
      >
        {description}
      </Text>
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
  showDownloadButtons?: boolean;
  onDownloadiOS?: () => void;
  onDownloadAndroid?: () => void;
}

function PricingCard({
  tier,
  price,
  period,
  description,
  features,
  isPopular,
  buttonText,
  onPress,
  testId,
  isWide,
  showDownloadButtons,
  onDownloadiOS,
  onDownloadAndroid,
}: PricingCardProps) {
  return (
    <GlassCard
      style={[
        styles.pricingCard,
        isWide && styles.pricingCardWide,
        isPopular && styles.pricingCardPopular,
      ]}
      testId={`card-pricing-${testId}`}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      )}
      <Text
        style={styles.pricingTier}
        data-testid={`text-pricing-tier-${testId}`}
      >
        {tier}
      </Text>
      <View style={styles.pricingPriceContainer}>
        <Text
          style={styles.pricingPrice}
          data-testid={`text-pricing-price-${testId}`}
        >
          {price}
        </Text>
        {period && <Text style={styles.pricingPeriod}>/{period}</Text>}
      </View>
      <Text
        style={styles.pricingDescription}
        data-testid={`text-pricing-desc-${testId}`}
      >
        {description}
      </Text>
      <View style={styles.pricingFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.pricingFeatureRow}>
            <Feather name="check" size={16} color={AppColors.primary} />
            <Text style={styles.pricingFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      {showDownloadButtons ? (
        <View style={styles.downloadButtonsContainer}>
          <Text style={styles.downloadLabel}>Download the app:</Text>
          <View style={styles.downloadButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDownloadiOS}
              data-testid={`button-download-ios-${testId}`}
            >
              <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>App Store</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDownloadAndroid}
              data-testid={`button-download-android-${testId}`}
            >
              <MaterialCommunityIcons name="google-play" size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>Google Play</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            isPopular
              ? styles.pricingButtonPrimary
              : styles.pricingButtonSecondary,
            pressed && styles.buttonPressed,
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
      )}
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

function TestimonialCard({
  name,
  role,
  quote,
  rating,
  testId,
  isWide,
}: TestimonialCardProps) {
  return (
    <GlassCard
      style={[styles.testimonialCard, isWide && styles.testimonialCardWide]}
      testId={`card-testimonial-${testId}`}
    >
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
      <Text
        style={styles.testimonialQuote}
        data-testid={`text-testimonial-quote-${testId}`}
      >
        "{quote}"
      </Text>
      <View style={styles.testimonialAuthor}>
        <View style={styles.testimonialAvatar}>
          <Text style={styles.testimonialAvatarText}>{name.charAt(0)}</Text>
        </View>
        <View>
          <Text
            style={styles.testimonialName}
            data-testid={`text-testimonial-name-${testId}`}
          >
            {name}
          </Text>
          <Text style={styles.testimonialRole}>{role}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// Helper function to get showcase image URLs
function getShowcaseImageUrl(category: string, filename: string): string {
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:5000/api/showcase/${category}/${filename}`;
  }
  return '';
}

// Showcase screenshots data
const showcaseScreenshots = [
  {
    category: 'inventory',
    filename: '338A0B62-F334-41D1-8AE9-F27252F582DC_1_105_c.jpeg',
    label: 'Inventory',
    description: 'Track your pantry',
  },
  {
    category: 'recipes',
    filename: '85633BFE-AEE0-4C16-85F3-EB3E54BDCF22_1_105_c.jpeg',
    label: 'Recipes',
    description: 'AI-generated recipes',
  },
  {
    category: 'mealplan',
    filename: '9923E5F7-BDF1-4437-8DE5-2265D313F287_1_105_c.jpeg',
    label: 'Meal Plan',
    description: 'Plan your week',
  },
  {
    category: 'scanning',
    filename: 'B1DD5F3A-BCFE-4861-9097-6313C695FE20_1_105_c.jpeg',
    label: 'Scanning',
    description: 'Add items instantly',
  },
];

const heroScreenshot = {
  category: 'hero',
  filename: 'EB0F64E2-5BB7-4CB9-9C62-3AABEAF61B38_1_105_c.jpeg',
};

// Floating device mockup for hero section
function HeroDeviceMockup({ isWide }: { isWide: boolean }) {
  const frameWidth = isWide ? 280 : 200;
  const frameHeight = frameWidth * 2.16;
  const screenWidth = frameWidth - 14;
  const screenHeight = frameHeight - 28;
  const imageUrl = getShowcaseImageUrl(heroScreenshot.category, heroScreenshot.filename);

  // Floating animation styles for web
  const floatingStyle: React.CSSProperties = isWeb ? {
    animation: 'heroFloat 6s ease-in-out infinite',
    transformStyle: 'preserve-3d',
    transform: 'rotateY(-8deg) rotateX(2deg)',
  } : {};

  return (
    <View style={heroDeviceStyles.container} data-testid="hero-device-mockup">
      {isWeb && (
        <style>{`
          @keyframes heroFloat {
            0%, 100% { transform: rotateY(-8deg) rotateX(2deg) translateY(0px); }
            50% { transform: rotateY(-8deg) rotateX(2deg) translateY(-15px); }
          }
        `}</style>
      )}
      <div style={floatingStyle}>
        <View
          style={[
            heroDeviceStyles.phoneFrame,
            {
              width: frameWidth,
              height: frameHeight,
              borderRadius: frameWidth * 0.15,
            },
          ]}
        >
          <View
            style={[
              heroDeviceStyles.notch,
              {
                width: frameWidth * 0.35,
                height: 24,
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
              },
            ]}
          />
          <View
            style={[
              heroDeviceStyles.screen,
              {
                width: screenWidth,
                height: screenHeight,
                borderRadius: (frameWidth * 0.15) - 4,
              },
            ]}
          >
            {isWeb ? (
              <img
                src={imageUrl}
                alt="ChefSpAIce app preview"
                style={{
                  width: screenWidth,
                  height: screenHeight,
                  objectFit: 'cover',
                  borderRadius: (frameWidth * 0.15) - 4,
                }}
              />
            ) : (
              <View style={{ width: screenWidth, height: screenHeight, backgroundColor: '#1a1a1a' }} />
            )}
          </View>
          <View style={heroDeviceStyles.homeIndicator} />
        </View>
      </div>
      {/* Glow effect behind device */}
      <View style={heroDeviceStyles.glowEffect} />
    </View>
  );
}

const heroDeviceStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  phoneFrame: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 80px rgba(39, 174, 96, 0.15)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 15 },
          shadowOpacity: 0.6,
          shadowRadius: 30,
          elevation: 30,
        }),
  },
  notch: {
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  screen: {
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 10,
    width: 120,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  glowEffect: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(39, 174, 96, 0.15)',
    ...(Platform.OS === 'web'
      ? { filter: 'blur(60px)' }
      : {}),
    zIndex: -1,
  },
});

interface DeviceMockupProps {
  imageUrl: string;
  label: string;
  description: string;
  testId: string;
  isWide: boolean;
  index?: number;
  isHovered?: boolean;
  hoveredIndex?: number | null;
  onHover?: (index: number | null) => void;
  totalCount?: number;
}

function DeviceMockup({ 
  imageUrl, 
  label, 
  description, 
  testId, 
  isWide,
  index = 0,
  isHovered = false,
  hoveredIndex = null,
  onHover,
  totalCount = 4,
}: DeviceMockupProps) {
  const frameWidth = isWide ? 220 : 160;
  const frameHeight = frameWidth * 2.16;
  const screenWidth = frameWidth - 12;
  const screenHeight = frameHeight - 24;
  const notchWidth = frameWidth * 0.35;
  const notchHeight = 22;

  // Isometric effect calculations for web
  const centerIndex = (totalCount - 1) / 2;
  const offset = index - centerIndex;
  const anyHovered = hoveredIndex !== null;
  
  // Calculate transforms based on hover state
  let transformX: number;
  let rotateY: number;
  let translateZ: number;
  let scale: number;
  
  if (isHovered) {
    // Hovered device: straighten and pop forward
    transformX = 0;
    rotateY = 0;
    translateZ = 80;
    scale = 1.08;
  } else if (anyHovered && hoveredIndex !== null) {
    // Non-hovered devices spread apart when something is hovered
    const hoveredOffset = hoveredIndex - centerIndex;
    const distanceFromHovered = index - hoveredIndex;
    // Push devices away from the hovered one
    const spreadAmount = distanceFromHovered * 60;
    transformX = spreadAmount;
    rotateY = offset * 15; // Slightly more tilt when spread
    translateZ = -20; // Push back slightly
    scale = 0.95;
  } else {
    // Default isometric fan layout
    transformX = offset * -30;
    rotateY = offset * 12;
    translateZ = 0;
    scale = 1;
  }
  
  // Web-specific wrapper with 3D transforms
  const webWrapperStyle: React.CSSProperties = isWeb ? {
    perspective: '1000px',
    transformStyle: 'preserve-3d',
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: `rotateY(${rotateY}deg) translateX(${transformX}px) translateZ(${translateZ}px) scale(${scale})`,
    zIndex: isHovered ? 100 : 10 - Math.abs(offset),
    cursor: 'pointer',
    marginLeft: index === 0 ? 0 : -40, // Overlap devices
  } : {};

  const mockupContent = (
    <View style={deviceStyles.mockupContainer} data-testid={`device-mockup-${testId}`}>
      <View
        style={[
          deviceStyles.phoneFrame,
          {
            width: frameWidth,
            height: frameHeight,
            borderRadius: frameWidth * 0.15,
          },
        ]}
      >
        <View
          style={[
            deviceStyles.notch,
            {
              width: notchWidth,
              height: notchHeight,
              borderBottomLeftRadius: notchHeight / 2,
              borderBottomRightRadius: notchHeight / 2,
            },
          ]}
        />
        <View
          style={[
            deviceStyles.screen,
            {
              width: screenWidth,
              height: screenHeight,
              borderRadius: (frameWidth * 0.15) - 4,
            },
          ]}
        >
          {isWeb ? (
            <img
              src={imageUrl}
              alt={`${label} screenshot`}
              style={{
                width: screenWidth,
                height: screenHeight,
                objectFit: 'cover',
                borderRadius: (frameWidth * 0.15) - 4,
              }}
            />
          ) : (
            <View style={{ width: screenWidth, height: screenHeight, backgroundColor: '#1a1a1a' }} />
          )}
        </View>
        <View style={deviceStyles.homeIndicator} />
      </View>
      <Text style={[deviceStyles.mockupLabel, { opacity: isHovered || !isWeb ? 1 : 0.7 }]} data-testid={`text-mockup-label-${testId}`}>
        {label}
      </Text>
      <Text style={[deviceStyles.mockupDescription, { opacity: isHovered || !isWeb ? 1 : 0.5 }]} data-testid={`text-mockup-desc-${testId}`}>
        {description}
      </Text>
    </View>
  );

  if (isWeb && onHover) {
    return (
      <div
        style={webWrapperStyle}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
      >
        {mockupContent}
      </div>
    );
  }

  return mockupContent;
}

interface ScreenshotShowcaseProps {
  isWide: boolean;
}

function ScreenshotShowcase({ isWide }: ScreenshotShowcaseProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // For web with isometric effect, use a centered div instead of ScrollView
  if (isWeb) {
    return (
      <View style={deviceStyles.showcaseSection} data-testid="section-screenshot-showcase">
        <Text style={deviceStyles.showcaseTitle} data-testid="text-showcase-title">
          See ChefSpAIce in Action
        </Text>
        <Text style={deviceStyles.showcaseSubtitle} data-testid="text-showcase-subtitle">
          Experience the app that transforms your kitchen
        </Text>
        <div 
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '20px 60px',
            perspective: '1200px',
            width: '100%',
          }}
        >
          {showcaseScreenshots.map((screenshot, index) => (
            <DeviceMockup
              key={index}
              imageUrl={getShowcaseImageUrl(screenshot.category, screenshot.filename)}
              label={screenshot.label}
              description={screenshot.description}
              testId={screenshot.category}
              isWide={isWide}
              index={index}
              isHovered={hoveredIndex === index}
              hoveredIndex={hoveredIndex}
              onHover={setHoveredIndex}
              totalCount={showcaseScreenshots.length}
            />
          ))}
        </div>
        <Text style={deviceStyles.hoverHint} data-testid="text-hover-hint">
          Hover over a screen to explore
        </Text>
      </View>
    );
  }

  // For native, use horizontal ScrollView
  return (
    <View style={deviceStyles.showcaseSection} data-testid="section-screenshot-showcase">
      <Text style={deviceStyles.showcaseTitle} data-testid="text-showcase-title">
        See ChefSpAIce in Action
      </Text>
      <Text style={deviceStyles.showcaseSubtitle} data-testid="text-showcase-subtitle">
        Experience the app that transforms your kitchen
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          deviceStyles.showcaseScrollContent,
          isWide && deviceStyles.showcaseScrollContentWide,
        ]}
        style={deviceStyles.showcaseScroll}
      >
        {showcaseScreenshots.map((screenshot, index) => (
          <DeviceMockup
            key={index}
            imageUrl={getShowcaseImageUrl(screenshot.category, screenshot.filename)}
            label={screenshot.label}
            description={screenshot.description}
            testId={screenshot.category}
            isWide={isWide}
          />
        ))}
      </ScrollView>
    </View>
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
          <Text
            style={styles.faqQuestion}
            data-testid={`text-faq-question-${testId}`}
          >
            {question}
          </Text>
          <Feather
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="rgba(255,255,255,0.7)"
          />
        </View>
        {isOpen && (
          <Text
            style={styles.faqAnswer}
            data-testid={`text-faq-answer-${testId}`}
          >
            {answer}
          </Text>
        )}
      </GlassCard>
    </Pressable>
  );
}

interface LandingScreenProps {
  onAbout?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onSupport?: () => void;
  onScreenshotGallery?: () => void;
}

export default function LandingScreen({
  onAbout,
  onPrivacy,
  onTerms,
  onSupport,
  onScreenshotGallery,
}: LandingScreenProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const isWide = width > 768;

  // Use safe navigation that doesn't crash when outside NavigationContainer (web)
  const navigation = useSafeNavigation();

  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleDownloadApp = (store: 'ios' | 'android') => {
    const url = store === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open app store:', err);
    });
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
      quote:
        "This app has completely transformed how I manage my kitchen. No more wasted groceries!",
      rating: 5,
    },
    {
      name: "James K.",
      role: "Home Chef",
      quote:
        "The AI recipe suggestions are incredible. It's like having a personal chef in my pocket.",
      rating: 5,
    },
    {
      name: "Emily R.",
      role: "Sustainability Advocate",
      quote:
        "I've reduced my food waste by 70% since using ChefSpAIce. Highly recommend!",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "How does the AI recipe generation work?",
      answer:
        "Our AI analyzes the ingredients in your pantry and generates personalized recipes based on what you have. You can also specify dietary preferences, cooking time, and cuisine type for more tailored suggestions.",
    },
    {
      question: "Is there a free trial available?",
      answer:
        "Yes! We offer a 7-day free trial with full access to all Pro features. No credit card required to start.",
    },
    {
      question: "Can I use the app on multiple devices?",
      answer:
        "Absolutely! Your account syncs across all your devices. Whether you're on your phone at the grocery store or tablet in the kitchen, your inventory stays up to date.",
    },
    {
      question: "How accurate is the expiration tracking?",
      answer:
        "We use AI-powered shelf life estimation combined with product data to give you accurate expiration alerts. You'll receive notifications before items expire so you can plan meals accordingly.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer:
        "Yes, you can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees.",
    },
  ];

  const trustLogos = [
    { name: "App Store", iconType: "material", icon: "apple" },
    { name: "Google Play", iconType: "material", icon: "google-play" },
    { name: "Replit", iconType: "custom", icon: "replit" },
    { name: "GitHub", iconType: "feather", icon: "github" },
  ];

  const ReplitLogo = ({
    size = 24,
    color = "rgba(255,255,255,0.5)",
  }: {
    size?: number;
    color?: string;
  }) => {
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
        colors={
          isDark
            ? ["#0A1F0F", "#0F1419", "#0A0F14"]
            : ["#1A3D2A", "#1E4D35", "#0F2A1A"]
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header} data-testid="header">
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color="rgba(255, 255, 255, 0.5)"
            />
            <Text style={styles.logoText} data-testid="text-logo">
              ChefSpAIce
            </Text>
          </View>
          {onScreenshotGallery && (
            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onScreenshotGallery}
              data-testid="button-screenshot-gallery"
            >
              <Text style={styles.signInButtonText}>Gallery</Text>
            </Pressable>
          )}
        </View>

        <View
          style={[styles.heroSection, isWide && styles.heroSectionWide]}
          data-testid="section-hero"
        >
          <View style={[styles.heroInner, isWide && styles.heroInnerWide]}>
            <View style={[styles.heroContent, isWide && styles.heroContentWide]}>
              <View style={styles.tagline}>
                <MaterialCommunityIcons name="leaf" size={14} color="#FFFFFF" />
                <Text style={styles.taglineText} data-testid="text-tagline">
                  Reduce Food Waste, Save Money
                </Text>
              </View>

              <Text style={styles.heroTitle} data-testid="text-hero-title">
                Your AI-Powered{"\n"}Kitchen Assistant
              </Text>

              <Text style={styles.heroSubtitle} data-testid="text-hero-subtitle">
                Manage your pantry, generate recipes from what you have, plan
                meals, and never let food go to waste again.
              </Text>

              {/*
              <View style={styles.heroButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleGetStarted()}
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
              </View>

              <Text style={styles.trialText}>
                7-day free trial, no credit card required
              </Text>
              */}
            </View>
            
            <View style={[styles.heroDeviceContainer, isWide && styles.heroDeviceContainerWide]}>
              <HeroDeviceMockup isWide={isWide} />
            </View>
          </View>
        </View>

        <ScreenshotShowcase isWide={isWide} />

        <View style={styles.trustSection} data-testid="section-trust">
          <Text style={styles.trustTitle}>Featured On</Text>
          <View style={[styles.trustLogos, isWide && styles.trustLogosWide]}>
            {trustLogos.map((logo, index) => (
              <View key={index} style={styles.trustLogoItem}>
                <View style={styles.trustLogoIconContainer}>
                  {logo.iconType === "material" ? (
                    <MaterialCommunityIcons
                      name={logo.icon as any}
                      size={24}
                      color="rgba(255,255,255,0.5)"
                    />
                  ) : logo.iconType === "custom" && logo.icon === "replit" ? (
                    <ReplitLogo size={24} color="rgba(255,255,255,0.5)" />
                  ) : (
                    <Feather
                      name={logo.icon as any}
                      size={24}
                      color="rgba(255,255,255,0.5)"
                    />
                  )}
                </View>
                <Text style={styles.trustLogoText}>{logo.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} data-testid="section-benefits">
          <Text style={styles.sectionTitle} data-testid="text-benefits-title">
            Why Choose ChefSpAIce?
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-benefits-subtitle"
          >
            Save money, reduce waste, and eat better
          </Text>

          <View
            style={[styles.benefitsGrid, isWide && styles.benefitsGridWide]}
          >
            <BenefitCard
              testId="save-money"
              isWide={isWide}
              icon={
                <Feather
                  name="dollar-sign"
                  size={32}
                  color={AppColors.primary}
                />
              }
              title="Save $200+/month"
              description="Stop throwing away expired food. Our users save an average of $200 per month on groceries."
            />
            <BenefitCard
              testId="reduce-waste"
              isWide={isWide}
              icon={
                <Feather name="trash-2" size={32} color={AppColors.primary} />
              }
              title="Reduce Waste by 70%"
              description="Smart expiration tracking and AI-powered meal planning means less food in the trash."
            />
            <BenefitCard
              testId="eat-better"
              isWide={isWide}
              icon={
                <Feather name="heart" size={32} color={AppColors.primary} />
              }
              title="Eat Healthier"
              description="Personalized recipes based on your dietary preferences and what's actually in your kitchen."
            />
            <BenefitCard
              testId="save-time"
              isWide={isWide}
              icon={
                <Feather name="clock" size={32} color={AppColors.primary} />
              }
              title="Save 5+ Hours/Week"
              description="No more wondering 'what's for dinner?' AI suggests meals in seconds, not hours."
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-how-it-works">
          <Text style={styles.sectionTitle} data-testid="text-howitworks-title">
            How It Works
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-howitworks-subtitle"
          >
            Get started in three simple steps
          </Text>

          <View
            style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}
          >
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
          <Text style={styles.sectionTitle} data-testid="text-features-title">
            Smart Features
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-features-subtitle"
          >
            Everything you need to run an efficient kitchen
          </Text>

          <View
            style={[styles.featuresGrid, isWide && styles.featuresGridWide]}
          >
            <FeatureCard
              testId="barcode"
              isDark={isDark}
              isWide={isWide}
              icon={
                <MaterialCommunityIcons
                  name="barcode-scan"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="Barcode Scanning"
              description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
            />
            <FeatureCard
              testId="ai-recipes"
              isDark={isDark}
              isWide={isWide}
              icon={
                <MaterialCommunityIcons
                  name="creation"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="AI Recipe Generation"
              description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
            />
            <FeatureCard
              testId="expiration"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather name="clock" size={28} color={AppColors.primary} />
              }
              title="Expiration Tracking"
              description="Never forget about food again. Get notifications before items expire."
            />
            <FeatureCard
              testId="meal-planning"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather name="calendar" size={28} color={AppColors.primary} />
              }
              title="Meal Planning"
              description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
            />
            <FeatureCard
              testId="shopping"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather
                  name="shopping-cart"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="Smart Shopping Lists"
              description="Auto-generate shopping lists from recipes. Check off items as you shop."
            />
            <FeatureCard
              testId="analytics"
              isDark={isDark}
              isWide={isWide}
              icon={
                <Feather
                  name="bar-chart-2"
                  size={28}
                  color={AppColors.primary}
                />
              }
              title="Waste Analytics"
              description="Track your food waste and savings over time. See your environmental impact."
            />
          </View>
        </View>

        <View style={styles.section} data-testid="section-pricing">
          <Text style={styles.sectionTitle} data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-pricing-subtitle"
          >
            Choose the plan that works best for you
          </Text>

          <View style={styles.billingToggleContainer}>
            <Pressable
              style={styles.billingToggle}
              onPress={() => setIsAnnual(!isAnnual)}
              data-testid="toggle-billing-period"
            >
              <View
                style={[
                  styles.billingOption,
                  !isAnnual && styles.billingOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    !isAnnual && styles.billingOptionTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </View>
              <View
                style={[
                  styles.billingOption,
                  isAnnual && styles.billingOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.billingOptionText,
                    isAnnual && styles.billingOptionTextActive,
                  ]}
                >
                  Annually
                </Text>
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
                "5 AI generated recipes per month",
                "Basic storage areas",
                "5 cookware items",
                "Item scanning",
                "Daily meal planning",
              ]}
              buttonText="Download App"
              onPress={() => {}}
              testId="basic"
              isWide={isWide}
              showDownloadButtons={true}
              onDownloadiOS={() => handleDownloadApp('ios')}
              onDownloadAndroid={() => handleDownloadApp('android')}
            />
            <PricingCard
              tier="Pro"
              price={isAnnual ? "$99.90" : "$9.99"}
              period={isAnnual ? "year" : "month"}
              description="Best for home cooks"
              features={[
                "Unlimited pantry items",
                "Unlimited AI generated recipes",
                "Recipe & Bulk Scanning",
                "Customizable storage areas",
                "Live AI Kitchen Assistant",
                "Weekly meal prepping",
              ]}
              isPopular={true}
              buttonText="Download App"
              onPress={() => {}}
              testId="pro"
              isWide={isWide}
              showDownloadButtons={true}
              onDownloadiOS={() => handleDownloadApp('ios')}
              onDownloadAndroid={() => handleDownloadApp('android')}
            />
          </View>
        </View>

        {/*<View style={styles.section} data-testid="section-testimonials">
          <Text
            style={styles.sectionTitle}
            data-testid="text-testimonials-title"
          >
            Loved by Thousands
          </Text>
          <Text
            style={styles.sectionSubtitle}
            data-testid="text-testimonials-subtitle"
          >
            See what our users are saying
          </Text>

          <View
            style={[
              styles.testimonialsGrid,
              isWide && styles.testimonialsGridWide,
            ]}
          >
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                {...testimonial}
                testId={`${index + 1}`}
                isWide={isWide}
              />
            ))}
          </View>
        </View>*/}

        <View style={styles.section} data-testid="section-faq">
          <Text style={styles.sectionTitle} data-testid="text-faq-title">
            Frequently Asked Questions
          </Text>
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
          </GlassCard>
        </View>

        <View style={styles.footer} data-testid="footer">
          <View style={styles.footerContent}>
            <View style={styles.footerLogo}>
              <MaterialCommunityIcons
                name="chef-hat"
                size={24}
                color={AppColors.primary}
              />
              <Text style={styles.footerLogoText}>ChefSpAIce</Text>
            </View>
            <Text style={styles.footerText}>
              Your AI-powered kitchen companion
            </Text>

            <View style={styles.qrCodeSection} data-testid="qr-code-section">
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value="https://chefspaice.com"
                  size={280}
                  color="#FFFFFF"
                  backgroundColor="transparent"
                />
              </View>
              <Text style={styles.qrCodeLabel} data-testid="text-qr-label">
                Scan to share with a friend
              </Text>
            </View>

            <View
              style={[styles.footerLinks, isWide ? {} : styles.footerLinksWrap]}
            >
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
            <Text style={styles.copyright}>
              &copy; 2025 ChefSpAIce. All rights reserved.
            </Text>
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingVertical: 40,
  },
  heroInner: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: 1200,
    gap: 32,
  },
  heroInnerWide: {
    flexDirection: "column",
    alignItems: "center",
    gap: 40,
  },
  heroContent: {
    alignItems: "center",
    maxWidth: 600,
  },
  heroContentWide: {
    alignItems: "center",
  },
  heroTitleWide: {
    textAlign: "center",
  },
  heroDeviceContainer: {
    marginTop: 8,
  },
  heroDeviceContainerWide: {
    marginTop: 16,
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    paddingVertical: 24,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontWeight: "700",
  },
  pricingTier: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  pricingButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
  },
  downloadButtonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  downloadLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  downloadButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: GlassEffect.borderRadius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
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
    paddingVertical: 24,
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
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  ctaNote: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 16,
  },
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 24,
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 24,
  },
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrCodeLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
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

const deviceStyles = StyleSheet.create({
  showcaseSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  showcaseTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 12,
  },
  showcaseSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 500,
  },
  showcaseScroll: {
    width: "100%",
  },
  showcaseScrollContent: {
    paddingHorizontal: 16,
    gap: 24,
    justifyContent: "flex-start",
  },
  showcaseScrollContentWide: {
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  mockupContainer: {
    alignItems: "center",
    gap: 12,
  },
  phoneFrame: {
    backgroundColor: "#1a1a1a",
    borderWidth: 3,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.5,
          shadowRadius: 25,
          elevation: 25,
        }),
  },
  notch: {
    backgroundColor: "#1a1a1a",
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  screen: {
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  homeIndicator: {
    position: "absolute",
    bottom: 8,
    width: 100,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
  },
  mockupLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 4,
  },
  mockupDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  hoverHint: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});
