import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/dist",
    "**/node_modules",
    "**/*.config.ts",
    "**/*.config.js",
    "**/dist",
    "**/node_modules",
    "**/*.config.ts",
    "**/*.config.js",
    "**/drizzle.config.ts",
    "**/vite.config.ts",
    "**/tailwind.config.ts",
    "**/postcss.config.ts",
]), {
    extends: fixupConfigRules(compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
    )),

    plugins: {
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        react: fixupPluginRules(react),
        "react-hooks": fixupPluginRules(reactHooks),
        "react-refresh": reactRefresh,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
            project: true,  // This tells it to find the nearest tsconfig.json
            tsconfigRootDir: __dirname,
        },
    },

    settings: {
        react: {
            version: "detect",
        },
    },

    rules: {
        // React specific
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "react/jsx-no-leaked-render": "error",
        "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],

        // TypeScript
        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_"
        }],
        "@typescript-eslint/no-explicit-any": "warn", // Changed from "off" to "warn"
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/await-thenable": "error",

        // Code quality
        "no-console": ["warn", { allow: ["warn", "error"] }],
        "prefer-const": "error",
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "warn",

        // React Hooks
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "error", // Upgraded from "warn"
    },
    ignores: [
        "temp.js",
        "config/*",
    ],
}]);