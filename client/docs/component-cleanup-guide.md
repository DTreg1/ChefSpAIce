# Component Cleanup & Consolidation Guide

This guide provides step-by-step prompts to reorganize and clean up the `client/src/components` directory. Enter each prompt into the chat sequentially.

---

## Phase 1: Audit & Identify Duplicates

### Step 1.1: Audit Notification Components

```
Audit the notification components: compare NotificationSettings.tsx vs notification-settings.tsx and any components in a notifications/ folder. Identify which is actually used in the codebase, remove the unused duplicate, and consolidate into a single notifications/ folder.
```

### Step 1.2: Audit Summary Components

```
Audit the summary components: compare the root-level summary-card.tsx, summary-toggle.tsx, summary-length-selector.tsx against equivalents in the summaries/ folder. Identify which versions are imported, remove duplicates, and ensure all summary components live in a single summaries/ folder.
```

### Step 1.3: Audit Tag Components

```
Audit tag-related components: TagCloud.tsx, TagEditor.tsx, TagInput.tsx, TagSuggestions.tsx and any tag-oriented directories. Identify duplicates, determine which are actively used, remove unused versions, and consolidate into a single tags/ folder.
```

### Step 1.4: Audit Loading/Skeleton Components

```
Audit loading and skeleton components: skeleton-loader.tsx, food-card-skeleton.tsx, recipe-card-skeleton.tsx, loading-dots.tsx, and any others. Consolidate into a single shared/loaders/ folder with a unified skeleton system. Update all imports across the codebase.
```

---

## Phase 2: Create Feature-Based Folder Structure

### Step 2.1: Organize Chat Components

```
Move all chat-related components into a chat/ folder: ChatInterface.tsx, chat-input.tsx, chat-message.tsx, ConversationSidebar.tsx, and any other chat-related files. Create an index.ts barrel file to export all public components. Update all imports in the codebase.
```

### Step 2.2: Organize Recipe Components

```
Move all recipe-related components into a recipes/ folder. This includes recipe cards, recipe forms, recipe lists, and any recipe-specific UI. Create an index.ts barrel file. Update all imports across the codebase.
```

### Step 2.3: Organize Inventory Components

```
Move all inventory-related components into an inventory/ folder. Include any inventory lists, inventory forms, inventory cards, and related UI. Create an index.ts barrel file. Update all imports.
```

### Step 2.4: Organize Voice Components

```
Consolidate all voice-related components into a voice/ folder. Include voice input, voice commands, speech recognition UI, and related components. Create an index.ts barrel file. Update all imports.
```

### Step 2.5: Organize Analytics Components

```
Ensure all analytics components are properly organized in the analytics/ folder. Move any stray analytics-related components from the root. Create or update the index.ts barrel file. Update all imports.
```

---

## Phase 3: Create Shared Components Structure

### Step 3.1: Create Shared Forms Folder

```
Create a shared/forms/ folder for reusable form components used across multiple features. Move form helpers, form fields, and generic form components here. Create an index.ts barrel file.
```

### Step 3.2: Create Shared Cards Folder

```
Create a shared/cards/ folder for generic card components that are reused across features. Move generic card skeletons, empty state cards, and base card variants here. Create an index.ts barrel file.
```

### Step 3.3: Create Shared Layout Folder

```
Create a shared/layout/ folder for layout components like empty-state.tsx, page headers, section wrappers, and other layout utilities. Create an index.ts barrel file.
```

---

## Phase 4: Naming Convention Cleanup

### Step 4.1: Standardize File Names

```
Standardize all component file names to use kebab-case (lowercase with hyphens). Rename any PascalCase files like ChatInterface.tsx to chat-interface.tsx, TagCloud.tsx to tag-cloud.tsx, etc. Update all imports after renaming.
```

### Step 4.2: Verify Export Names

```
Ensure all component exports use PascalCase even though file names are kebab-case. For example, chat-interface.tsx should export ChatInterface. Verify consistency across all renamed files.
```

---

## Phase 5: Remove Unused Components

### Step 5.1: Identify Unused Components

```
Search the entire codebase to identify any components in client/src/components that are never imported or used. List all unused components but do not delete them yet.
```

### Step 5.2: Remove Confirmed Unused Components

```
Delete the following unused components that were identified in the previous step: [PASTE THE LIST FROM STEP 5.1]. Verify the app still builds and runs correctly.
```

---

## Phase 6: Create Barrel Files

### Step 6.1: Add Index Files to All Feature Folders

```
Add index.ts barrel files to each feature folder (chat/, recipes/, inventory/, voice/, analytics/, notifications/, summaries/, tags/) that export all public components. This simplifies imports like: import { ChatInterface, ChatMessage } from '@/components/chat'
```

### Step 6.2: Update Imports to Use Barrel Files

```
Update all imports across the codebase to use the new barrel file imports instead of direct file paths. For example, change: import { ChatInterface } from '@/components/chat/chat-interface' to: import { ChatInterface } from '@/components/chat'
```

---

## Phase 7: Final Verification

### Step 7.1: Verify Build

```
Run the build and verify there are no import errors or missing components. Fix any broken imports.
```

### Step 7.2: Test All Features

```
Test each major feature (chat, recipes, inventory, voice, analytics, notifications) to ensure the component reorganization hasn't broken any functionality.
```

### Step 7.3: Update replit.md

```
Update replit.md to document the new component folder structure so future development follows the established conventions.
```

---

## Summary of Final Folder Structure

After completing all steps, your `client/src/components` folder should look like:

```
client/src/components/
├── ui/                    # Shadcn base components (unchanged)
├── chat/                  # Chat feature components
│   ├── index.ts
│   ├── chat-interface.tsx
│   ├── chat-input.tsx
│   ├── chat-message.tsx
│   └── conversation-sidebar.tsx
├── recipes/               # Recipe feature components
│   ├── index.ts
│   └── ...
├── inventory/             # Inventory feature components
│   ├── index.ts
│   └── ...
├── voice/                 # Voice feature components
│   ├── index.ts
│   └── ...
├── analytics/             # Analytics feature components
│   ├── index.ts
│   └── ...
├── notifications/         # Notification feature components
│   ├── index.ts
│   └── ...
├── summaries/             # Summary feature components
│   ├── index.ts
│   └── ...
├── tags/                  # Tag feature components
│   ├── index.ts
│   └── ...
├── shared/                # Cross-feature shared components
│   ├── forms/
│   ├── cards/
│   ├── layout/
│   └── loaders/
└── app-sidebar.tsx        # App-level components
```

---

## Tips for Best Results

1. **Do one step at a time** - Don't rush through multiple steps at once
2. **Verify after each step** - Make sure the app still works before proceeding
3. **Save checkpoints** - The system creates checkpoints you can rollback to if needed
4. **Test thoroughly** - After Phase 6, test all features manually

---

## Optional: Quick Cleanup (Single Prompt)

If you prefer a faster approach, you can use this comprehensive prompt:

```
Reorganize client/src/components with these changes:
1. Audit and remove duplicate components (keep only actively-used versions)
2. Create feature folders: chat/, recipes/, inventory/, voice/, notifications/, summaries/, tags/
3. Create shared/ folder with subfolders: forms/, cards/, layout/, loaders/
4. Move components into appropriate feature folders
5. Standardize file names to kebab-case
6. Add index.ts barrel files to each folder
7. Update all imports across the codebase
8. Remove any unused components
9. Test that everything still works
```

⚠️ **Warning**: The quick approach makes many changes at once, which can be harder to debug if something breaks. The step-by-step approach is safer.
