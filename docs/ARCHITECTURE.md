# 🏗️ Arquitectura del Sistema

## Diagrama General

```
┌─────────────────────────────────────────────────────┐
│         Agente de IA Conversacional                 │
│            (Laburen + Chatwoot)                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ HTTP Requests (REST)
                  │
┌─────────────────▼───────────────────────────────────┐
│         Cloudflare Worker (MCP Backend)             │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │            index.ts (Router)               │    │
│  └──────────┬────────────────┬────────────────┘    │
│             │                │                      │
│    ┌────────▼───────┐  ┌────▼──────────┐          │
│    │  ProductRoutes │  │  CartRoutes   │          │
│    └────────┬───────┘  └────┬──────────┘          │
│             │                │                      │
│    ┌────────▼───────┐  ┌────▼──────────┐          │
│    │ ProductService │  │  CartService  │          │
│    └────────┬───────┘  └────┬──────────┘          │
│             │                │                      │
│             └────────┬───────┘                      │
│                      │                              │
│              ┌───────▼────────┐                     │
│              │   DbClient     │                     │
│              └───────┬────────┘                     │
└──────────────────────┼──────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   Cloudflare D1 (SQLite)   │
         │                            │
         │  ┌──────────────────────┐  │
         │  │  products            │  │
         │  │  carts               │  │
         │  │  cart_items          │  │
         │  └──────────────────────┘  │
         └────────────────────────────┘
```

---

## 🧱 Capas de la Arquitectura

### 1. **Capa de Routing** (`index.ts`)

**Responsabilidad:** Recibir requests HTTP, parsear rutas y delegar a routers específicos.

**Funciones:**
- Manejo de CORS
- Health check
- Routing principal
- Manejo de errores globales

**Archivo:** [src/index.ts](../src/index.ts)

---

### 2. **Capa de Routes** (`routes/`)

**Responsabilidad:** Definir endpoints, parsear parámetros y validar requests.

**Archivos:**
- [src/routes/products.ts](../src/routes/products.ts)
- [src/routes/carts.ts](../src/routes/carts.ts)

**Ejemplo:**
```typescript
// routes/products.ts
GET /products?search=...      → productService.listProducts()
GET /products/:id             → productService.getProductById()
```

---

### 3. **Capa de Services** (`services/`)

**Responsabilidad:** Lógica de negocio, validaciones y orquestación.

**Archivos:**
- [src/services/product.service.ts](../src/services/product.service.ts)
- [src/services/cart.service.ts](../src/services/cart.service.ts)

**Reglas de negocio implementadas:**
- ✅ Validación de stock
- ✅ No permitir agregar más cantidad que stock disponible
- ✅ Si un producto ya está en el carrito, sumar cantidad
- ✅ Actualizar timestamps automáticamente

---

### 4. **Capa de Acceso a Datos** (`db/`)

**Responsabilidad:** Abstraer queries a base de datos.

**Archivo:** [src/db/client.ts](../src/db/client.ts)

**Métodos principales:**
```typescript
db.get<T>(query, ...params)     // Una fila
db.all<T>(query, ...params)     // Múltiples filas
db.run(query, ...params)        // INSERT/UPDATE/DELETE
db.batch(statements)            // Transacciones
```

---

### 5. **Capa de Utilidades** (`utils/` y `types/`)

**Responsabilidad:** Helpers, tipos y manejo de errores.

**Archivos:**
- [src/utils/errors.ts](../src/utils/errors.ts)
- [src/types/index.ts](../src/types/index.ts)

**Clases de error:**
```typescript
NotFoundError      → 404
ValidationError    → 400
ConflictError      → 409
AppError           → Custom
```

---

## 🗄️ Modelo de Datos

### Entidades

```sql
products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,  -- En centavos
  stock       INTEGER NOT NULL
)

carts (
  id          TEXT PRIMARY KEY,
  created_at  DATETIME,
  updated_at  DATETIME
)

cart_items (
  id          TEXT PRIMARY KEY,
  cart_id     TEXT → carts(id),
  product_id  TEXT → products(id),
  qty         INTEGER NOT NULL
)
```

### Relaciones

```
Cart (1) ─────< (N) CartItem
                      │
                      │ (N) ────> (1) Product
```

---

## 🔄 Flujo de una Request

### Ejemplo: `POST /carts/{cart_id}/{product_id}`

```
1. index.ts recibe la request
   ↓
2. Parsea la ruta → pathSegments = ['carts', 'cart_123', 'prod_1']
   ↓
3. Delega a CartRoutes.handleRequest()
   ↓
4. CartRoutes identifica el método y llama a addProductToCart()
   ↓
5. CartRoutes parsea el body { qty: 2 }
   ↓
6. Llama a CartService.addProductToCart(cartId, productId, qty)
   ↓
7. CartService valida:
   - ¿Existe el carrito?
   - ¿Existe el producto?
   - ¿Hay stock suficiente?
   ↓
8. Si todo OK, CartService inserta en cart_items (o actualiza qty)
   ↓
9. CartService actualiza updated_at del carrito
   ↓
10. Retorna el CartItem creado
    ↓
11. CartRoutes envuelve en ApiResponse y retorna JSON
    ↓
12. index.ts agrega headers CORS y envía la respuesta
```

---

## 🚀 Ventajas de esta Arquitectura

### ✅ **Separación de responsabilidades**
Cada capa tiene un propósito claro.

### ✅ **Fácil de testear**
Los services pueden ser testeados de forma aislada.

### ✅ **Escalable**
Agregar nuevos endpoints es simple: nuevo route + nuevo service.

### ✅ **TypeScript tipado**
Menos errores en runtime.

### ✅ **Cloudflare Workers compatible**
Sin uso de frameworks pesados.

---

## 🔮 Próximas Extensiones

### Sistema de Órdenes

```
orders (
  id, cart_id, user_id, total, status, created_at
)
```

### Integración con Chatwoot

```
conversations (
  id, chatwoot_conversation_id, cart_id, created_at
)
```

### Autenticación

```
users (
  id, email, name, created_at
)
```

---

## 📚 Referencias

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Diseño modular, simple y ejecutable 🚀**
