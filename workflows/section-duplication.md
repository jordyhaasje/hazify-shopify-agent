# Section Duplication Workflow

Use duplication when the merchant wants a variant of an existing section without changing current pages.

1. Locate the original section and related snippets/assets/locales/templates.
2. Copy only the files that truly need separate behavior.
3. Rename schema `name`, presets, and any section-specific CSS hooks.
4. Keep shared snippets or assets shared if they do not need changes.
5. Run `npm run theme:check`.
6. Tell the merchant which section to add in the theme editor.
