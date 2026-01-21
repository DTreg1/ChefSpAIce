import { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { GlassColors, AppColors } from "@/constants/theme";

const isWeb = Platform.OS === "web";

interface DemoFoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  expirationDate: string;
  category: string;
  daysUntilExpiry: number;
}

interface DemoRecipe {
  id: string;
  title: string;
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  prepTime: number;
  cookTime: number;
  servings: number;
  cuisine: string;
}

const SAMPLE_FOOD_ITEMS: DemoFoodItem[] = [
  { id: "1", name: "Chicken Breast", quantity: 2, unit: "lbs", storageLocation: "fridge", expirationDate: "2026-01-23", category: "Protein", daysUntilExpiry: 2 },
  { id: "2", name: "Spinach", quantity: 1, unit: "bag", storageLocation: "fridge", expirationDate: "2026-01-24", category: "Vegetables", daysUntilExpiry: 3 },
  { id: "3", name: "Eggs", quantity: 12, unit: "count", storageLocation: "fridge", expirationDate: "2026-02-05", category: "Dairy", daysUntilExpiry: 15 },
  { id: "4", name: "Rice", quantity: 2, unit: "lbs", storageLocation: "pantry", expirationDate: "2027-01-01", category: "Grains", daysUntilExpiry: 345 },
  { id: "5", name: "Olive Oil", quantity: 1, unit: "bottle", storageLocation: "pantry", expirationDate: "2027-06-01", category: "Oils", daysUntilExpiry: 496 },
  { id: "6", name: "Garlic", quantity: 3, unit: "cloves", storageLocation: "counter", expirationDate: "2026-02-10", category: "Vegetables", daysUntilExpiry: 20 },
  { id: "7", name: "Lemon", quantity: 2, unit: "count", storageLocation: "fridge", expirationDate: "2026-01-28", category: "Fruits", daysUntilExpiry: 7 },
  { id: "8", name: "Parmesan", quantity: 0.5, unit: "lb", storageLocation: "fridge", expirationDate: "2026-02-15", category: "Dairy", daysUntilExpiry: 25 },
  { id: "9", name: "Butter", quantity: 1, unit: "stick", storageLocation: "fridge", expirationDate: "2026-03-01", category: "Dairy", daysUntilExpiry: 39 },
  { id: "10", name: "Pasta", quantity: 1, unit: "box", storageLocation: "pantry", expirationDate: "2027-03-01", category: "Grains", daysUntilExpiry: 404 },
];

const SAMPLE_RECIPES: DemoRecipe[] = [
  {
    id: "r1",
    title: "Garlic Lemon Chicken",
    description: "Tender chicken breast with a zesty lemon garlic sauce - perfect for using your expiring chicken!",
    ingredients: [
      { name: "Chicken Breast", quantity: 2, unit: "lbs" },
      { name: "Lemon", quantity: 1, unit: "count" },
      { name: "Garlic", quantity: 3, unit: "cloves" },
      { name: "Olive Oil", quantity: 2, unit: "tbsp" },
      { name: "Butter", quantity: 1, unit: "tbsp" },
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    cuisine: "Mediterranean",
  },
  {
    id: "r2",
    title: "Spinach Parmesan Pasta",
    description: "Creamy pasta with fresh spinach and parmesan - uses your spinach before it wilts!",
    ingredients: [
      { name: "Pasta", quantity: 0.5, unit: "box" },
      { name: "Spinach", quantity: 1, unit: "bag" },
      { name: "Parmesan", quantity: 0.25, unit: "lb" },
      { name: "Garlic", quantity: 2, unit: "cloves" },
      { name: "Olive Oil", quantity: 2, unit: "tbsp" },
    ],
    prepTime: 5,
    cookTime: 15,
    servings: 3,
    cuisine: "Italian",
  },
];

function GlassCard({ children, style, testId }: { children: React.ReactNode; style?: any; testId?: string }) {
  const { isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  return (
    <View
      style={[
        styles.glassCard,
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

function ExpiryBadge({ days }: { days: number }) {
  let bgColor = "#9ca3af";
  let textColor = "#ffffff";
  let label = `${days}d`;

  if (days <= 2) {
    bgColor = "#ef4444";
    label = days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d`;
  } else if (days <= 5) {
    bgColor = "#f97316";
  } else if (days <= 7) {
    bgColor = "#eab308";
    textColor = "#1a1a1a";
  }

  return (
    <View style={[styles.expiryBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.expiryBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function FoodItemCard({ item, onSelect, isSelected }: { item: DemoFoodItem; onSelect: (id: string) => void; isSelected: boolean }) {
  const storageIcons: Record<string, string> = {
    fridge: "thermometer",
    freezer: "snowflake",
    pantry: "archive",
    counter: "coffee",
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.foodItemCard,
        isSelected && styles.foodItemCardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onSelect(item.id)}
      data-testid={`card-food-${item.id}`}
    >
      <View style={styles.foodItemHeader}>
        <View style={styles.foodItemInfo}>
          <Text style={styles.foodItemName} data-testid={`text-food-name-${item.id}`}>{item.name}</Text>
          <Text style={styles.foodItemQuantity}>{item.quantity} {item.unit}</Text>
        </View>
        <ExpiryBadge days={item.daysUntilExpiry} />
      </View>
      <View style={styles.foodItemMeta}>
        <View style={styles.storageTag}>
          <Feather name={storageIcons[item.storageLocation] as any || "box"} size={12} color="rgba(255,255,255,0.6)" />
          <Text style={styles.storageTagText}>{item.storageLocation}</Text>
        </View>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Feather name="check-circle" size={16} color={AppColors.primary} />
        </View>
      )}
    </Pressable>
  );
}

function RecipeCard({ recipe, onView }: { recipe: DemoRecipe; onView: (id: string) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.recipeCard, pressed && styles.cardPressed]}
      onPress={() => onView(recipe.id)}
      data-testid={`card-recipe-${recipe.id}`}
    >
      <View style={styles.recipeBadge}>
        <MaterialCommunityIcons name="creation" size={14} color="#ffffff" />
        <Text style={styles.recipeBadgeText}>AI Generated</Text>
      </View>
      <Text style={styles.recipeTitle} data-testid={`text-recipe-title-${recipe.id}`}>{recipe.title}</Text>
      <Text style={styles.recipeDescription}>{recipe.description}</Text>
      <View style={styles.recipeMeta}>
        <View style={styles.recipeMetaItem}>
          <Feather name="clock" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.recipeMetaText}>{recipe.prepTime + recipe.cookTime} min</Text>
        </View>
        <View style={styles.recipeMetaItem}>
          <Feather name="users" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.recipeMetaText}>{recipe.servings} servings</Text>
        </View>
        <View style={styles.cuisineTag}>
          <Text style={styles.cuisineTagText}>{recipe.cuisine}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RecipeDetailModal({ recipe, onClose }: { recipe: DemoRecipe; onClose: () => void }) {
  return (
    <View style={styles.modalOverlay}>
      <GlassCard style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{recipe.title}</Text>
          <Pressable onPress={onClose} style={styles.closeButton} data-testid="button-close-recipe">
            <Feather name="x" size={24} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
        <Text style={styles.modalDescription}>{recipe.description}</Text>
        
        <View style={styles.recipeTimings}>
          <View style={styles.timingItem}>
            <Feather name="clock" size={20} color={AppColors.primary} />
            <Text style={styles.timingLabel}>Prep</Text>
            <Text style={styles.timingValue}>{recipe.prepTime} min</Text>
          </View>
          <View style={styles.timingItem}>
            <MaterialCommunityIcons name="pot-steam" size={20} color={AppColors.primary} />
            <Text style={styles.timingLabel}>Cook</Text>
            <Text style={styles.timingValue}>{recipe.cookTime} min</Text>
          </View>
          <View style={styles.timingItem}>
            <Feather name="users" size={20} color={AppColors.primary} />
            <Text style={styles.timingLabel}>Serves</Text>
            <Text style={styles.timingValue}>{recipe.servings}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Ingredients</Text>
        <View style={styles.ingredientsList}>
          {recipe.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Feather name="check" size={14} color={AppColors.primary} />
              <Text style={styles.ingredientText}>{ing.quantity} {ing.unit} {ing.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.signupPrompt}>
          <MaterialCommunityIcons name="lock" size={20} color={AppColors.primary} />
          <Text style={styles.signupPromptText}>Sign up to see full instructions and save recipes!</Text>
        </View>
      </GlassCard>
    </View>
  );
}

interface DemoScreenProps {
  onSignUp?: () => void;
  onBack?: () => void;
}

export default function DemoScreen({ onSignUp, onBack }: DemoScreenProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const isWide = width >= 768;

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [generatedRecipes, setGeneratedRecipes] = useState<DemoRecipe[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<DemoRecipe | null>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "recipes">("inventory");

  const expiringItems = useMemo(() => 
    SAMPLE_FOOD_ITEMS.filter(item => item.daysUntilExpiry <= 7).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
    []
  );

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateRecipes = () => {
    if (selectedItems.length === 0) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      const matchingRecipes = SAMPLE_RECIPES.filter(recipe =>
        recipe.ingredients.some(ing =>
          selectedItems.some(id => {
            const item = SAMPLE_FOOD_ITEMS.find(f => f.id === id);
            return item && ing.name.toLowerCase().includes(item.name.toLowerCase());
          })
        )
      );
      setGeneratedRecipes(matchingRecipes.length > 0 ? matchingRecipes : SAMPLE_RECIPES);
      setActiveTab("recipes");
      setIsGenerating(false);
    }, 1500);
  };

  const handleQuickGenerate = () => {
    const expiringIds = expiringItems.slice(0, 3).map(i => i.id);
    setSelectedItems(expiringIds);
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedRecipes(SAMPLE_RECIPES);
      setActiveTab("recipes");
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0A1F0F", "#0F1419", "#0A0F14"] : ["#1A3D2A", "#1E4D35", "#0F2A1A"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton} data-testid="button-back">
            <Feather name="arrow-left" size={24} color="rgba(255,255,255,0.8)" />
          </Pressable>
        )}
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="chef-hat" size={28} color="rgba(255, 255, 255, 0.5)" />
          <Text style={styles.headerTitle}>ChefSpAIce Demo</Text>
        </View>
        {onSignUp && (
          <Pressable 
            onPress={onSignUp} 
            style={({ pressed }) => [styles.signUpButton, pressed && styles.cardPressed]}
            data-testid="button-signup-header"
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.demoBanner}>
        <Feather name="info" size={16} color={AppColors.primary} />
        <Text style={styles.demoBannerText}>
          This is a demo with sample data. Sign up to add your own items and get personalized recipes!
        </Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable 
          style={[styles.tab, activeTab === "inventory" && styles.tabActive]}
          onPress={() => setActiveTab("inventory")}
          data-testid="tab-inventory"
        >
          <Feather name="package" size={18} color={activeTab === "inventory" ? AppColors.primary : "rgba(255,255,255,0.6)"} />
          <Text style={[styles.tabText, activeTab === "inventory" && styles.tabTextActive]}>Inventory</Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, activeTab === "recipes" && styles.tabActive]}
          onPress={() => setActiveTab("recipes")}
          data-testid="tab-recipes"
        >
          <MaterialCommunityIcons name="food-variant" size={18} color={activeTab === "recipes" ? AppColors.primary : "rgba(255,255,255,0.6)"} />
          <Text style={[styles.tabText, activeTab === "recipes" && styles.tabTextActive]}>Recipes</Text>
          {generatedRecipes.length > 0 && (
            <View style={styles.recipeBadgeCount}>
              <Text style={styles.recipeBadgeCountText}>{generatedRecipes.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === "inventory" ? (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Expiring Soon</Text>
                <Pressable 
                  style={({ pressed }) => [styles.quickActionButton, pressed && styles.cardPressed]}
                  onPress={handleQuickGenerate}
                  data-testid="button-quick-generate"
                >
                  <MaterialCommunityIcons name="creation" size={16} color="#ffffff" />
                  <Text style={styles.quickActionText}>Use These First</Text>
                </Pressable>
              </View>
              <View style={[styles.itemsGrid, isWide && styles.itemsGridWide]}>
                {expiringItems.map(item => (
                  <FoodItemCard 
                    key={item.id} 
                    item={item} 
                    onSelect={handleSelectItem}
                    isSelected={selectedItems.includes(item.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Inventory</Text>
              <View style={[styles.itemsGrid, isWide && styles.itemsGridWide]}>
                {SAMPLE_FOOD_ITEMS.filter(i => i.daysUntilExpiry > 7).map(item => (
                  <FoodItemCard 
                    key={item.id} 
                    item={item} 
                    onSelect={handleSelectItem}
                    isSelected={selectedItems.includes(item.id)}
                  />
                ))}
              </View>
            </View>

            {selectedItems.length > 0 && (
              <View style={styles.floatingAction}>
                <Pressable 
                  style={({ pressed }) => [styles.generateButton, pressed && styles.cardPressed, isGenerating && styles.buttonDisabled]}
                  onPress={handleGenerateRecipes}
                  disabled={isGenerating}
                  data-testid="button-generate-recipes"
                >
                  <LinearGradient
                    colors={[AppColors.primary, "#1E8449"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.generateButtonGradient}
                  >
                    {isGenerating ? (
                      <>
                        <MaterialCommunityIcons name="loading" size={20} color="#ffffff" />
                        <Text style={styles.generateButtonText}>Generating...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="creation" size={20} color="#ffffff" />
                        <Text style={styles.generateButtonText}>Generate Recipes ({selectedItems.length} items)</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            <View style={styles.addItemPrompt}>
              <View style={styles.lockedFeature}>
                <MaterialCommunityIcons name="lock" size={24} color="rgba(255,255,255,0.4)" />
                <Text style={styles.lockedFeatureText}>Add your own items</Text>
              </View>
              <Pressable 
                onPress={onSignUp} 
                style={({ pressed }) => [styles.unlockButton, pressed && styles.cardPressed]}
                data-testid="button-unlock-add"
              >
                <Text style={styles.unlockButtonText}>Sign Up to Unlock</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {generatedRecipes.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>AI-Generated Recipes</Text>
                  <Text style={styles.sectionSubtitle}>Based on your selected ingredients</Text>
                </View>
                <View style={[styles.recipesGrid, isWide && styles.recipesGridWide]}>
                  {generatedRecipes.map(recipe => (
                    <RecipeCard 
                      key={recipe.id} 
                      recipe={recipe} 
                      onView={(id) => setViewingRecipe(generatedRecipes.find(r => r.id === id) || null)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="food-variant" size={64} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateTitle}>No Recipes Yet</Text>
                <Text style={styles.emptyStateText}>Select ingredients from your inventory and tap "Generate Recipes" to get AI-powered recipe suggestions!</Text>
                <Pressable 
                  style={({ pressed }) => [styles.goToInventoryButton, pressed && styles.cardPressed]}
                  onPress={() => setActiveTab("inventory")}
                  data-testid="button-go-inventory"
                >
                  <Text style={styles.goToInventoryText}>Go to Inventory</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.moreRecipesPrompt}>
              <View style={styles.lockedFeature}>
                <MaterialCommunityIcons name="lock" size={24} color="rgba(255,255,255,0.4)" />
                <Text style={styles.lockedFeatureText}>Unlimited AI recipes</Text>
              </View>
              <Pressable 
                onPress={onSignUp} 
                style={({ pressed }) => [styles.unlockButton, pressed && styles.cardPressed]}
                data-testid="button-unlock-recipes"
              >
                <Text style={styles.unlockButtonText}>Sign Up for Full Access</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {viewingRecipe && (
        <RecipeDetailModal recipe={viewingRecipe} onClose={() => setViewingRecipe(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glassCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    ...(isWeb ? { backdropFilter: "blur(10px)" } : {}),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 24,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  signUpButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signUpButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(94, 140, 58, 0.15)",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(94, 140, 58, 0.3)",
  },
  demoBannerText: {
    flex: 1,
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  tabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    color: AppColors.primary,
  },
  recipeBadgeCount: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  recipeBadgeCountText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: -8,
    marginBottom: 8,
    width: "100%",
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  itemsGrid: {
    gap: 12,
  },
  itemsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  foodItemCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    ...(isWeb ? { minWidth: 280, flex: 1 } : {}),
  },
  foodItemCardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: "rgba(94, 140, 58, 0.15)",
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  foodItemQuantity: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  expiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  foodItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  storageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  storageTagText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    textTransform: "capitalize",
  },
  categoryText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  selectedIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  floatingAction: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  generateButton: {
    borderRadius: 28,
    overflow: "hidden",
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  addItemPrompt: {
    alignItems: "center",
    padding: 24,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
  },
  lockedFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  lockedFeatureText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
  },
  unlockButton: {
    backgroundColor: "rgba(94, 140, 58, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  unlockButtonText: {
    color: AppColors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  recipesGrid: {
    gap: 16,
  },
  recipesGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  recipeCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    ...(isWeb ? { minWidth: 300, flex: 1 } : {}),
  },
  recipeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(94, 140, 58, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  recipeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 6,
  },
  recipeDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  recipeMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recipeMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  cuisineTag: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cuisineTagText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  goToInventoryButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goToInventoryText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  moreRecipesPrompt: {
    alignItems: "center",
    padding: 24,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    maxWidth: 500,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    flex: 1,
    paddingRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
    marginBottom: 16,
  },
  recipeTimings: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  timingItem: {
    alignItems: "center",
    gap: 4,
  },
  timingLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  timingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 12,
  },
  ingredientsList: {
    gap: 8,
    marginBottom: 20,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  signupPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(94, 140, 58, 0.15)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(94, 140, 58, 0.3)",
  },
  signupPromptText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
});
