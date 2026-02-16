import React, { memo, useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  NutritionFacts,
  DAILY_VALUES,
  calculateDailyValuePercent,
  scaleNutrition,
  DailyValueNutrient,
} from "@shared/schema";

interface NutritionLabelProps {
  nutrition: NutritionFacts;
  quantity?: number;
  unit?: string;
  compact?: boolean;
  style?: ViewStyle;
}

interface NutrientRowProps {
  label: string;
  value: number | undefined;
  unit: string;
  dailyValueKey?: DailyValueNutrient;
  bold?: boolean;
  indent?: boolean;
  isSubNutrient?: boolean;
  textColor: string;
}

const NutrientRow = memo(function NutrientRow({
  label,
  value,
  unit,
  dailyValueKey,
  bold = false,
  indent = false,
  isSubNutrient = false,
  textColor,
}: NutrientRowProps) {
  if (value === undefined) return null;

  const percentDV = dailyValueKey
    ? calculateDailyValuePercent(value, dailyValueKey)
    : null;

  const accessibilityLabel = `${label}: ${formatValue(value)}${unit}${
    percentDV !== null && DAILY_VALUES[dailyValueKey!] > 0
      ? `, ${percentDV} percent daily value`
      : ""
  }`;

  return (
    <View
      style={[styles.nutrientRow, indent ? styles.indentedRow : null]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      <View style={styles.nutrientLeft}>
        <ThemedText
          style={[
            styles.nutrientLabel,
            bold ? styles.boldText : null,
            isSubNutrient ? styles.subNutrientLabel : null,
            { color: textColor },
          ]}
        >
          {label}
        </ThemedText>
        <ThemedText
          style={[
            styles.nutrientValue,
            bold ? styles.boldText : null,
            { color: textColor },
          ]}
        >
          {" "}
          {formatValue(value)}
          {unit}
        </ThemedText>
      </View>
      {percentDV !== null && DAILY_VALUES[dailyValueKey!] > 0 ? (
        <ThemedText
          style={[
            styles.percentDV,
            bold ? styles.boldText : null,
            { color: textColor },
          ]}
        >
          {percentDV}%
        </ThemedText>
      ) : null}
    </View>
  );
});

function formatValue(value: number): string {
  if (value === 0) return "0";
  if (value < 1) return value.toFixed(1);
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toString();
}

export const NutritionLabel = memo(function NutritionLabel({
  nutrition,
  quantity = 1,
  unit,
  compact = false,
  style,
}: NutritionLabelProps) {
  const { style: themeStyle } = useTheme();

  const textColor = themeStyle.nutritionLabel.text;
  const borderColor = themeStyle.nutritionLabel.border;
  const backgroundColor = themeStyle.nutritionLabel.background;

  const scaled = useMemo(
    () => (quantity !== 1 ? scaleNutrition(nutrition, quantity) : nutrition),
    [nutrition, quantity],
  );

  if (compact) {
    return (
      <View
        style={[styles.compactContainer, style]}
        accessible={true}
        accessibilityLabel={`Nutrition summary: ${Math.round(scaled.calories)} calories, ${formatValue(scaled.protein)} grams protein${
          scaled.totalCarbohydrates > 0
            ? `, ${formatValue(scaled.totalCarbohydrates)} grams carbs`
            : ""
        }`}
        accessibilityRole="text"
      >
        <ThemedText style={styles.compactText}>
          {Math.round(scaled.calories)} cal
        </ThemedText>
        <ThemedText style={styles.compactDivider}> | </ThemedText>
        <ThemedText style={styles.compactText}>
          {formatValue(scaled.protein)}g protein
        </ThemedText>
        {scaled.totalCarbohydrates > 0 ? (
          <>
            <ThemedText style={styles.compactDivider}> | </ThemedText>
            <ThemedText style={styles.compactText}>
              {formatValue(scaled.totalCarbohydrates)}g carbs
            </ThemedText>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor, borderColor }, style]}
      accessible={true}
      accessibilityLabel="Nutrition Facts Label"
      accessibilityRole="summary"
    >
      <ThemedText
        style={[styles.title, { color: textColor }]}
        accessibilityRole="header"
      >
        Nutrition Facts
      </ThemedText>

      <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />

      <View style={styles.servingSection}>
        <View style={styles.servingRow}>
          <ThemedText
            style={[styles.servingLabel, { color: textColor }]}
            accessible={true}
            accessibilityLabel={`Serving size: ${scaled.servingSize}${unit ? ` (${unit})` : ""}`}
          >
            Serving size
          </ThemedText>
          <ThemedText style={[styles.servingValue, { color: textColor }]}>
            {scaled.servingSize}
            {unit ? ` (${unit})` : ""}
          </ThemedText>
        </View>
        {scaled.servingsPerContainer ? (
          <ThemedText
            style={[styles.servingsPerContainer, { color: textColor }]}
            accessible={true}
            accessibilityLabel={`${scaled.servingsPerContainer} servings per container`}
          >
            {scaled.servingsPerContainer} servings per container
          </ThemedText>
        ) : null}
      </View>

      <View style={[styles.thickDivider, { backgroundColor: borderColor }]} />

      <View
        style={styles.caloriesSection}
        accessible={true}
        accessibilityLabel={`Calories: ${Math.round(scaled.calories)}`}
      >
        <ThemedText style={[styles.caloriesLabel, { color: textColor }]}>
          Calories
        </ThemedText>
        <ThemedText style={[styles.caloriesValue, { color: textColor }]}>
          {Math.round(scaled.calories)}
        </ThemedText>
      </View>

      <View style={[styles.mediumDivider, { backgroundColor: borderColor }]} />

      <View style={styles.dvHeader}>
        <ThemedText style={[styles.dvHeaderText, { color: textColor }]}>
          % Daily Value*
        </ThemedText>
      </View>

      <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />

      <NutrientRow
        label="Total Fat"
        value={scaled.totalFat}
        unit="g"
        dailyValueKey="totalFat"
        bold
        textColor={textColor}
      />
      <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />

      <NutrientRow
        label="Saturated Fat"
        value={scaled.saturatedFat}
        unit="g"
        dailyValueKey="saturatedFat"
        indent
        isSubNutrient
        textColor={textColor}
      />
      {scaled.saturatedFat !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Trans Fat"
        value={scaled.transFat}
        unit="g"
        indent
        isSubNutrient
        textColor={textColor}
      />
      {scaled.transFat !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Cholesterol"
        value={scaled.cholesterol}
        unit="mg"
        dailyValueKey="cholesterol"
        bold
        textColor={textColor}
      />
      {scaled.cholesterol !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Sodium"
        value={scaled.sodium}
        unit="mg"
        dailyValueKey="sodium"
        bold
        textColor={textColor}
      />
      <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />

      <NutrientRow
        label="Total Carbohydrate"
        value={scaled.totalCarbohydrates}
        unit="g"
        dailyValueKey="totalCarbohydrates"
        bold
        textColor={textColor}
      />
      <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />

      <NutrientRow
        label="Dietary Fiber"
        value={scaled.dietaryFiber}
        unit="g"
        dailyValueKey="dietaryFiber"
        indent
        isSubNutrient
        textColor={textColor}
      />
      {scaled.dietaryFiber !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Total Sugars"
        value={scaled.totalSugars}
        unit="g"
        indent
        isSubNutrient
        textColor={textColor}
      />
      {scaled.totalSugars !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      {scaled.addedSugars !== undefined ? (
        <>
          <NutrientRow
            label="Includes Added Sugars"
            value={scaled.addedSugars}
            unit="g"
            dailyValueKey="addedSugars"
            indent
            isSubNutrient
            textColor={textColor}
          />
          <View
            style={[styles.thinDivider, { backgroundColor: borderColor }]}
          />
        </>
      ) : null}

      <NutrientRow
        label="Protein"
        value={scaled.protein}
        unit="g"
        dailyValueKey="protein"
        bold
        textColor={textColor}
      />

      <View style={[styles.thickDivider, { backgroundColor: borderColor }]} />

      <NutrientRow
        label="Vitamin D"
        value={scaled.vitaminD}
        unit="mcg"
        dailyValueKey="vitaminD"
        textColor={textColor}
      />
      {scaled.vitaminD !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Calcium"
        value={scaled.calcium}
        unit="mg"
        dailyValueKey="calcium"
        textColor={textColor}
      />
      {scaled.calcium !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Iron"
        value={scaled.iron}
        unit="mg"
        dailyValueKey="iron"
        textColor={textColor}
      />
      {scaled.iron !== undefined ? (
        <View style={[styles.thinDivider, { backgroundColor: borderColor }]} />
      ) : null}

      <NutrientRow
        label="Potassium"
        value={scaled.potassium}
        unit="mg"
        dailyValueKey="potassium"
        textColor={textColor}
      />

      <View style={[styles.mediumDivider, { backgroundColor: borderColor }]} />

      <ThemedText
        style={[styles.footer, { color: textColor }]}
        accessible={true}
        accessibilityLabel="The percent Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice."
      >
        * The % Daily Value (DV) tells you how much a nutrient in a serving of
        food contributes to a daily diet. 2,000 calories a day is used for
        general nutrition advice.
      </ThemedText>
      <ThemedText
        style={[styles.disclaimer, { color: textColor }]}
        accessible={true}
        accessibilityLabel="Nutrition data is for informational purposes only and should not be considered medical or dietary advice."
      >
        Nutrition data is for informational purposes only and should not be
        considered medical or dietary advice.
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    padding: Spacing.md,
    borderRadius: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  thinDivider: {
    height: 1,
    marginVertical: 2,
  },
  mediumDivider: {
    height: 4,
    marginVertical: Spacing.xs,
  },
  thickDivider: {
    height: 8,
    marginVertical: Spacing.xs,
  },
  servingSection: {
    marginVertical: Spacing.xs,
  },
  servingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  servingLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  servingValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  servingsPerContainer: {
    fontSize: 12,
    marginTop: 2,
  },
  caloriesSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: Spacing.xs,
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: "800",
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  dvHeader: {
    alignItems: "flex-end",
    marginVertical: 2,
  },
  dvHeaderText: {
    fontSize: 11,
    fontWeight: "700",
  },
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  indentedRow: {
    paddingLeft: Spacing.lg,
  },
  nutrientLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  nutrientLabel: {
    fontSize: 14,
  },
  subNutrientLabel: {
    fontWeight: "400",
  },
  nutrientValue: {
    fontSize: 14,
  },
  boldText: {
    fontWeight: "700",
  },
  percentDV: {
    fontSize: 14,
    minWidth: 40,
    textAlign: "right",
  },
  footer: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: Spacing.xs,
  },
  disclaimer: {
    fontSize: 9,
    lineHeight: 12,
    marginTop: Spacing.sm,
    fontStyle: "italic",
    opacity: 0.7,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  compactText: {
    fontSize: 13,
  },
  compactDivider: {
    fontSize: 13,
    opacity: 0.5,
  },
});
