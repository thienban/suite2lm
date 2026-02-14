# Suite2LM

A smart document editor with bidirectional JSON table editing, powered by TipTap and TanStack Table.

## 🏗️ Architecture

| Layer | Tech | Path |
|-------|------|------|
| **Frontend** | Next.js 16, React 19, TipTap, TanStack Table, Tailwind CSS | `frontend/` |
| **Backend** | Go, Gin | `backend/` |
| **Workspace** | Markdown files with embedded smart-table JSON | `workspace/` |

## ✨ Features

- **Rich Text Editor** — TipTap-based Markdown editor with toolbar
- **Smart Tables** — Editable JSON tables rendered inline (array of arrays & array of objects)
- **Bidirectional Sync** — Edit in grid view ↔ JSON source stays in sync
- **Context Menu** — Right-click to add/delete rows and columns
- **Code/Preview Toggle** — Switch between raw JSON and table view

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (or Bun)
- **Go** ≥ 1.21

### Backend

```bash
cd backend
go run main.go
```

The API server starts on `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install   # or: bun install
npm run dev   # or: bun run dev
```

The app starts on `http://localhost:3000`.

## 📁 Project Structure

```
suite2lm/
├── backend/            # Go API server (Gin)
│   ├── handlers/       # Route handlers (files CRUD)
│   └── main.go         # Entry point
├── frontend/           # Next.js application
│   ├── app/            # App router pages
│   ├── components/
│   │   ├── editor/     # TipTap editor
│   │   │   ├── SmartTable/          # TipTap extension (NodeView + config)
│   │   │   └── SmartTableEditable/  # Editable table component + hook
│   │   └── ui/         # Shadcn UI components
│   └── lib/            # Utilities
├── specs/              # Feature specifications
├── workspace/          # User markdown files
└── README.md
```

## 📝 Smart Table Format

Embed a smart table in any Markdown file using a fenced code block:

````markdown
```smart-table
{
  "id": "table_001",
  "data": [
    ["Name", "Type"],
    ["Suite2LM", "Editor"]
  ]
}
```
````

## 📄 License

Private project.
