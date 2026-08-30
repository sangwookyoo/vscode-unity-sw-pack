// ESLint flat config. The old .eslintrc.json linted the generated ANTLR parser
// (~3200 warnings) and set every rule to "warn", so nothing ever failed a build.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
    {
        ignores: ["out/**", "dist/**", "**/*.d.ts", "node_modules/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Correctness — these fail the build.
            curly: "error",
            eqeqeq: ["error", "always", { null: "ignore" }],
            "no-throw-literal": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",

            // The Unity YAML documents are genuinely untyped, so the "any" that
            // comes out of js-yaml is narrowed by hand at the parse boundary.
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-call": "off",

            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/restrict-template-expressions": "off",
        },
    },
    {
        // The config file itself is not part of the TypeScript program.
        files: ["*.mjs", "*.js"],
        ...tseslint.configs.disableTypeChecked,
    },
    {
        // Tests assert on fixtures and may leave promises to the runner.
        files: ["src/test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-floating-promises": "off",
        },
    },
    prettier
);
