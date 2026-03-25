/*
 * UserSky, a client modification for Bluesky
 * Copyright (c) 2026 rini and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import simpleHeader from "eslint-plugin-simple-header";
import importSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import ts from "typescript-eslint";

export default defineConfig({
    files: ["src/**/*", "scripts/**/*", "plugins/**/*", "eslint.config.js"],

    plugins: {
        "@stylistic": stylistic,
        "react-hooks": reactHooks,
        "simple-header": simpleHeader,
        "simple-import-sort": importSort,
        "unused-imports": unusedImports,
    },

    extends: [
        js.configs.recommended,
        ts.configs.recommended,
        reactHooks.configs.flat.recommended,
        stylistic.configs.customize({
            indent: 4,
            braceStyle: "1tbs",
            semi: true,
        }),
    ],

    rules: {
        "@stylistic/arrow-parens": ["error", "as-needed"],
        "@stylistic/generator-star-spacing": ["error", { before: true, after: false }],
        "@stylistic/no-mixed-operators": "off",
        "@stylistic/operator-linebreak": ["error", "before", { overrides: { "=": "after" } }],
        "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
        "@stylistic/spaced-comment": ["error", "always", { markers: ["!", "#region", "#endregion"] }],

        "simple-header/header": ["error", {
            files: ["scripts/header.txt", "scripts/header-long.txt"],
            templates: { author: [".*", "rini and contributors"] },
        }],
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
        "unused-imports/no-unused-imports": "error",

        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-expressions": "off",

        "no-useless-escape": "off",
        "no-var": "off",
        "prefer-const": ["error", { destructuring: "all" }],
    },
});
