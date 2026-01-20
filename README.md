# 🛍️ Laburen AI Agent MCP - E-commerce Backend

**REST API Backend** for AI conversational agents with product catalog and shopping cart management.

Deployed on **Cloudflare Workers** with **D1 (SQLite)** database persistence.

🌐 **Live Production URL:** https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev

---

## 🎯 Overview

This MCP (Model Context Protocol) HTTP backend provides a complete e-commerce API designed for AI agent consumption. It manages:

- 📦 **100 clothing products** with stock and availability control
- 🛒 **Shopping cart management** with real-time validation
- ✅ **Stock validation** - prevents overselling
- 🚫 **Availability control** - blocks unavailable products from sale
- 📊 **Admin panel** - visual product dashboard

Built for integration with AI conversational platforms like Chatwoot.

---

## 🏗️ Tech Stack

- **Runtime:** Cloudflare Workers (serverless)
- **Language:** TypeScript (strict mode)
- **Database:** Cloudflare D1 (SQLite)
- **API Style:** REST HTTP
- **Architecture:** Layered (Routes → Services → DB Client)

---

## 🚀 Quick Start

### Development

```bash
# 1. Install dependencies
npm install

# 2. Start local dev server
npm run dev

# Server runs at http://localhost:8787
```

### Production Deployment

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# Your API will be live at:
# https://laburen-ai-agent-mcp.YOUR-SUBDOMAIN.workers.dev
```

---

## 🌐 API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products` | List all products (ordered by ID) |
| `GET` | `/products?search=term` | Search products by name or description |
| `GET` | `/products/:id` | Get specific product details |

### Shopping Carts

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/carts` | Create new cart | - |
| `GET` | `/carts/:cart_id` | Get cart with items and total | - |
| `POST` | `/carts/:cart_id/items` | Add product to cart | `{product_id, qty}` |
| `PUT` | `/carts/:cart_id/items/:item_id` | Update item quantity | `{qty}` |
| `DELETE` | `/carts/:cart_id/items/:item_id` | Remove item from cart | - |

### Admin Panel

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin` | Visual product dashboard with search |

---

## 📊 Database Schema

### Products Table

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,          -- Product ID (0001-0100)
  name TEXT NOT NULL,           -- Product name
  description TEXT,             -- Full description
  price INTEGER NOT NULL,       -- Price in cents (centavos)
  stock INTEGER DEFAULT 0,      -- Available units
  available TEXT DEFAULT 'Yes'  -- 'Yes' or 'No'
);
```

### Carts & Cart Items

```sql
CREATE TABLE carts (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT REFERENCES carts(id),
  product_id TEXT REFERENCES products(id),
  qty INTEGER DEFAULT 1
);
```

---

## 🛡️ Validation Rules

When adding products to cart, the system validates:

1. ✅ **Product exists** - Returns 404 if not found
2. ✅ **Availability** - Rejects products with `available='No'`
3. ✅ **Stock > 0** - Prevents adding out-of-stock items
4. ✅ **Sufficient stock** - Validates requested quantity ≤ available stock

**Error Response Example:**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Product not available. \"Falda Blanco Talla XL\" is not available for sale."
  }
}
```

---

## 📦 Product Data

- **Total Products:** 100 clothing items
- **Categories:** Pantalón, Camiseta, Falda, Sudadera, Camisa
- **Sizes:** S, M, L, XL, XXL
- **Colors:** Blanco, Negro, Azul, Rojo, Verde, Gris
- **Data Source:** CSV import from Excel with UTF-8 encoding

### Import Products from CSV

```bash
# 1. Convert CSV to SQL
node scripts/convert-csv-to-sql.js

# 2. Import to production database
npx wrangler d1 execute laburen-ai-db --remote --file=import-products.sql
```

---

## 🔧 Configuration

### wrangler.toml

```toml
name = "laburen-ai-agent-mcp"
main = "src/index.ts"
compatibility_date = "2024-01-19"
node_compat = true

[[d1_databases]]
binding = "DB"
database_name = "laburen-ai-db"
database_id = "dcc0ae8b-aa76-4250-ad47-0780867c6e96"
```

---

## 💻 Usage Examples

### List Products

```bash
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/products
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "0001",
      "name": "Pantalón Verde Talla XXL",
      "description": "Ideal para uso diario. - Categoría: Deportivo. Precios: 50u=$1058, 100u=$1182, 200u=$462",
      "price": 105800,
      "stock": 177,
      "available": "Yes"
    }
  ]
}
```

### Create Cart and Add Product

```bash
# 1. Create cart
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts

# Response: {"success":true,"data":{"id":"cart_abc123",...}}

# 2. Add product
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/carts/cart_abc123/items \
  -H "Content-Type: application/json" \
  -d '{"product_id":"0001","qty":5}'
```

---

## 📁 Project Structure

```
laburen-ai-agent-mcp/
├── src/
│   ├── index.ts              # Main worker entry point
│   ├── types/                # TypeScript interfaces
│   ├── db/
│   │   ├── client.ts         # D1 database client
│   │   └── schema.sql        # Database schema
│   ├── routes/
│   │   ├── products.ts       # Product endpoints
│   │   ├── carts.ts          # Cart endpoints
│   │   └── admin.ts          # Admin panel HTML
│   ├── services/
│   │   ├── product.service.ts
│   │   └── cart.service.ts
│   └── utils/
│       └── errors.ts         # Error handling
├── scripts/
│   └── convert-csv-to-sql.js # CSV to SQL converter
├── products-utf8.csv         # Product source data
├── import-products.sql       # Generated SQL inserts
└── wrangler.toml             # Cloudflare config
```

---

## 🎨 Admin Panel

Access the visual admin dashboard at:

**https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/admin**

Features:
- 📊 Product statistics (total products, stock, inventory value)
- 🔍 Real-time search
- 📦 Stock indicators (high/medium/low/out)
- 🎨 Clean, responsive UI

---

## ✅ Features Completed

- ✅ Full REST API with 8 endpoints
- ✅ Product catalog with 100 items
- ✅ Shopping cart CRUD operations
- ✅ Three-tier validation (availability, stock, quantity)
- ✅ Admin panel with search and stats
- ✅ CSV import pipeline with UTF-8 encoding
- ✅ Production deployment on Cloudflare Workers
- ✅ CORS enabled for cross-origin requests
- ✅ Standardized English field names

---

## 🚀 Deployment Status

**Environment:** Production  
**Status:** ✅ Live  
**URL:** https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev  
**Database:** Cloudflare D1 (dcc0ae8b-aa76-4250-ad47-0780867c6e96)  
**Records:** 100 products imported

---

## 📝 License

MIT

---

## 👨‍💻 Development

**Author:** Laburen AI Team  
**Created:** January 2026  
**Purpose:** MCP Backend for AI Conversational Agents

