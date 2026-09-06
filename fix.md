I have a bug pattern in this React + TypeScript + Vite project where entire blocks of code — imports, JSX elements, route definitions, or even whole component bodies — appear duplicated within the same file, likely from a bad merge or a repeated agent edit. This already caused a parse error in `src/App.tsx` (duplicate `react-router-dom` import lines, duplicate `<Route element={<Layout />}>` blocks, and a duplicate `<Route path="/customers/:id">` entry).

Please do the following across the **entire `src/` directory**:

1. **Scan every `.tsx` and `.ts` file** for duplicated content, specifically:
   - Repeated `import` statements from the same module (even if the named imports differ slightly, e.g. one missing `useLocation`).
   - Repeated JSX blocks or components rendered twice in the same return statement (e.g. two `<Route>` wrapping the same `<Layout>`, two copies of the same `<div>` section, duplicated table rows/cards in list components).
   - Repeated function or hook declarations within the same file.
   - Repeated Tailwind class blocks or style objects pasted twice into the same element.

2. **For each file with duplication found:**
   - Report the file path and a short description of what was duplicated.
   - Remove the duplicate, keeping the version that matches the file's actual intent (use surrounding comments and logic as context — e.g. in `App.tsx`, `CustomerDetail` was commented as intentionally outside `Layout`, so that was the version to keep).
   - Do not silently guess when two duplicate blocks meaningfully differ (e.g. one has a `title` prop and the other doesn't) — flag the conflict and pick the version consistent with how the rest of the app uses that component/data, but call it out in your report.

3. **After fixing, verify**:
   - Run `npm run build` (or `tsc --noEmit` if build is slow) and confirm there are no TypeScript/JSX parse errors.
   - Run the app locally and confirm each route (`/`, `/attendance`, `/customers`, `/customers/:id`) renders only its own intended content — not the full app or nav duplicated inside a nested page.

4. **Give me a summary at the end**:
   - List of files that had duplication and what was removed.
   - Any places where you had to make a judgment call between two conflicting duplicate versions.
   - Confirm the dev server now starts clean with no Vite/parse errors.

Do not change any business logic, Supabase queries, or styling beyond removing the duplicated blocks — this is a cleanup pass only.