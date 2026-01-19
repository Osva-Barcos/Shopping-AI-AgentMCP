# 📋 Roadmap y Tareas Pendientes

## ✅ Fase 1: MCP Backend Base (COMPLETADO)

- [x] Estructura del proyecto
- [x] Schema de base de datos (D1)
- [x] Endpoints de productos
- [x] Endpoints de carritos
- [x] Validación de stock
- [x] Manejo de errores
- [x] Documentación completa
- [x] Scripts de deployment

---

## 🔄 Fase 2: Importación de Datos (PRÓXIMO)

### Objetivo
Permitir la carga masiva de productos desde archivos Excel/CSV.

### Tareas
- [ ] Crear endpoint `POST /admin/products/import`
- [ ] Parser de archivos Excel (usar librería como `xlsx`)
- [ ] Validación de datos antes de insertar
- [ ] Respuesta con resumen (exitosos, errores)
- [ ] Manejo de productos duplicados (actualizar o skip)

### Entregables
- `src/routes/admin.ts`
- `src/services/import.service.ts`
- `docs/IMPORT_PRODUCTS.md`

---

## 🔄 Fase 3: Sistema de Órdenes (PENDIENTE)

### Objetivo
Convertir carritos en órdenes de compra confirmadas.

### Schema de BD
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  cart_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  total INTEGER,
  status TEXT, -- pending, confirmed, shipped, delivered
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  product_id TEXT,
  qty INTEGER,
  price_at_purchase INTEGER, -- Precio en el momento de compra
  subtotal INTEGER
);
```

### Endpoints
- `POST /carts/{cart_id}/checkout`
- `GET /orders/{order_id}`
- `PUT /orders/{order_id}/status`

### Tareas
- [ ] Implementar schema de orders
- [ ] Service de checkout
- [ ] Reducir stock al confirmar orden
- [ ] Endpoints de órdenes
- [ ] Validaciones de stock al checkout

---

## 🔄 Fase 4: Integración con Chatwoot (PENDIENTE)

### Objetivo
Conectar carritos/órdenes con conversaciones de Chatwoot.

### Schema de BD
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  chatwoot_conversation_id TEXT UNIQUE,
  cart_id TEXT,
  customer_email TEXT,
  created_at DATETIME
);
```

### Endpoints
- `POST /conversations` (crear o recuperar conversación)
- `GET /conversations/{chatwoot_id}`

### Tareas
- [ ] Implementar schema de conversations
- [ ] Endpoint para vincular conversación con carrito
- [ ] Webhook para notificar a Chatwoot cuando se crea una orden
- [ ] Documentación de integración

---

## 🔄 Fase 5: Autenticación (OPCIONAL)

### Objetivo
Proteger endpoints administrativos.

### Opciones
1. **API Key simple** (más fácil)
2. **JWT tokens** (más robusto)
3. **Cloudflare Access** (nativo)

### Tareas
- [ ] Decidir método de autenticación
- [ ] Implementar middleware de auth
- [ ] Proteger endpoints `/admin/*`
- [ ] Documentar proceso de autenticación

---

## 🔄 Fase 6: Optimizaciones y Mejoras (FUTURO)

### Performance
- [ ] Implementar caché para productos (KV Storage)
- [ ] Índices adicionales en BD
- [ ] Paginación en listado de productos

### Funcionalidades
- [ ] Categorías de productos
- [ ] Imágenes de productos (R2 Storage)
- [ ] Descuentos y cupones
- [ ] Historial de precios

### Monitoreo
- [ ] Logging estructurado
- [ ] Métricas de uso (Analytics)
- [ ] Alertas de errores (Sentry o similar)

---

## 🎯 Prioridad de Próximas Tareas

### Alta Prioridad
1. **Importar productos desde Excel** (necesario para tener catálogo)
2. **Sistema de órdenes** (completar flujo de compra)
3. **Integración con Chatwoot** (core del negocio)

### Media Prioridad
4. **Autenticación** (seguridad)
5. **Webhooks de notificación** (automatización)

### Baja Prioridad
6. **Optimizaciones de performance**
7. **Funcionalidades avanzadas** (categorías, imágenes, etc.)

---

## 📝 Notas de Implementación

### Convenciones
- Siempre escribir tests para nuevos endpoints
- Documentar en SETUP.md los nuevos endpoints
- Actualizar examples.http con casos de uso
- Mantener la estructura de carpetas clara

### Antes de cada PR
- [ ] Código compila sin errores
- [ ] Endpoints testeados manualmente
- [ ] Documentación actualizada
- [ ] No hay credenciales hardcodeadas

---

## 🔮 Ideas Futuras

### Integración con IA
- Análisis de sentimiento en conversaciones
- Recomendaciones personalizadas de productos
- Respuestas automáticas basadas en contexto

### Analytics
- Dashboard de métricas de ventas
- Productos más vendidos
- Tasa de conversión por agente

### Multi-tenant
- Soporte para múltiples tiendas
- Configuración por tenant
- Aislamiento de datos

---

**Mantener este archivo actualizado con el progreso 📊**
