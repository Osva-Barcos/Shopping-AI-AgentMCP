# 🛍️ Laburen AI Shopping Assistant - MCP Backend

> **Complete E-commerce Backend with Model Context Protocol (MCP) integration for AI conversational agents**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-green)](https://modelcontextprotocol.io)

🌐 **Live API:** [https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev](https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev)  
🔌 **MCP Endpoint:** [https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse](https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [MCP Integration](#-mcp-integration)
- [AI Agent Setup](#-ai-agent-setup)
- [Troubleshooting](#-troubleshooting)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Examples](#-examples)
- [Tech Stack](#-tech-stack)

---

## 🎯 Overview

**Laburen AI Shopping Assistant** is a production-ready e-commerce backend specifically designed for AI agents. It provides a complete shopping experience through both traditional REST APIs and the Model Context Protocol (MCP) for seamless AI integration.

### What Makes This Special?

- 🤖 **AI-First Design**: Built specifically for conversational AI agents
- 🔌 **MCP Protocol**: Native support for Model Context Protocol over SSE
- 🌍 **Edge Computing**: Deployed on Cloudflare Workers for global low latency
- 📦 **Real Inventory**: 100 fashion products with real stock management
- ✅ **Production Ready**: Full error handling, validation, and CORS support

### Use Cases

- 💬 AI chatbots for e-commerce (WhatsApp, Telegram, Web)
- 🛒 Voice shopping assistants
- 🤝 AI customer service agents
- 📱 Conversational commerce platforms

---

## ✨ Features

### 🛍️ Core Functionality

- **Product Catalog**
  - 100 fashion products (shirts, pants, jackets, etc.)
  - Full-text search by name or description
  - Real-time stock and availability tracking
  - Detailed product information with pricing tiers

- **Shopping Cart**
  - Create and manage multiple carts
  - Add/update/remove items
  - Automatic stock validation
  - Real-time total calculation
  - Item deduplication (same product = qty update)

- **Inventory Management**
  - Stock level tracking
  - Availability flags (Yes/No)
  - Prevents overselling
  - Three-tier validation (availability → stock → quantity)

### 🤖 AI Integration

- **MCP Protocol Support**
  - 7 tools for AI agents (list_products, get_product, create_cart, etc.)
  - Server-Sent Events (SSE) for real-time communication
  - JSON-RPC 2.0 compliant
  - Tool execution with error handling

- **Conversational-First**
  - Natural language-friendly responses
  - Contextual error messages
  - Cart state persistence
  - Clear success confirmations

### 🎨 Admin Dashboard

- Visual product catalog
- Real-time search
- Stock indicators
- Inventory statistics
- Responsive design

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)
- Wrangler CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/laburen-ai-agent-mcp.git
cd laburen-ai-agent-mcp

# Install dependencies
npm install

# Start development server
npm run dev

# Server runs at http://localhost:8787
```

### Test the API

```bash
# List products
curl http://localhost:8787/products

# Create a cart
curl -X POST http://localhost:8787/carts

# Add product to cart
curl -X POST http://localhost:8787/carts/{cart_id}/items \
  -H "Content-Type: application/json" \
  -d '{"product_id":"0001","qty":2}'
```

---

## 📡 API Documentation

### Base URL

```
Production: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev
Local Dev:  http://localhost:8787
```

### Endpoints Overview

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Products** | GET | `/products` | List all products |
| | GET | `/products?search={term}` | Search products |
| | GET | `/products/{id}` | Get product by ID |
| | GET | `/products?id={id}` | Get product by query param |
| **Carts** | POST | `/carts` | Create new cart |
| | GET | `/carts/{cart_id}` | Get cart with items |
| | GET | `/carts?cart_id={id}` | Get cart by query param |
| | POST | `/carts/{cart_id}/items` | Add item to cart |
| | POST | `/carts/items?cart_id={id}&product_id={id}&qty={n}` | Add item (query params) |
| | PUT | `/carts/{cart_id}/items/{item_id}` | Update item quantity |
| | PUT | `/carts/items?cart_id={id}&item_id={id}&qty={n}` | Update item (query params) |
| | DELETE | `/carts/{cart_id}/items/{item_id}` | Remove item |
| | DELETE | `/carts/items?cart_id={id}&item_id={id}` | Remove item (query params) |
| **Admin** | GET | `/admin` | Admin dashboard |

### Response Format

All endpoints return JSON with this structure:

```json
{
  "success": true,
  "data": { /* result data */ }
}
```

Errors return:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error",
    "code": "ERROR_CODE",
    "details": { /* optional context */ }
  }
}
```

---

## 🔌 MCP Integration

### What is MCP?

Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools and services. This backend implements MCP over Server-Sent Events (SSE).

### MCP Endpoint

```
POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
```

### Available Tools

1. **list_products** - Browse product catalog
2. **get_product** - Get details of specific product
3. **create_cart** - Create new shopping cart
4. **get_cart** - View cart contents
5. **add_to_cart** - Add products to cart
6. **update_cart_item** - Change item quantity
7. **remove_from_cart** - Remove items from cart

### MCP Request Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### MCP Tool Call Example

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_products",
    "arguments": {
      "search": "camiseta azul",
      "limit": 5
    }
  }
}
```

---

## 🤖 AI Agent Setup

### System Prompt

Use the comprehensive AI agent prompt located at:

**📄 [docs/AI_AGENT_PROMPT.md](docs/AI_AGENT_PROMPT.md)**

This prompt includes:
- ✅ Tool descriptions with examples
- ✅ Shopping flow guidance
- ✅ Cart state management rules
- ✅ Error handling scenarios
- ✅ Response formatting templates

### Key Rules for Agents

⚠️ **CRITICAL**: Agents must maintain `current_cart_id` throughout the conversation and NEVER create multiple carts.

```
✅ DO: Reuse cart_id for all operations
❌ DON'T: Create new cart for each product addition
```

### Integration Steps

1. **Configure MCP Endpoint**
   ```
   https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
   ```

2. **Add System Prompt**
   - Copy content from `docs/AI_AGENT_PROMPT.md`
   - Paste into your AI platform's system instructions

3. **Test Basic Flow**
   ```
   User: "I want to buy a blue shirt"
   Agent: [calls list_products] → [creates cart] → [adds item]
   
   User: "Add black pants too"
   Agent: [searches products] → [adds to SAME cart]
   ```

---

## � Troubleshooting

### Chatwoot + WhatsApp Integration Issues

If your agent works in the Laburen dashboard but **stops responding after the first message** in Chatwoot/WhatsApp:

**Quick Fix:**
1. Deploy latest changes with **ultra-aggressive SSE keep-alive** (30s → 5s)
   ```
   npm run deploy
   ```
   
2. Verify MCP URL uses SSE endpoint:
   ```
   https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
   ```

3. Verify user has `organizationId` assigned in database

**📄 Full Guide:** [docs/QUICK_FIX_CHATWOOT.md](docs/QUICK_FIX_CHATWOOT.md)

**📄 Detailed Troubleshooting:** [docs/TROUBLESHOOTING_CHATWOOT_WHATSAPP.md](docs/TROUBLESHOOTING_CHATWOOT_WHATSAPP.md)

### Common Issues

| Issue | Solution |
|-------|----------|
| Agent doesn't respond to second message | Deploy with ultra-aggressive keep-alive (5s) and verify SSE endpoint |
| "Missing organizationId" error | Assign organization to user in database |
| SSE connection timeout | Keep-alive improved: 30s → 10s → **5s** (deploy latest code) |
| Tools not found | Verify MCP URL: `.../sse` (not `/api/tools/call`) |

### Testing

Run diagnostics:
```bash
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/diagnostics
```

Test locally:
```bash
.\scripts\test-mcp-connection.ps1
```

Monitor logs:
```bash
wrangler tail --format pretty
```

---

## �🗄️ Database Schema

### Products Table

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,        -- "0001" to "0100"
  name TEXT NOT NULL,         -- "Camiseta Azul Talla M"
  description TEXT,           -- Full description
  price INTEGER NOT NULL,     -- Price in cents (59900 = $599.00)
  stock INTEGER DEFAULT 0,    -- Available units
  available TEXT DEFAULT 'Yes' -- "Yes" or "No"
);
```

### Carts Table

```sql
CREATE TABLE carts (
  id TEXT PRIMARY KEY,        -- "cart_xyz123"
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Cart Items Table

```sql
CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,        -- "item_abc456"
  cart_id TEXT NOT NULL,      -- FK to carts
  product_id TEXT NOT NULL,   -- FK to products
  qty INTEGER NOT NULL,
  FOREIGN KEY (cart_id) REFERENCES carts(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## 📁 Project Structure

```
laburen-ai-agent-mcp/
├── src/
│   ├── index.ts                 # Main Cloudflare Worker entry
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── db/
│   │   ├── client.ts           # D1 database wrapper
│   │   ├── schema.sql          # Database schema
│   │   └── seed.sql            # Initial data
│   ├── routes/
│   │   ├── products.ts         # Product endpoints
│   │   ├── carts.ts            # Cart endpoints
│   │   └── admin.ts            # Admin panel HTML
│   ├── services/
│   │   ├── product.service.ts  # Product business logic
│   │   └── cart.service.ts     # Cart business logic
│   ├── mcp/
│   │   └── sse-handler.ts      # MCP protocol implementation
│   └── utils/
│       └── errors.ts           # Error handling utilities
├── docs/
│   ├── AI_AGENT_PROMPT.md      # 🤖 Complete AI agent prompt
│   ├── DEPLOYMENT.md           # Deployment guide
│   └── MCP_SERVER.md           # MCP integration docs
├── scripts/
│   ├── convert-csv-to-sql.js   # Data import script
│   └── import-products.js      # Product loader
├── data/
│   ├── products-utf8.csv       # Source product data
│   └── import-products.sql     # Generated SQL
├── wrangler.toml               # Cloudflare configuration
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## 🚀 Deployment

### Cloudflare Workers (Recommended)

```bash
# Login to Cloudflare
npx wrangler login

# Deploy
npx wrangler deploy

# Your API is live at:
# https://laburen-ai-agent-mcp.YOUR-SUBDOMAIN.workers.dev
```

### Database Setup

```bash
# Create D1 database
npx wrangler d1 create laburen-ai-db

# Run schema
npx wrangler d1 execute laburen-ai-db --file=./src/db/schema.sql

# Import products
npx wrangler d1 execute laburen-ai-db --file=./data/import-products.sql
```

### Environment Variables

Update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "laburen-ai-db"
database_id = "your-database-id"

[vars]
ENVIRONMENT = "production"
```

---

## 💡 Examples

### Example 1: Search and Add to Cart

```bash
# 1. Search for blue shirts
curl "https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/products?search=camiseta+azul"

# 2. Create cart
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts
# Response: {"success":true,"data":{"id":"cart_mk123abc"}}

# 3. Add product
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts/cart_mk123abc/items \
  -H "Content-Type: application/json" \
  -d '{"product_id":"0002","qty":3}'

# 4. View cart
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts/cart_mk123abc
```

### Example 2: Using Query Parameters

```bash
# Get product by query param
curl "https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/products?id=0001"

# Add to cart with query params
curl -X POST "https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts/items?cart_id=cart_mk123abc&product_id=0005&qty=2"

# Update item quantity
curl -X PUT "https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts/items?cart_id=cart_mk123abc&item_id=item_xyz&qty=5"
```

### Example 3: MCP Tool Call

```bash
# List products via MCP
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_products",
      "arguments": {"search": "pantalón", "limit": 5}
    }
  }'
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Cloudflare Workers (Edge Computing)
- **Language**: TypeScript 5.0+ (Strict Mode)
- **Database**: Cloudflare D1 (SQLite)
- **Protocol**: REST + MCP over SSE

### Architecture
- **Pattern**: Layered Architecture (Routes → Services → DB)
- **Validation**: Three-tier (Availability → Stock → Quantity)
- **Error Handling**: Custom error classes with HTTP codes
- **CORS**: Enabled for all origins

### Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `wrangler` - Cloudflare CLI
- TypeScript for type safety

---

## 📊 Production Status

### Current Deployment

✅ **Environment**: Production  
✅ **URL**: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev  
✅ **MCP Endpoint**: /sse  
✅ **Database**: Cloudflare D1 (dcc0ae8b-aa76-4250-ad47-0780867c6e96)  
✅ **Records**: 100 products  
✅ **Uptime**: 99.9%+ (Cloudflare SLA)  
✅ **Latency**: <50ms globally (Edge computing)

### Monitoring

```bash
# View real-time logs
npx wrangler tail

# Check deployment status
npx wrangler deployments list
```

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👨‍💻 Support

- **Documentation**: Check `/docs` folder
- **Issues**: Open a GitHub issue
- **Questions**: Contact the development team

---



---

**Made by Barcos Osvaldo**

*Last Updated: January 2026*