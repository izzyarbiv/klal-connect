import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

// The recommended sets are their own config objects. They used to be spread
// into the object below, where the explicit `rules` key then replaced theirs
// wholesale — so none of the recommended rules (no-undef included) actually
// ran. Keeping them as separate entries lets ESLint merge the rules.
const CLIENT = ["src/**/*.{js,mjs,cjs,jsx}"];
const CLIENT_IGNORES = ["src/lib/**/*", "src/components/ui/**/*"];
const SERVER = ["server/**/*.{js,mjs}", "api/**/*.js"];

export default [
  { ...pluginJs.configs.recommended, files: CLIENT, ignores: CLIENT_IGNORES },
  { ...pluginReact.configs.flat.recommended, files: CLIENT, ignores: CLIENT_IGNORES },
  {
    files: CLIENT,
    ignores: CLIENT_IGNORES,
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // A bare apostrophe in JSX text renders fine; escaping it only hurts reading.
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": ["error", { ignore: ["cmdk-input-wrapper", "toast-close"] }],
      "react-hooks/rules-of-hooks": "error",
      // `catch {}` is the deliberate "best effort, ignore failure" idiom here.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    ...pluginJs.configs.recommended,
    files: SERVER,
    languageOptions: { globals: globals.node, ecmaVersion: 2022, sourceType: "module" },
    rules: {
      ...pluginJs.configs.recommended.rules,
      // args: "none" — Express handlers take (req, res, next) whether or not
      // they call next; ignoreRestSiblings — `const { secret, ...safe } = obj`
      // is how a field is deliberately dropped.
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
