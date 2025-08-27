import { config } from "@repo/eslint-config/base";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...config,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      "eslint.config.*",
      ".eslintrc.*",
    ],
  },
);
