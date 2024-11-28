import eslint from "@eslint/js";
import stylisticJs from '@stylistic/eslint-plugin-js';


/** @type {import('eslint').Linter.Config[]} */
export default [
  eslint.configs.recommended,
  {
    plugins: {
      '@stylistic/js': stylisticJs,
    },
    rules: {
      '@stylistic/js/indent': ['error', 2, { "SwitchCase": 1 }],
      '@stylistic/js/semi': ["error", "always"],
      curly: "error",
      "no-undef": "off"
    }
  }
];