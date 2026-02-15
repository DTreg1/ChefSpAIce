import { StyleSheet, View, Text } from "react-native";
import { useState } from "react";
import { FAQItem } from "./FAQItem";
import { faqs } from "@/data/landing-data";
import { sharedStyles, getLandingTextStyles } from "./shared-styles";
import { useTheme } from "@/hooks/useTheme";

export function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const { isDark } = useTheme();
  const textStyles = getLandingTextStyles(isDark);

  return (
    <View style={sharedStyles.section} data-testid="section-faq">
      <Text style={textStyles.sectionTitle} data-testid="text-faq-title">
        Frequently Asked Questions
      </Text>
      <Text style={textStyles.sectionSubtitle} data-testid="text-faq-subtitle">
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
  );
}

const styles = StyleSheet.create({
  faqContainer: {
    width: "100%",
    maxWidth: 700,
    gap: 12,
  },
});
