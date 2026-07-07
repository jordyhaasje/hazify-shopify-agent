# Section Creation Workflow

1. Inspect the current theme structure.
2. Find similar sections and reuse their naming, layout classes, CSS variables, and schema style.
3. Decide whether the section needs snippets, CSS, JS, locales, template changes, or blocks.
4. Build merchant-editable settings and presets.
5. Keep CSS scoped to the section unless the theme has a shared pattern for global styles.
6. Run `npm run theme:check`.
7. Show changed files and explain where the merchant edits the section.
8. Do not push live.
