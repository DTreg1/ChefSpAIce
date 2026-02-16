import React, { useMemo } from "react";
import { Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export interface CookingTerm {
  id: number;
  term: string;
  definition: string;
  category: string;
  difficulty?: string;
  pronunciation?: string;
  videoUrl?: string;
  relatedTerms?: string[];
}

interface TermHighlighterProps {
  text: string;
  onTermPress: (term: CookingTerm) => void;
}

type TextSegment =
  | { type: "text"; content: string }
  | { type: "term"; content: string; term: CookingTerm };

export function TermHighlighter({ text, onTermPress }: TermHighlighterProps) {
  const { theme } = useTheme();

  const { data: terms } = useQuery<CookingTerm[]>({
    queryKey: ["/api/cooking-terms"],
    staleTime: Infinity,
  });

  const termMap = useMemo(() => {
    if (!terms || terms.length === 0) return new Map<string, CookingTerm>();
    const map = new Map<string, CookingTerm>();
    terms.forEach((t) => {
      map.set(t.term.toLowerCase(), t);
    });
    return map;
  }, [terms]);

  const termPattern = useMemo(() => {
    if (!terms || terms.length === 0) return null;

    const escapedTerms = terms
      .map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);

    return new RegExp(`\\b(${escapedTerms.join("|")})\\b`, "gi");
  }, [terms]);

  const segments = useMemo((): TextSegment[] => {
    if (!termPattern || !terms || terms.length === 0) {
      return [{ type: "text", content: text }];
    }

    const result: TextSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    termPattern.lastIndex = 0;

    while ((match = termPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      const matchedText = match[0];
      const termData = termMap.get(matchedText.toLowerCase());

      if (termData) {
        result.push({
          type: "term",
          content: matchedText,
          term: termData,
        });
      } else {
        result.push({
          type: "text",
          content: matchedText,
        });
      }

      lastIndex = termPattern.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [text, termPattern, termMap, terms]);

  if (!terms || terms.length === 0) {
    return <Text style={[styles.text, { color: theme.text }]}>{text}</Text>;
  }

  return (
    <Text style={styles.text}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <Text key={index} style={{ color: theme.text }}>
              {segment.content}
            </Text>
          );
        }

        return (
          <Text
            key={index}
            style={[styles.term, { color: theme.primary }]}
            onPress={() => onTermPress(segment.term)}
          >
            {segment.content}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
  },
  term: {
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
  },
});
