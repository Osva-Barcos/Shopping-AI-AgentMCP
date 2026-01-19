# 🤖 Guía de Integración con Agente de IA

Esta guía muestra cómo un Agente de IA conversacional usaría el MCP Backend.

---

## 💬 Flujo de Conversación Típico

### Escenario: Cliente compra productos por chat

```
┌─────────────────────────────────────────────────────────────┐
│  Cliente (Chatwoot)                                         │
└────────┬────────────────────────────────────────────────────┘
         │
         │ "Hola, quiero comprar una notebook"
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA (Laburen)                                     │
│                                                             │
│  🧠 Interpreta la intención                                 │
│  📡 Llama a: GET /products?search=notebook                  │
└────────┬────────────────────────────────────────────────────┘
         │
         │ API Response:
         │ [
         │   {
         │     "id": "prod_1",
         │     "name": "Notebook Lenovo IdeaPad 3",
         │     "price": 85000,
         │     "stock": 15
         │   }
         │ ]
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  "Tenemos disponible una Notebook Lenovo IdeaPad 3 a       │
│   $850. Cuenta con Intel Core i5, 8GB RAM y 256GB SSD.     │
│   Hay 15 unidades en stock. ¿Te gustaría agregarla?"       │
└────────┬────────────────────────────────────────────────────┘
         │
         │ "Sí, quiero 2"
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  🧠 Identifica que necesita crear un carrito                │
│  📡 Llama a: POST /carts                                    │
│                                                             │
│  ← Response: { "id": "cart_abc123" }                        │
│                                                             │
│  📡 Llama a: POST /carts/cart_abc123/prod_1                 │
│     Body: { "qty": 2 }                                      │
│                                                             │
│  ← Response: { "id": "item_xyz789", "qty": 2 }             │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  "¡Perfecto! Agregué 2 Notebooks a tu carrito.             │
│   Subtotal: $1,700                                          │
│   ¿Deseas agregar algo más?"                               │
└────────┬────────────────────────────────────────────────────┘
         │
         │ "Sí, un mouse"
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  📡 Llama a: GET /products?search=mouse                     │
│  📡 Llama a: POST /carts/cart_abc123/prod_2                 │
│     Body: { "qty": 1 }                                      │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  "Agregué el Mouse Logitech M185 ($25) a tu carrito.       │
│   Total actual: $1,725. ¿Listo para finalizar?"            │
└────────┬────────────────────────────────────────────────────┘
         │
         │ "¿Cuánto es el total?"
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  📡 Llama a: GET /carts/cart_abc123                         │
│                                                             │
│  ← Response:                                                │
│  {                                                          │
│    "items": [                                               │
│      {                                                      │
│        "product": {"name": "Notebook...", "price": 85000},  │
│        "qty": 2,                                            │
│        "subtotal": 170000                                   │
│      },                                                     │
│      {                                                      │
│        "product": {"name": "Mouse...", "price": 2500},      │
│        "qty": 1,                                            │
│        "subtotal": 2500                                     │
│      }                                                      │
│    ],                                                       │
│    "total": 172500                                          │
│  }                                                          │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Agente de IA                                               │
│                                                             │
│  "Tu carrito contiene:                                      │
│   • 2x Notebook Lenovo IdeaPad 3 - $1,700                   │
│   • 1x Mouse Logitech M185 - $25                            │
│                                                             │
│   💰 Total: $1,725"                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Endpoints usados en el flujo

| Paso | Acción del Agente | Endpoint | Método |
|------|-------------------|----------|--------|
| 1 | Buscar productos | `/products?search=notebook` | GET |
| 2 | Crear carrito | `/carts` | POST |
| 3 | Agregar producto | `/carts/{cart_id}/{product_id}` | POST |
| 4 | Buscar más productos | `/products?search=mouse` | GET |
| 5 | Agregar otro producto | `/carts/{cart_id}/{product_id}` | POST |
| 6 | Ver carrito completo | `/carts/{cart_id}` | GET |

---

## 🎯 Casos de Uso Avanzados

### 1. Cliente quiere cambiar cantidad

```
Cliente: "Quiero solo 1 notebook, no 2"

Agente:
  1. GET /carts/cart_abc123 (obtener items)
  2. PUT /carts/cart_abc123/items/item_xyz789
     Body: { "qty": 1 }
  3. Responde: "Actualicé la cantidad a 1. Nuevo total: $875"
```

---

### 2. Cliente quiere eliminar un producto

```
Cliente: "Quita el mouse"

Agente:
  1. GET /carts/cart_abc123 (identificar item_id del mouse)
  2. DELETE /carts/cart_abc123/items/item_def456
  3. Responde: "Eliminé el mouse. Total: $850"
```

---

### 3. Stock insuficiente

```
Cliente: "Quiero 100 notebooks"

Agente:
  1. POST /carts/cart_abc123/prod_1
     Body: { "qty": 100 }
  
  ← Error 409:
  {
    "success": false,
    "error": {
      "code": "CONFLICT",
      "message": "Stock insuficiente. Disponible: 15, solicitado: 100"
    }
  }

  2. Responde: "Lo siento, solo tenemos 15 notebooks disponibles. 
     ¿Te gustaría agregar esa cantidad?"
```

---

## 🔗 Integración con Chatwoot

### Asociar carrito a conversación

```typescript
// En el backend del Agente (fuera del MCP)
const conversation = {
  chatwoot_id: "123456",
  cart_id: "cart_abc123",
  customer_email: "cliente@example.com"
};

// Guardar en base de datos del agente
await db.conversations.create(conversation);
```

Luego el agente puede recuperar el `cart_id` asociado a la conversación de Chatwoot.

---

## 🧠 Prompt para el Agente de IA

```markdown
Eres un asistente de ventas. Tu objetivo es ayudar a los clientes a 
encontrar productos y completar sus compras.

Tienes acceso a los siguientes endpoints:

1. GET /products?search={query}
   - Busca productos por nombre o descripción

2. GET /products/{id}
   - Obtiene detalle de un producto específico

3. POST /carts
   - Crea un carrito nuevo (usar solo una vez por conversación)

4. POST /carts/{cart_id}/{product_id}
   - Agrega un producto al carrito
   - Body opcional: { "qty": number }

5. GET /carts/{cart_id}
   - Muestra el carrito completo con totales

6. PUT /carts/{cart_id}/items/{item_id}
   - Actualiza la cantidad de un producto
   - Body: { "qty": number }

7. DELETE /carts/{cart_id}/items/{item_id}
   - Elimina un producto del carrito

Reglas:
- Siempre valida stock antes de confirmar
- Si hay error 409 (stock insuficiente), ofrece la cantidad disponible
- Mantén el tono amigable y profesional
- Muestra precios en formato legible (ej: $1,500)
- Confirma cada acción con el cliente
```

---

## 📊 Métricas que el Agente puede trackear

```typescript
// Ejemplo de telemetría
{
  conversation_id: "conv_123",
  cart_id: "cart_abc123",
  actions: [
    { timestamp: "2026-01-19T10:30:00Z", action: "search_products", query: "notebook" },
    { timestamp: "2026-01-19T10:31:00Z", action: "create_cart" },
    { timestamp: "2026-01-19T10:32:00Z", action: "add_to_cart", product_id: "prod_1", qty: 2 },
    { timestamp: "2026-01-19T10:35:00Z", action: "view_cart" },
  ],
  total_value: 172500,
  status: "pending_checkout"
}
```

---

## 🚀 Próximos Pasos

- [ ] Agregar endpoint de checkout: `POST /carts/{cart_id}/checkout`
- [ ] Integrar con sistema de pagos
- [ ] Enviar notificaciones a Chatwoot cuando se crea una orden
- [ ] Tracking de conversiones

---

**El MCP está listo para ser consumido por cualquier Agente de IA 🤖**
