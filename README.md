# 🤖 AI Shopping Agent

> Backend serverless para un asistente de compras con IA integrada. Desplegado en Cloudflare Workers con base de datos D1.

---

## 🌐 URLs

- **Frontend + Chat en vivo:** https://ai-shop-agent.mcp-osvaldo.workers.dev
- **API REST:** `https://ai-shop-agent.mcp-osvaldo.workers.dev`
- **MCP Endpoint:** `https://ai-shop-agent.mcp-osvaldo.workers.dev/sse`

---

## 🚀 Cómo correrlo localmente

### 1. Prerrequisitos

- Node.js 18+
- npm
- Una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/sign-up)
- Wrangler CLI instalado

### 2. Instalación

```bash
# Clonar el repositorio
git clone <tu-repo>
cd ai-shop-agent

# Instalar dependencias
npm install

# Loguearte en Cloudflare (necesario para usar Workers AI en local)
npx wrangler login
```

### 3. Crear la base de datos local

```bash
# Migrar el schema (tablas: products, carts, cart_items, sessions)
npm run db:migrate:local

# Cargar los 100 productos de moda de ejemplo
npx wrangler d1 execute ai-shop-db --local --file=./data/import-products.sql
```

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

El servidor corre en: **http://localhost:8787**

### 5. Probar que funcione

Abre tu navegador en:
- **Frontend:** http://localhost:8787/
- **Health check:** http://localhost:8787/health
- **Diagnósticos:** http://localhost:8787/diagnostics

---

## 📋 Endpoints disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Página principal con el chat |
| `/chat` | POST | Enviar mensaje al agente de IA |
| `/health` | GET | Estado del servicio |
| `/diagnostics` | GET | Verificar DB + IA |
| `/products` | GET | Listar productos (query: `?search=term`) |
| `/products/:id` | GET | Ver un producto |
| `/carts` | POST | Crear carrito |
| `/carts/:id` | GET | Ver carrito con items |
| `/carts/:id/items` | POST | Agregar item al carrito |
| `/carts/:id/items/:item` | PUT | Actualizar cantidad |
| `/carts/:id/items/:item` | DELETE | Eliminar item |

### Ejemplo de chat con curl

```bash
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hola, que productos tenes?"}'
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Runtime** | Cloudflare Workers (Edge Computing) |
| **Lenguaje** | TypeScript 5.3 |
| **IA** | Cloudflare Workers AI - Llama 3.1 8B Instruct |
| **Base de datos** | Cloudflare D1 (SQLite serverless) |
| **Protocolo AI** | MCP (Model Context Protocol) + Function Calling nativo |
| **Frontend** | HTML/CSS/JS embebido (sin frameworks) |
| **Deploy** | Wrangler CLI |

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Navegador     │  ← Widget de chat flotante
│   (Frontend)    │
└────────┬────────┘
         │ fetch POST /chat
┌────────▼────────┐
│ Cloudflare      │  ← Worker serverless
│ Worker          │
│ (TypeScript)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│  D1   │  │  AI   │  ← Binding nativo de Cloudflare
│ (DB)  │  │Modelo │
└───────┘  └───────┘
```

### Componentes internos

- **`src/agent/agent.ts`** — Agente de IA con loop de function-calling
- **`src/agent/tools.ts`** — Definición y ejecución de tools (listar productos, carrito, etc.)
- **`src/services/session.service.ts`** — Persiste `cart_id` por sesión en D1
- **`src/frontend.ts`** — HTML/CSS/JS del chat embebido como string
- **`src/db/schema.sql`** — Schema de la base de datos

---

## 🔌 ¿Qué es MCP?

**MCP (Model Context Protocol)** es un protocolo open-source creado por Anthropic que estandariza cómo un Agente de IA se comunica con herramientas externas.

En este proyecto se usa de dos formas:

1. **Function Calling nativo de Cloudflare AI** — El modelo Llama 3.1 recibe las tools disponibles y decide cuándo llamarlas directamente.
2. **Endpoint SSE `/sse`** — Implementación del protocolo MCP estándar para que clientes externos (como Claude Desktop) puedan conectarse.

---

## 🚀 Deploy a producción

```bash
# 1. Migrar schema a la base remota
npx wrangler d1 execute ai-shop-db --remote --file=./src/db/schema.sql

# 2. Cargar productos en la base remota
npx wrangler d1 execute ai-shop-db --remote --file=./data/import-products.sql

# 3. Deployar el Worker
npx wrangler deploy
```

Tu app quedará disponible en:
```
https://ai-shop-agent.TU-SUBDOMAIN.workers.dev
```

---

## 📁 Estructura del proyecto

```
├── src/
│   ├── index.ts              # Entry point del Worker
│   ├── frontend.ts           # HTML/CSS/JS del chat
│   ├── agent/
│   │   ├── agent.ts          # Lógica del agente de IA
│   │   └── tools.ts          # Tools para function-calling
│   ├── db/
│   │   ├── client.ts         # Wrapper de D1
│   │   └── schema.sql        # Schema de la base de datos
│   ├── routes/
│   │   ├── chat.ts           # POST /chat
│   │   ├── products.ts       # GET /products
│   │   ├── carts.ts          # POST/GET /carts
│   │   └── admin.ts          # Panel de admin
│   ├── services/
│   │   ├── product.service.ts
│   │   ├── cart.service.ts
│   │   └── session.service.ts
│   └── types/
│       └── index.ts
├── data/
│   └── import-products.sql   # 100 productos de moda
├── wrangler.toml             # Configuración de Cloudflare
└── package.json
```

---

## ⚙️ Configuración (`wrangler.toml`)

```toml
name = "ai-shop-agent"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ai-shop-db"
database_id = "tu-database-id"

[ai]
binding = "AI"
```

---

## 📝 Comandos útiles

```bash
# Desarrollo local
npm run dev

# Deploy a producción
npm run deploy

# Migrar base de datos local
npm run db:migrate:local

# Ver logs en tiempo real
npx wrangler tail

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## 🧪 Diagnóstico

Si algo no funciona, probá estos endpoints:

```bash
# Verificar que el Worker esté saludable
curl https://ai-shop-agent.mcp-osvaldo.workers.dev/health

# Verificar DB + IA
curl https://ai-shop-agent.mcp-osvaldo.workers.dev/diagnostics

# Probar chat directamente
curl -X POST https://ai-shop-agent.mcp-osvaldo.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hola"}'
```

---

## 📄 Licencia

MIT

---

**Hecho por Barcos Osvaldo**
