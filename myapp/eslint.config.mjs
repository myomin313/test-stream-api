import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  pluginJs.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.browser, ...globals.node, process: true }
    },
    rules: {
      "no-unused-vars": "warn"
    }
  }
];
