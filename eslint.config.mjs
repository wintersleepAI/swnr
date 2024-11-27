import globals from "globals";
import eslint from "@eslint/js";
import stylisticJs from '@stylistic/eslint-plugin-js';


/** @type {import('eslint').Linter.Config[]} */
export default [
  eslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Actor: "readonly",
        CONFIG: "readonly",
        foundry: "readonly",
        game: "readonly",
        Hooks: "readonly",
        Handlebars: "readonly",
      }
    }
  },
  {
    plugins: {
      '@stylistic/js': stylisticJs,
    },
    rules: {
      '@stylistic/js/indent': ['error', 2, { "SwitchCase": 1 }],
      '@stylistic/js/semi': ["error", "always"],
      curly: "error",
      "no-undef": "warn",
    }
  }
];