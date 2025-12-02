/**
 * useProgressiveDisclosure Hook
 *
 * Manages collapsible/expandable UI sections with persistent state.
 * Re-exports context-based implementation for centralized state management.
 *
 * This hook provides two utilities:
 * 1. useProgressiveDisclosure - Access global expand/collapse state
 * 2. useProgressiveSection - Manage individual section state
 *
 * Architecture:
 * - State managed centrally through ProgressiveDisclosureContext
 * - Persisted to localStorage for user preference preservation
 * - Enables consistent expand/collapse behavior across app
 *
 * Context Implementation (ProgressiveDisclosureContext):
 * - expandedStates: Record<string, boolean> - Map of section IDs to expanded state
 * - isExpanded(id): Check if section is expanded
 * - toggleExpanded(id): Toggle section state
 * - setExpanded(id, expanded): Set section state explicitly
 *
 * State Persistence:
 * - Storage: localStorage with key 'progressiveDisclosure'
 * - Format: JSON serialized Record<string, boolean>
 * - Auto-save: Updates localStorage on every state change
 * - Initialization: Reads from localStorage on mount
 * - Error handling: Falls back to empty object if parse fails
 *
 * useProgressiveDisclosure():
 * Returns context with all expand/collapse controls:
 * - expandedStates: All current states
 * - isExpanded(id): Check specific section
 * - toggleExpanded(id): Toggle specific section
 * - setExpanded(id, expanded): Set specific section
 *
 * useProgressiveSection(id, defaultExpanded):
 * Returns section-specific controls:
 * - expanded: Current state for this section
 * - setExpanded(expanded): Set state for this section
 *
 * Features:
 * - Auto-initialization with default state
 * - localStorage persistence across sessions
 * - Centralized state for global UI consistency
 * - Type-safe section IDs
 *
 * Usage - Basic Section:
 * ```tsx
 * import { useProgressiveSection } from '@/hooks/useProgressiveDisclosure';
 *
 * function RecipeDetails({ recipeId }) {
 *   const { expanded, setExpanded } = useProgressiveSection(
 *     `recipe-${recipeId}-nutrition`,
 *     false // collapsed by default
 *   );
 *
 *   return (
 *     <div>
 *       <button onClick={() => setExpanded(!expanded)}>
 *         {expanded ? 'Hide' : 'Show'} Nutrition Info
 *       </button>
 *       {expanded && <NutritionTable />}
 *     </div>
 *   );
 * }
 * ```
 *
 * Usage - Global State Access:
 * ```tsx
 * import { useProgressiveDisclosure } from '@/hooks/useProgressiveDisclosure';
 *
 * function ExpandAllButton() {
 *   const { expandedStates, setExpanded } = useProgressiveDisclosure();
 *
 *   const expandAll = () => {
 *     Object.keys(expandedStates).forEach(id => setExpanded(id, true));
 *   };
 *
 *   return <Button onClick={expandAll}>Expand All Sections</Button>;
 * }
 * ```
 *
 * Usage - With Accordion/Collapsible:
 * ```tsx
 * import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 * import { useProgressiveSection } from '@/hooks/useProgressiveDisclosure';
 *
 * function IngredientSection() {
 *   const { expanded, setExpanded } = useProgressiveSection('ingredients', true);
 *
 *   return (
 *     <Collapsible open={expanded} onOpenChange={setExpanded}>
 *       <CollapsibleTrigger>
 *         Ingredients {expanded ? '▼' : '▶'}
 *       </CollapsibleTrigger>
 *       <CollapsibleContent>
 *         <IngredientList />
 *       </CollapsibleContent>
 *     </Collapsible>
 *   );
 * }
 * ```
 *
 * Provider Setup:
 * ```tsx
 * import { ProgressiveDisclosureProvider } from '@/contexts/ProgressiveDisclosureContext';
 *
 * function App() {
 *   return (
 *     <ProgressiveDisclosureProvider>
 *       <YourApp />
 *     </ProgressiveDisclosureProvider>
 *   );
 * }
 * ```
 *
 * Section ID Naming Convention:
 * - Use kebab-case for consistency
 * - Include entity type and ID for uniqueness
 * - Examples:
 *   - 'recipe-123-instructions'
 *   - 'recipe-123-nutrition'
 *   - 'user-settings-privacy'
 *   - 'dashboard-recent-recipes'
 *
 * Benefits:
 * - User preferences persist across sessions
 * - Consistent UI state across navigation
 * - Easy to implement expandable sections
 * - No prop drilling for expand/collapse state
 * - Centralized control for "expand all" features
 */

// This hook is now just a re-export of the context-based implementation
// All progressive disclosure state is managed centrally through the context provider
export {
  useProgressiveDisclosure,
  useProgressiveSection,
} from "@/contexts/ProgressiveDisclosureContext";
