# figma-mcp

> A **Model Context Protocol (MCP) server** for Figma — gives AI coding assistants (Claude Desktop, Cursor, VS Code Copilot, etc.) direct, structured access to your Figma files, components, styles, variables, and a powerful **design-to-code** tool.

---

## Features

| # | Tool | Description |
|---|------|-------------|
| 1 | `get_file` | Fetch a full Figma file (pages, components, styles) |
| 2 | `get_file_nodes` | Get specific nodes by ID |
| 3 | `get_images` | Export nodes as PNG / SVG / PDF / JPEG |
| 4 | `get_file_styles` | List all published styles |
| 5 | `get_file_components` | List all published components |
| 6 | `get_comments` | Read all file comments |
| 7 | `post_comment` | Post a comment (optionally pinned to a node) |
| 8 | `get_team_projects` | List projects in a Figma team |
| 9 | `get_project_files` | List files in a project |
| 10 | `get_local_variables` | Get local variables & variable collections |
| 11 | `extract_design_tokens` | Pull colors, typography & spacing as design tokens |
| 12 | `design_to_code` ⭐ | **Convert a Figma frame → production code in your chosen tech stack** |

**MCP Resources:**
- `figma://file/{file_key}` — access a file as a structured resource  
- `figma://file/{file_key}/nodes/{node_ids}` — access specific nodes

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A **Figma Personal Access Token**  
  → Figma → Settings → Security → Personal Access Tokens → Generate new token

### 2. Install

```bash
git clone <repo-url> figma-mcp
cd figma-mcp
npm install
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env and paste your token:
# FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxx
```

### 4. Build & Run

```bash
npm run build
npm start
```

---

## Connecting to AI Clients

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)  
or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/absolute/path/to/figma-mcp/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_xxxxxxxxxxxx"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/absolute/path/to/figma-mcp/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_xxxxxxxxxxxx"
      }
    }
  }
}
```

### VS Code (Copilot / Continue)

```json
{
  "mcp": {
    "servers": {
      "figma": {
        "type": "stdio",
        "command": "node",
        "args": ["/absolute/path/to/figma-mcp/dist/index.js"],
        "env": {
          "FIGMA_ACCESS_TOKEN": "figd_xxxxxxxxxxxx"
        }
      }
    }
  }
}
```

---

## Finding Figma IDs

**File Key** — found in the Figma file URL:  
`https://www.figma.com/design/`**`ABC123xyz`**`/My-Project`

**Node ID** — right-click any layer in Figma → Copy/Paste → Copy link  
The URL looks like: `...?node-id=`**`1%3A234`** → decode to `1:234`

**Team ID** — found in the team URL:  
`https://www.figma.com/files/team/`**`987654321`**`/My-Team`

---

## `design_to_code` — Detailed Usage

This is the flagship tool. It takes a Figma frame/component and generates accurate, production-ready code for your chosen tech stack.

### Supported Tech Stacks

| `tech_stack` value | Output |
|--------------------|--------|
| `react` | React JSX + CSS Modules |
| `react-tailwind` | React JSX + Tailwind CSS |
| `vue` | Vue 3 SFC (Composition API) |
| `next` | Next.js component + CSS Modules |
| `html` | Plain HTML + CSS |
| `flutter` | Flutter Dart widgets |
| `react-native` | React Native + StyleSheet |
| `svelte` | Svelte component |
| `angular` | Angular standalone component + SCSS |

### Example Prompts

> "Use the `design_to_code` tool with file key `ABC123` and node ID `1:234` for `react-tailwind`, then write the component."

> "Convert the Hero section (node `2:56`) from my Figma file `XYZ789` into a Vue 3 SFC component."

> "Get the design tokens from file `ABC123` and then use `design_to_code` on the Card component (`3:78`) for Flutter."

---

## Development

```bash
# Watch mode (auto-recompile)
npm run watch

# Run directly with tsx (no build needed)
npm run dev

# Build
npm run build
```

---

## License

MIT
