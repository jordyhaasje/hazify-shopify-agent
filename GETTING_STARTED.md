# Getting Started

## 1. Install

```bash
npm install
```

If Shopify CLI is not installed, setup can offer to install it globally:

```bash
npm install -g @shopify/cli@latest
```

## 2. Run Setup

```bash
npm run setup
```

You will choose AI clients, enter your `example.myshopify.com` store domain, select an Admin API connection mode, and choose a theme to pull into `./theme`.

## 3. Check Health

```bash
npm run doctor
```

Resolve any warnings before making store changes.

## 4. Start Theme Development

```bash
npm run theme:dev
```

This starts a Shopify development preview using your local `./theme` folder.

## 5. Use Prompt Recipes

Open a prompt from `prompts/` and paste it into your AI client. The agent instruction files tell the AI to inspect the theme, use Shopify tooling, avoid secrets in chat, run Theme Check, and avoid live pushes.
