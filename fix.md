# FIX PROMPT — Styling/Tailwind CSS is not being applied at all

The app is rendering with zero styling — plain unstyled HTML text, no colors, no spacing, no component styling at all (see attached screenshot of the login page). This means Tailwind CSS either isn't configured correctly or isn't being loaded by the app. Please diagnose and fix by checking, in order:

**1. Is the CSS file actually imported?**
- Confirm there's a global CSS file (e.g. `src/index.css` or `src/App.css`) containing the three Tailwind directives:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- Confirm that CSS file is imported in the app's entry point (`src/main.tsx` or `src/main.jsx`) — e.g. `import './index.css'`. If this import is missing or points to the wrong file, that alone would cause exactly this symptom.

**2. Is Tailwind actually installed and configured?**
- Confirm `tailwindcss`, `postcss`, and `autoprefixer` are in `package.json` dependencies (not just referenced in code).
- Confirm `tailwind.config.js` (or `.ts`) exists at the project root and its `content` array correctly points to where the component files actually live, e.g.:
  ```js
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
  ```
  If this path doesn't match the real folder structure, Tailwind generates an empty stylesheet with no utility classes in it — this is the single most common cause of exactly this bug.
- Confirm `postcss.config.js` exists and includes `tailwindcss` and `autoprefixer` as plugins.

**3. Is the dev server actually serving the compiled CSS?**
- Do a hard refresh / clear cache, since a stale dev server cache can also cause this.
- Restart the dev server after confirming the above — Tailwind config changes usually require a restart, not just a hot reload.

**4. Sanity check:**
- After fixing, verify by adding a simple bold color test (e.g. a div with `className="bg-red-500 text-white p-4"`) temporarily to confirm Tailwind classes are actually being applied, then remove the test once confirmed.

Once fixed, re-render the login screen and confirm it matches the Stitch design fetched earlier — colors, spacing, input styling, and the button should all be visually styled, not plain browser-default text and inputs.
