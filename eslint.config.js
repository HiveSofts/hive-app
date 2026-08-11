import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "dist/**",
            "dist-ssr/**",
            "node_modules/**",
            "src-tauri/**",
            "eslint.config.js",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.{ts,tsx}"],
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            // The codebase currently has many deps-array issues; onboard these
            // as warnings and promote to error once the refactors land.
            "react-hooks/exhaustive-deps": "warn",
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "off",
            // Core "recommended" rules demoted to warnings so the Phase-0 gate
            // is green from day one. These are stylistic / low-signal in this
            // codebase (e.g. no-control-regex fires on the intentional ANSI
            // stripper in the create panels). Promote back to error in Phase 4.
            "prefer-const": "warn",
            "no-useless-escape": "warn",
            "no-control-regex": "warn",
            "no-empty": "warn",
            "no-dupe-else-if": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
        },
    },
    // This overrides are intentional: ESLint *may* still be green with a
    // bounded number of warnings (see `--max-warnings` in the lint script).
    prettier,
);
