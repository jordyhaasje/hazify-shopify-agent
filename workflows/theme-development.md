# Theme Development Workflow

Shopify themes are handled locally through Shopify CLI. No GitHub integration is required.

## Pull

Run setup or pull manually:

```bash
npm run theme:pull
```

The selected remote theme is downloaded into `./theme`.

## Work Locally

Theme files commonly relate to each other:

- `sections/` defines theme editor sections.
- `snippets/` holds reusable Liquid fragments.
- `assets/` holds CSS, JavaScript, and static assets.
- `templates/` maps page types to sections.
- `config/` stores theme settings.
- `locales/` stores translated strings.
- `blocks/` may exist in modern themes.

Before creating or editing a section, inspect the related files and match the existing theme patterns.

## Check And Preview

```bash
npm run theme:check
npm run theme:dev
```

Theme Check catches Liquid, schema, and theme best-practice issues. `theme:dev` starts a Shopify preview for local development.

## Push Safely

Push only to development or unpublished themes unless live deployment is explicitly approved. Before pushing, record changed files and keep a rollback note.
