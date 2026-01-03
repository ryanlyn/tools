# Tools

Single-file HTML tools, built with LLM assistance.

Inspired by [Simon Willison's HTML tools](https://simonwillison.net/2025/Dec/10/html-tools/).

## Architecture

Each tool is a self-contained `.html` file with inline CSS and JavaScript.

**Simple tools** (vanilla JS):
- Write HTML directly, no build step
- Copy-paste friendly, easy to modify

**Complex tools** (TypeScript):
- Source in `src/tool-name/`
- Vite builds to single-file HTML
- Same output format, better DX for complex logic

## Tools

- **[api-playground](api-playground.html)** - Test LLM APIs (Claude, GPT) directly from your browser
- **[claude-chat-analyzer](claude-chat-analyzer.html)** - Convert Claude exports to clean markdown quotes

## Creating New Tools

See [CLAUDE.md](CLAUDE.md) for patterns and best practices when creating tools with LLM assistance.

## Hosting

Deployed via GitHub Pages. After enabling Pages in repo settings:

1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: `main`, folder: `/` (root)

Live at: `https://<username>.github.io/tools/`
