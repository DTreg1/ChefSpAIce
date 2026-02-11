import { StyleSheet, View, Text, Pressable } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { Feather } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  testId: string;
}

export function FAQItem({ question, answer, isOpen, onToggle, testId }: FAQItemProps) {
  return (
    <Pressable onPress={onToggle} {...webAccessibilityProps(onToggle)} data-testid={`faq-item-${testId}`} accessibilityRole="button" accessibilityLabel={`${question}, ${isOpen ? 'collapse' : 'expand'} answer`} accessibilityState={{ expanded: isOpen }}>
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
            color="rgba(255, 255, 255, 0.85)"
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

const styles = StyleSheet.create({
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
    color: "rgba(255, 255, 255, 0.95)",
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 22,
    marginTop: 16,
  },
});
