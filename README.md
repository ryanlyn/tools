# Tools

Single-file HTML tools, built with LLM assistance.

Inspired by [Simon Willison's HTML tools](https://simonwillison.net/2025/Dec/10/html-tools/).

## Architecture

Each tool is a self-contained `.html` file with inline CSS and JavaScript. No build steps, no frameworks, no npm.

- **Single-file design**: Copy-paste friendly, easy to modify
- **Vanilla JavaScript**: No React or complex frameworks
- **CDN dependencies**: External libraries loaded from jsDelivr/cdnjs
- **Zero build step**: Push to deploy

## Tools

- **[api-playground](api-playground.html)** - Test LLM APIs (Claude, GPT) directly from your browser

## Creating New Tools

See [CLAUDE.md](CLAUDE.md) for patterns and best practices when creating tools with LLM assistance.

## Hosting

Deployed via GitHub Pages. After enabling Pages in repo settings:

1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: `main`, folder: `/` (root)

Live at: `https://<username>.github.io/tools/`
