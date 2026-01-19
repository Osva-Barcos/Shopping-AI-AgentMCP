# MCP HTTP Backend - Laburen AI Agent

Backend simple y ejecutable para Agente de IA conversacional, desplegable en **Cloudflare Workers** con persistencia en **Cloudflare D1 (SQLite)**.

## 🚀 Stack Tecnológico

- **Runtime:** Cloudflare Workers
- **Lenguaje:** TypeScript
- **Base de datos:** Cloudflare D1 (SQLite)
- **Estilo API:** REST HTTP

## 📁 Estructura del Proyecto

```
src/
├── index.ts              # Entry point del Worker
├── routes/
│   ├── products.ts       # Rutas de productos
│   └── carts.ts          # Rutas de carritos
├── services/
│   ├── product.service.ts
│   └── cart.service.ts
├── db/
│   ├── client.ts         # Cliente D1
│   ├── schema.sql        # Schema de BD
│   └── seed.sql          # Datos de ejemplo
├── utils/
│   └── errors.ts         # Manejo de errores
└── types/
    └── index.ts          # Tipos TypeScript
```

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Crear base de datos D1
npm run db:create

# Copiar el database_id que te devuelve y pegarlo en wrangler.toml

# Ejecutar migraciones (schema)
npm run db:migrate

# Opcional: cargar datos de ejemplo
wrangler d1 execute laburen-ai-db --file=./src/db/seed.sql
```

## 🛠️ Desarrollo

```bash
# Modo desarrollo local
npm run dev

# Ver logs en tiempo real
npm run tail
```

## 🌐 Endpoints Disponibles

### **Productos**

#### `GET /products`
Lista todos los productos con filtro opcional

**Query params:**
- `search` (opcional): Busca en nombre o descripción

**Ejemplo:**
```bash
curl http://localhost:8787/products
curl http://localhost:8787/products?search=mouse
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_1",
      "name": "Notebook Lenovo IdeaPad 3",
      "description": "Intel Core i5, 8GB RAM, 256GB SSD",
      "price": 85000,
      "stock": 15
    }
  ]
}
```

---

#### `GET /products/:id`
Obtiene detalle de un producto

**Ejemplo:**
```bash
curl http://localhost:8787/products/prod_1
```

---

### **Carritos**

#### `POST /carts`
Crea un nuevo carrito

**Ejemplo:**
```bash
curl -X POST http://localhost:8787/carts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_lx9k8m3n4p2",
    "created_at": "2026-01-19T10:30:00.000Z",
    "updated_at": "2026-01-19T10:30:00.000Z"
  }
}
```

---

#### `GET /carts/:cart_id`
Obtiene un carrito con todos sus items

**Ejemplo:**
```bash
curl http://localhost:8787/carts/cart_lx9k8m3n4p2
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_lx9k8m3n4p2",
    "created_at": "2026-01-19T10:30:00.000Z",
    "updated_at": "2026-01-19T10:35:00.000Z",
    "items": [
      {
        "id": "item_abc123",
        "cart_id": "cart_lx9k8m3n4p2",
        "product_id": "prod_1",
        "qty": 2,
        "product": {
          "id": "prod_1",
          "name": "Notebook Lenovo IdeaPad 3",
          "price": 85000,
          "stock": 15
        },
        "subtotal": 170000
      }
    ],
    "total": 170000
  }
}
```

---

#### `POST /carts/:cart_id/:product_id`
Agrega un producto al carrito

**Body (opcional):**
```json
{
  "qty": 2
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:8787/carts/cart_lx9k8m3n4p2/prod_2 \
  -H "Content-Type: application/json" \
  -d '{"qty": 3}'
```

---

#### `PUT /carts/:cart_id/items/:item_id`
Actualiza la cantidad de un item

**Body:**
```json
{
  "qty": 5
}
```

**Ejemplo:**
```bash
curl -X PUT http://localhost:8787/carts/cart_lx9k8m3n4p2/items/item_abc123 \
  -H "Content-Type: application/json" \
  -d '{"qty": 5}'
```

---

#### `DELETE /carts/:cart_id/items/:item_id`
Elimina un item del carrito

**Ejemplo:**
```bash
curl -X DELETE http://localhost:8787/carts/cart_lx9k8m3n4p2/items/item_abc123
```

---

## 🚀 Deploy a Producción

```bash
# Migrar base de datos en producción
npm run db:migrate

# Deployar Worker
npm run deploy
```

---

## 🧠 Reglas de Negocio Implementadas

✅ Validación de stock al agregar productos  
✅ No permite agregar más cantidad que stock disponible  
✅ Si un producto ya está en el carrito, suma la cantidad  
✅ Errores claros y estructurados (400, 404, 409)  
✅ Timestamps automáticos en carritos  
✅ CORS habilitado para cualquier origen  

---

## 🔧 Configuración Adicional

### Base de datos local (para testing)

```bash
# Usar base de datos local
npm run db:migrate:local

# Consultar BD local
wrangler d1 execute laburen-ai-db --local --command "SELECT * FROM products"
```

---

## 📝 Notas Importantes

- Los precios están en **centavos** para evitar problemas con decimales
- Los IDs se generan con timestamp + random (suficiente para este caso)
- CORS está configurado para aceptar cualquier origen (ajustar en producción si es necesario)
- El código está preparado para ser consumido por un Agente de IA (MCP)

---

## 🎯 Próximos Pasos

1. Importar productos desde Excel
2. Integración con Chatwoot
3. Sistema de órdenes/compras
4. Notificaciones

---

**¿Problemas?** Revisar logs con `npm run tail`
