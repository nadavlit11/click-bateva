# Jest Test Setup for Cloud Functions

## Config files

```
functions/
├── jest.config.unit.js         # no emulator, runs *.unit.test.ts
├── jest.config.integration.js  # emulator required, runs *.integration.test.ts
└── tsconfig.test.json          # overrides NodeNext → CommonJS for Jest
```

## ts-jest — use `transform`, NOT `globals`

`globals: { 'ts-jest': { ... } }` is **deprecated** in ts-jest v29+. Always use:

```js
module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }] },
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }, // strips .js from NodeNext imports
};
```

## tsconfig.test.json — required to fix NodeNext/Jest incompatibility

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "module": "CommonJS", "moduleResolution": "node" },
  "include": ["src"]
}
```

## Unit test boilerplate — mocking Admin SDK

`auth.ts` calls `getFirestore()` and `getAuth()` at **module load time**. Key rules:

1. Use `jest.mock()` (auto-hoisted) for all three modules: `firebase-admin/firestore`, `firebase-admin/auth`, `firebase-admin/app`
2. `import` the module under test AFTER the `jest.mock()` calls
3. `getApps` mock must return a non-empty array to skip `initializeApp()`

See `functions/src/__tests__/auth.unit.test.ts` for the full working pattern.

## Calling v2 callables in unit tests

```ts
// ✅ Use .run() directly — do NOT use testEnv.wrapV2()
const result = await setUserRole.run(makeRequest({}));
```

## Integration test — unique Firebase app names

Prevents "app already exists" errors when multiple test files run:

```ts
const app = initializeApp({ projectId: "click-bateva", apiKey: "test-key" }, `test-${Date.now()}`);
```
