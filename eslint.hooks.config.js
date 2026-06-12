// CI / build gate — fails ONLY on React Hooks order violations
// (react-hooks/rules-of-hooks). That's the class of bug that crashes a page
// at runtime but slips past TypeScript and the Vite build. Existing unrelated
// lint debt is intentionally NOT enforced here so it can't block deploys.
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
