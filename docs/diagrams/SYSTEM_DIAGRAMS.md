# 📊 Diagramas del Sistema

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LABUREN AI AGENT MCP                             │
│                                                                         │
│  ┌───────────────────┐                    ┌──────────────────────┐    │
│  │   CHATWOOT CRM    │◄───────────────────┤   AGENTE DE IA      │    │
│  │   (Frontend)      │                    │   (Laburen)          │    │
│  └───────────────────┘                    └──────────┬───────────┘    │
│                                                       │                 │
│                                                       │ HTTP/REST       │
│                                                       │                 │
│                          ┌────────────────────────────▼────────────┐   │
│                          │   CLOUDFLARE WORKER (MCP Backend)       │   │
│                          │                                         │   │
│                          │  ┌────────────────────────────────┐    │   │
│                          │  │   index.ts (Router)            │    │   │
│                          │  └──────────┬──────────┬──────────┘    │   │
│                          │             │          │               │   │
│                          │   ┌─────────▼─┐    ┌──▼─────────┐     │   │
│                          │   │ Products  │    │   Carts    │     │   │
│                          │   │  Routes   │    │   Routes   │     │   │
│                          │   └─────┬─────┘    └──┬─────────┘     │   │
│                          │         │             │               │   │
│                          │   ┌─────▼─────┐    ┌─▼──────────┐    │   │
│                          │   │ Product   │    │   Cart     │    │   │
│                          │   │  Service  │    │  Service   │    │   │
│                          │   └─────┬─────┘    └─┬──────────┘    │   │
│                          │         │             │               │   │
│                          │         └──────┬──────┘               │   │
│                          │                │                      │   │
│                          │         ┌──────▼──────┐               │   │
│                          │         │  DbClient   │               │   │
│                          │         └──────┬──────┘               │   │
│                          └────────────────┼──────────────────────┘   │
│                                           │                           │
│                          ┌────────────────▼──────────────┐           │
│                          │   CLOUDFLARE D1 (SQLite)      │           │
│                          │                               │           │
│                          │  ┌──────────┐  ┌──────────┐  │           │
│                          │  │ products │  │  carts   │  │           │
│                          │  └──────────┘  └──────────┘  │           │
│                          │  ┌──────────────────────┐    │           │
│                          │  │     cart_items       │    │           │
│                          │  └──────────────────────┘    │           │
│                          └─────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Flujo de Request: Agregar Producto al Carrito

```
Cliente (Chatwoot)
     │
     │ "Quiero 2 notebooks"
     ▼
┌────────────────────────────────────────┐
│ Agente de IA (Laburen)                 │
│                                        │
│ 🧠 Interpreta → buscar "notebook"     │
│ 📡 GET /products?search=notebook       │
└──────────┬─────────────────────────────┘
           │
           │ HTTP Request
           ▼
┌─────────────────────────────────────────────────┐
│ Cloudflare Worker (index.ts)                   │
│                                                 │
│ 1. Parse URL → /products?search=notebook       │
│ 2. Route → ProductRoutes.listProducts()        │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ ProductRoutes                                   │
│                                                 │
│ 1. Extract query param: "notebook"             │
│ 2. Call → productService.listProducts(search)  │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ ProductService                                  │
│                                                 │
│ 1. Build query: SELECT * FROM products WHERE   │
│    name LIKE '%notebook%'                      │
│ 2. Call → db.all(query)                        │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ DbClient                                        │
│                                                 │
│ 1. Execute query on D1                         │
│ 2. Return results                              │
└────────┬────────────────────────────────────────┘
         │
         │ [{ id: "prod_1", name: "Notebook...", price: 85000 }]
         ▼
┌─────────────────────────────────────────────────┐
│ ProductService → ProductRoutes → index.ts       │
│                                                 │
│ Wrap in ApiResponse { success: true, data: ... }│
└────────┬────────────────────────────────────────┘
         │
         │ HTTP 200 + JSON
         ▼
┌────────────────────────────────────────┐
│ Agente de IA                           │
│                                        │
│ 🧠 Procesa respuesta                   │
│ 💬 "Tenemos Notebook Lenovo a $850"   │
│                                        │
│ Cliente: "Sí, quiero 2"                │
│                                        │
│ 📡 POST /carts (crear carrito)         │
│ 📡 POST /carts/cart_123/prod_1         │
│    Body: { "qty": 2 }                  │
└────────┬───────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ Cloudflare Worker → CartRoutes                  │
│                                                 │
│ 1. Parse params: cart_id, product_id           │
│ 2. Parse body: { qty: 2 }                      │
│ 3. Call → cartService.addProductToCart()       │
└────────┬────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ CartService                                     │
│                                                 │
│ 1. Validate cart exists                        │
│ 2. Validate product exists                     │
│ 3. Validate stock (15 >= 2) ✅                 │
│ 4. Check if product already in cart → No       │
│ 5. INSERT INTO cart_items (...)                │
│ 6. UPDATE carts SET updated_at = NOW()         │
└────────┬────────────────────────────────────────┘
         │
         │ { id: "item_xyz", cart_id: "cart_123", qty: 2 }
         ▼
┌────────────────────────────────────────┐
│ Agente de IA                           │
│                                        │
│ 💬 "Agregué 2 notebooks a tu carrito.  │
│    Subtotal: $1,700"                   │
└────────────────────────────────────────┘
```

---

## 3. Modelo de Datos (Relaciones)

```
┌─────────────────────────┐
│       products          │
│─────────────────────────│
│ id (PK)                 │◄────────┐
│ name                    │         │
│ description             │         │
│ price                   │         │
│ stock                   │         │
└─────────────────────────┘         │
                                    │
                                    │ FK: product_id
                                    │
┌─────────────────────────┐         │
│         carts           │         │
│─────────────────────────│         │
│ id (PK)                 │◄──┐     │
│ created_at              │   │     │
│ updated_at              │   │     │
└─────────────────────────┘   │     │
                              │     │
                              │     │
            FK: cart_id       │     │
                              │     │
                    ┌─────────────────────────┐
                    │      cart_items         │
                    │─────────────────────────│
                    │ id (PK)                 │
                    │ cart_id (FK) ───────────┘
                    │ product_id (FK) ────────┘
                    │ qty                     │
                    └─────────────────────────┘
```

**Relaciones:**
- Un `cart` tiene muchos `cart_items` (1:N)
- Un `product` puede estar en muchos `cart_items` (1:N)
- Un `cart_item` pertenece a un `cart` y a un `product` (N:1)

---

## 4. Ciclo de Vida de un Carrito

```
┌──────────────┐
│   CREATED    │  ← POST /carts
└──────┬───────┘
       │
       │ POST /carts/{id}/{product_id}
       ▼
┌──────────────┐
│  IN_PROGRESS │  ← Agregar/modificar items
└──────┬───────┘
       │
       │ POST /carts/{id}/checkout (Fase 2)
       ▼
┌──────────────┐
│  COMPLETED   │  → Se convierte en ORDER
└──────────────┘
```

---

## 5. Stack Tecnológico

```
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  Chatwoot    │         │  Web/Mobile  │            │
│  │    (CRM)     │         │    Client    │            │
│  └──────────────┘         └──────────────┘            │
└───────────────────┬────────────────────────────────────┘
                    │
                    │ HTTP/REST
                    │
┌───────────────────▼────────────────────────────────────┐
│                   CLOUDFLARE EDGE                      │
│  ┌──────────────────────────────────────────────┐     │
│  │         Cloudflare Workers (V8)              │     │
│  │                                              │     │
│  │  ┌────────────────────────────────────┐     │     │
│  │  │  TypeScript + Wrangler            │     │     │
│  │  │  (No Node.js, No Express)         │     │     │
│  │  └────────────────────────────────────┘     │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │         Cloudflare D1 (SQLite)               │     │
│  │                                              │     │
│  │  - Serverless                                │     │
│  │  - Global replication                        │     │
│  │  - SQL queries                               │     │
│  └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘
```

**Ventajas:**
- 🚀 Ultra rápido (edge computing)
- 💰 Económico (pay-per-use)
- 🌍 Global (distribución automática)
- 🔧 Zero config (no servidores)

---

## 6. API Response Structure

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "prod_1",
    "name": "Notebook Lenovo",
    "price": 85000,
    "stock": 15
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Producto con ID prod_999 no encontrado"
  }
}
```

**Códigos de Error:**
- `400` - VALIDATION_ERROR (datos inválidos)
- `404` - NOT_FOUND (recurso no existe)
- `409` - CONFLICT (stock insuficiente)
- `500` - INTERNAL_ERROR (error del servidor)

---

## 7. Deployment Pipeline

```
┌─────────────────┐
│  Local Dev      │
│  npm run dev    │
└────────┬────────┘
         │
         │ Test endpoints
         │
         ▼
┌─────────────────┐
│  Validate       │
│  npm run deploy │
└────────┬────────┘
         │
         │ wrangler deploy
         │
         ▼
┌──────────────────────────────────────┐
│   Cloudflare Edge (300+ locations)   │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Worker deployed globally      │ │
│  └────────────────────────────────┘ │
│                                      │
│  URL: https://your-worker.dev       │
└──────────────────────────────────────┘
```

---

**Diagramas actualizados - Enero 2026 📊**
