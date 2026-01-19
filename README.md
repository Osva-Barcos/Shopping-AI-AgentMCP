# 🤖 Laburen AI Agent MCP

**MCP HTTP Backend** para Agente de IA conversacional integrado con Chatwoot.

Backend simple, claro y ejecutable desplegable en **Cloudflare Workers** con persistencia de datos mediante **Cloudflare D1 (SQLite)**.

---

## 🎯 Objetivo

Proveer un backend REST HTTP para que un Agente de IA pueda:

- Consultar productos
- Gestionar carritos de compra
- Validar stock
- Agregar/modificar/eliminar items

Todo pensado para ser consumido por un Agente conversacional en la plataforma Laburen.

---

## 🚀 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Crear base de datos D1
npm run db:create

# 3. Copiar database_id en wrangler.toml

# 4. Ejecutar migraciones
npm run db:migrate

# 5. (Opcional) Cargar datos de ejemplo
wrangler d1 execute laburen-ai-db --file=./src/db/seed.sql

# 6. Desarrollo local
npm run dev
```

---

## 📚 Documentación Completa

Ver [SETUP.md](./SETUP.md) para:

- Estructura del proyecto
- Endpoints disponibles
- Ejemplos de uso
- Deploy a producción
- Troubleshooting

---

## 🏗️ Stack Tecnológico

- **Runtime:** Cloudflare Workers
- **Lenguaje:** TypeScript
- **Base de datos:** Cloudflare D1 (SQLite)
- **API:** REST HTTP (no GraphQL)

---

## 🌐 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/products` | Lista productos (con filtro opcional) |
| `GET` | `/products/:id` | Detalle de producto |
| `POST` | `/carts` | Crear carrito |
| `GET` | `/carts/:cart_id` | Obtener carrito con items |
| `POST` | `/carts/:cart_id/:product_id` | Agregar producto |
| `PUT` | `/carts/:cart_id/items/:item_id` | Actualizar cantidad |
| `DELETE` | `/carts/:cart_id/items/:item_id` | Eliminar item |

---

## 📦 Scripts Disponibles

```bash
npm run dev              # Desarrollo local
npm run deploy           # Deploy a producción
npm run db:create        # Crear BD D1
npm run db:migrate       # Ejecutar migraciones
npm run db:migrate:local # Migraciones en local
npm run tail             # Ver logs en tiempo real
```

---

## 🧠 Características

✅ Código TypeScript limpio y tipado  
✅ Arquitectura por capas (Routes → Services → DB)  
✅ Validación de stock  
✅ Manejo de errores estructurado  
✅ CORS habilitado  
✅ Preparado para consumo por IA (MCP)  

---

## 📝 Próximos Pasos

- [ ] Importar productos desde Excel
- [ ] Integración con Chatwoot
- [ ] Sistema de órdenes/compras
- [ ] Autenticación (si necesaria)

---

## 📄 Licencia

MIT

