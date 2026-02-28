import type { Config } from "jest";

const config: Config = {
  testMatch: [
    "<rootDir>/tests/api/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.ts",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          target: "ES2017",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testEnvironment: "node",
  // Don't pick up Next.js app code
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
};

export default config;
