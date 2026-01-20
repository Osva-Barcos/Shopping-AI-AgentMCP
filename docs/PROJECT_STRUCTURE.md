# 📁 Project Structure

This document describes the organized structure of the Laburen AI Agent MCP repository.

```
laburen-ai-agent-mcp/
├── 📂 src/                          # Source code
│   ├── index.ts                     # Main worker entry point
│   ├── 📂 types/                    # TypeScript type definitions
│   │   └── index.ts                 # Shared interfaces (Product, Cart, etc.)
│   ├── 📂 db/                       # Database layer
│   │   ├── client.ts                # D1 database client wrapper
│   │   ├── schema.sql               # Database schema (tables)
│   │   └── seed.sql                 # Sample seed data (optional)
│   ├── 📂 routes/                   # HTTP route handlers
│   │   ├── products.ts              # Product endpoints
│   │   ├── carts.ts                 # Cart endpoints
│   │   └── admin.ts                 # Admin panel HTML
│   ├── 📂 services/                 # Business logic layer
│   │   ├── product.service.ts       # Product operations
│   │   └── cart.service.ts          # Cart operations & validations
│   └── 📂 utils/                    # Utilities
│       └── errors.ts                # Error handling helpers
│
├── 📂 scripts/                      # Development & deployment scripts
│   ├── convert-csv-to-sql.js        # CSV to SQL converter
│   ├── import-products.js           # Alternative import script
│   ├── init.ps1                     # Windows setup script
│   └── init.sh                      # Unix/Mac setup script
│
├── 📂 data/                         # Data files
│   ├── products-utf8.csv            # Source product data (100 items)
│   └── import-products.sql          # Generated SQL inserts (gitignored)
│
├── 📂 docs/                         # Documentation
│   ├── PROJECT_STRUCTURE.md         # This file
│   ├── DEPLOYMENT.md                # Deployment guide
│   ├── examples.http                # HTTP request examples
│   ├── Arquitectura.pdf             # System architecture
│   ├── Fase Conceptual - Diseño del Agente de IA.pdf
│   └── 📂 diagrams/                 # Architecture diagrams
│
├── 📄 README.md                     # Main documentation
├── 📄 SETUP.md                      # Setup instructions
├── 📄 package.json                  # Node.js dependencies
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 wrangler.toml                 # Cloudflare Workers config
└── 📄 .gitignore                    # Git ignore rules

📦 Generated/Ignored:
├── node_modules/                    # NPM dependencies (gitignored)
├── .wrangler/                       # Wrangler cache (gitignored)
└── dist/                            # Build output (gitignored)
```

---

## 📂 Folder Descriptions

### `src/` - Source Code
Contains all TypeScript source code organized in layers:
- **Routes**: HTTP endpoint handlers
- **Services**: Business logic and validations
- **DB**: Database client and schema
- **Types**: Shared TypeScript interfaces
- **Utils**: Helper functions

### `scripts/` - Automation Scripts
Development and deployment automation:
- `convert-csv-to-sql.js` - Converts CSV product data to SQL INSERT statements
- `init.ps1` / `init.sh` - Project initialization scripts

### `data/` - Data Files
Product catalog data:
- `products-utf8.csv` - Source of truth (100 products with UTF-8 encoding)
- `import-products.sql` - Auto-generated SQL (created by convert script)

### `docs/` - Documentation
All documentation and examples:
- API documentation
- Architecture diagrams
- HTTP request examples
- Design documents

---

## 🔄 Common Workflows

### Adding New Products

1. Edit `data/products-utf8.csv`
2. Run: `node scripts/convert-csv-to-sql.js`
3. Deploy: `npx wrangler d1 execute laburen-ai-db --remote --file=data/import-products.sql`

### Local Development

```bash
npm run dev              # Start local server
# Server at http://localhost:8787
```

### Production Deployment

```bash
npx wrangler deploy      # Deploy to Cloudflare Workers
npx wrangler tail        # View production logs
```

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `wrangler.toml` | Cloudflare Workers & D1 configuration |
| `tsconfig.json` | TypeScript compiler settings |
| `package.json` | NPM dependencies and scripts |
| `.gitignore` | Files to exclude from Git |

---

## 🎯 Architecture Layers

```
┌─────────────────────────────────────┐
│  HTTP Request (Cloudflare Workers)  │
└──────────────┬──────────────────────┘
               │
       ┌───────▼────────┐
       │  index.ts      │  ◄── Entry point, routing
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │  Routes Layer  │  ◄── products.ts, carts.ts
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │ Services Layer │  ◄── Business logic, validations
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │   DB Client    │  ◄── Cloudflare D1 wrapper
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │  D1 Database   │  ◄── SQLite (Cloudflare)
       └────────────────┘
```

---

## 🚀 Maintained By

**Laburen AI Team** - January 2026
