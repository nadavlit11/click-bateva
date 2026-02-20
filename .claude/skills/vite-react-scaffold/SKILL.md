# vite-react-scaffold

Use when scaffolding a new React app under `apps/` (admin, business, user-web).

---

## Steps

### 1. Scaffold

```bash
# Run from project root
npm create vite@latest apps/<name> -- --template react-ts
cd apps/<name>
npm install
npm install @vis.gl/react-google-maps firebase   # if this app uses Maps/Firestore
npm install -D tailwindcss @tailwindcss/vite vitest
```

### 2. vite.config.ts

Import `defineConfig` from **`vitest/config`** (not `vite`) — required to add the `test:` block without TypeScript errors:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
})
```

### 3. index.html

Set `lang="he" dir="rtl"` and add Rubik font:

```html
<html lang="he" dir="rtl">
  <head>
    ...
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  </head>
```

### 4. src/index.css

Tailwind v4 uses `@import`, not `@tailwind` directives:

```css
@import "tailwindcss";

body {
  font-family: "Rubik", sans-serif;
  margin: 0;
  overflow: hidden;
}
```

### 5. .env.local + .env.example

Create `apps/<name>/.env.local` (gitignored) with `VITE_` prefixed vars. The root `.gitignore` covers `*.local` — no extra gitignore entry needed.

Firebase config comes from: Firebase Console → Project Settings → General → Your apps (web).

### 6. Delete boilerplate

After scaffolding, remove:
- `src/App.css`
- `src/assets/react.svg`

### 7. Add test script to package.json

```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## Gotchas

- **`Write` fails on freshly-scaffolded files** — even if created by a background npm command, you must `Read` the file first before `Write` or `Edit` will work.
- **`vitest/config` not `vite`** — using `defineConfig` from `vite` when a `test:` block is present causes a TypeScript error.
- **Tailwind v4**: `@import "tailwindcss"` replaces the old `@tailwind base/components/utilities` directives. Plugin is `@tailwindcss/vite`, not `tailwindcss` directly.
- **`AdvancedMarker` requires `mapId`** — use `mapId="DEMO_MAP_ID"` for local dev. Replace with a real Map ID from Google Cloud Console before production.
- **RTL layout**: `dir="rtl"` on `<html>` means the first flex child renders on the RIGHT. No need to set `dir` on individual divs — they inherit.
- **RTL bidi-mirrored characters**: `‹` (U+2039) and `›` (U+203A) are Unicode bidi-mirrored — the browser flips them in RTL context. Fix: add `direction: "ltr"` to the element's inline style. Affects carousel arrow buttons, any directional icon characters.
- **Shared constants** (emoji maps, color maps, default data) belong in `src/data/defaults.ts` — do not duplicate across components.
- **Website href safety**: When constructing `href` from a user/admin-supplied domain string, validate with `new URL()` and assert `url.hostname === domain` to prevent `@`-based URL confusion attacks (e.g. `trusted.com@evil.com` → browser goes to `evil.com`).

---

## Firebase emulator in DEV

```ts
// src/lib/firebase.ts
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

Firestore emulator runs on port **8080**. Auth emulator on **9099**.
