/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: { module: "CommonJS", moduleResolution: "node", esModuleInterop: true, strict: true } },
    ],
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testTimeout: 20000,
};
