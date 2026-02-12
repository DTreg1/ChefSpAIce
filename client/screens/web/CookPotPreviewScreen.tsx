import React from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { CookPotLoader } from "@/components/CookPotLoader";

export default function CookPotPreviewScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>CookPot Loader Preview</Text>
      <Text style={styles.subtitle}>Original restored from git history</Text>

      <View style={styles.row}>
        <View style={styles.item}>
          <CookPotLoader size="xs" text="XS" />
        </View>
        <View style={styles.item}>
          <CookPotLoader size="sm" text="SM" />
        </View>
        <View style={styles.item}>
          <CookPotLoader size="md" text="MD" />
        </View>
        <View style={styles.item}>
          <CookPotLoader size="lg" text="LG" />
        </View>
        <View style={styles.item}>
          <CookPotLoader size="xl" text="XL" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default (Primary)</Text>
        <CookPotLoader size="lg" text="Prepping the Kitchen" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#1a2e05",
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: "100%",
    gap: 32,
  },
  title: {
    color: "#a3e635",
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#84cc16",
    fontSize: 14,
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 32,
  },
  item: {
    alignItems: "center",
  },
  section: {
    alignItems: "center",
    gap: 16,
  },
  sectionTitle: {
    color: "#a3e635",
    fontSize: 18,
    fontWeight: "600",
  },
});
