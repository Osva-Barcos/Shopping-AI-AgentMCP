# 🔧 Troubleshooting: Agente no responde después del primer mensaje (Chatwoot + WhatsApp)

## 🚨 Síntoma

- ✅ El agente funciona perfectamente en el **Dashboard de Laburen**
- ✅ El agente responde el **primer mensaje** (saludo) en WhatsApp/Chatwoot
- ❌ El agente **NO responde el segundo mensaje** (cuando necesita usar herramientas MCP)
- ⚠️ Error en consola: `[Sentry] Session missing organizationId for user`

## 🔍 Diagnóstico

### Causa raíz identificada

El problema **NO está en el código del MCP** sino en cómo se mantiene la **conexión SSE** entre:

```
WhatsApp → Chatwoot → Laburen Dashboard → MCP Server (SSE)
```

### ¿Por qué funciona el primer mensaje pero no el segundo?

1. **Primer mensaje (saludo)**:
   - No requiere herramientas MCP
   - El agente responde con texto hardcodeado
   - ✅ No hay llamadas a `/sse` necesarias

2. **Segundo mensaje ("mostrame pantalones")**:
   - Requiere llamar a `list_products` vía MCP
   - Necesita que la conexión SSE esté activa
   - ❌ La conexión SSE se cerró o no está accesible desde Chatwoot

### ¿Por qué se cierra la conexión SSE?

**Problema 1: Timeout de keep-alive**
```typescript
// En sse-handler.ts línea 254
const pingInterval = setInterval(() => {
  try {
    send('ping', { timestamp: new Date().toISOString() });
  } catch {
    clearInterval(pingInterval);
  }
}, 30000); // 30 segundos
```

**Posibles causas:**
- Chatwoot tiene un timeout más agresivo (<30s)
- WhatsApp cierra conexiones idle
- Cloudflare Workers tiene límite de duración de conexión

**Problema 2: ReadableStream se cierra prematuramente**
- El `ReadableStream` de SSE mantiene la conexión abierta
- Si el cliente (Laburen dashboard vía Chatwoot) no mantiene la conexión, se cierra
- Cuando llega el segundo mensaje, no hay stream activo

**Problema 3: Missing organizationId**
- El error de Sentry indica que el usuario no tiene `organizationId`
- Si Laburen filtra las herramientas MCP por organización, esto causa que el request falle
- El agente no recibe respuesta del MCP y se queda esperando

---

## ✅ Solución 1: Reducir intervalo de keep-alive (RÁPIDO)

Cambiar el ping de 30s a 10s para evitar timeouts:

**Archivo:** `src/mcp/sse-handler.ts` línea 254

```typescript
// ANTES:
const pingInterval = setInterval(() => {
  try {
    send('ping', { timestamp: new Date().toISOString() });
  } catch {
    clearInterval(pingInterval);
  }
}, 30000); // ← 30 segundos

// DESPUÉS:
const pingInterval = setInterval(() => {
  try {
    send('ping', { timestamp: new Date().toISOString() });
  } catch {
    clearInterval(pingInterval);
  }
}, 10000); // ← 10 segundos
```

**Ventajas:**
- ✅ Fácil de implementar (1 cambio)
- ✅ Mantiene la conexión SSE activa más tiempo
- ✅ No rompe nada existente

**Desventajas:**
- ⚠️ Puede no resolver el problema si el issue está en Chatwoot/WhatsApp
- ⚠️ Aumenta tráfico de red (más pings)

---

## ✅ Solución 2: Modo "Stateless" - Recrear conexión SSE en cada mensaje (RECOMENDADO)

En lugar de mantener una conexión SSE persistente, **crear y cerrar la conexión en cada interacción del agente**.

### Cambio arquitectónico:

**Flujo actual (problemático):**
```
1. Usuario conecta → Se abre SSE
2. Usuario envía mensaje 1 → Agente responde (SSE activo)
3. [30 segundos pasan] → SSE se cierra
4. Usuario envía mensaje 2 → ❌ SSE ya no está, falla
```

**Flujo propuesto (robusto):**
```
1. Usuario envía mensaje → Abre SSE, llama tools, cierra SSE
2. Usuario envía mensaje → Abre SSE, llama tools, cierra SSE
3. Usuario envía mensaje → Abre SSE, llama tools, cierra SSE
```

### Implementación:

**Nueva opción: Endpoint REST directo sin SSE**

Ya existe en `http-server.ts` línea 98:

```typescript
// POST /api/tools/call
if (req.url === '/api/tools/call' && req.method === 'POST') {
  // ... código existente ...
  // Llama directamente a las herramientas sin SSE
}
```

**Configuración en Laburen Dashboard:**

Cambiar la URL del MCP de:
```
https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
```

A:
```
https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call
```

**Ventajas:**
- ✅ No requiere conexión persistente
- ✅ Funciona con Chatwoot/WhatsApp sin problemas
- ✅ Más robusto ante timeouts

**Desventajas:**
- ⚠️ Requiere cambiar configuración en Laburen
- ⚠️ Pierde streaming real-time (pero WhatsApp no lo soporta igual)

---

## ✅ Solución 3: Verificar organizationId antes de llamar MCP

El error `Session missing organizationId` sugiere que el agente no puede acceder a los productos porque el usuario no tiene organización asignada.

### Paso 1: Verificar en base de datos

Conectarse a la base de datos de Laburen y verificar:

```sql
-- Buscar el usuario problemático
SELECT id, email, organization_id 
FROM users 
WHERE id = 'cmkn0zpsl0ti9oxqcmr0g5p1u';

-- Si organization_id es NULL, asignar uno
UPDATE users 
SET organization_id = 'ORG_ID_VALIDO' 
WHERE id = 'cmkn0zpsl0ti9oxqcmr0g5p1u';
```

### Paso 2: Agregar organizationId al MCP request

Si Laburen filtra datos por organización, el MCP necesita recibir ese parámetro:

**Archivo:** `src/mcp/sse-handler.ts`

Agregar `organizationId` a las queries de productos:

```typescript
case 'list_products': {
  const organizationId = args.organization_id || args.organizationId;
  
  if (!organizationId) {
    throw new Error('Missing organizationId. El usuario debe pertenecer a una organización.');
  }
  
  // Filtrar productos por organización
  const allProducts = await productService.listProductsByOrganization(
    organizationId,
    args.search
  );
  // ...
}
```

**Nota:** Esto requiere que `ProductService` soporte filtrado por organización.

---

## 🚀 Plan de Acción Recomendado

### Para resolver AHORA (demo urgente):

1. **Implementar Solución 2** (endpoint REST sin SSE):
   ```bash
   # En Laburen dashboard, cambiar URL del MCP:
   # De: .../sse
   # A:  .../api/tools/call
   ```

2. **Verificar organizationId** (Solución 3):
   - Ir al panel de Laburen
   - Asignar organización al usuario `cmkn0zpsl0ti9oxqcmr0g5p1u`

3. **Probar en WhatsApp** inmediatamente

### Para fix permanente (después de demo):

1. Implementar Solución 1 (keep-alive más frecuente)
2. Agregar logging para debug:
   ```typescript
   console.log('SSE connection state:', connectionActive);
   console.log('User organizationId:', user.organizationId);
   ```
3. Monitorear con Sentry cuántas veces falla el segundo mensaje

---

## 🧪 Testing

### Test 1: Verificar que el endpoint REST funciona

```bash
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_products",
    "args": { "search": "pantalon" }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "products": [...],
    "count": 5
  }
}
```

### Test 2: Verificar SSE keep-alive

```bash
# Abrir conexión SSE y monitorear pings
curl -N https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
```

**Debe mostrar:**
```
event: endpoint
data: {"url":"https://..."}

event: message
data: {"jsonrpc":"2.0",...}

event: ping
data: {"timestamp":"2026-01-22T..."}

event: ping  # Debe aparecer cada 30s (o 10s después del fix)
data: {"timestamp":"2026-01-22T..."}
```

### Test 3: Simular Chatwoot

```bash
# 1. Abrir SSE
curl -N https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse &

# 2. Esperar 5 segundos

# 3. Llamar herramienta
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_products",
      "arguments": {"search": "pantalon"}
    }
  }'
```

---

## 📊 Métricas de Éxito

- ✅ El agente responde **todos los mensajes** en WhatsApp, no solo el primero
- ✅ `list_products` y otras herramientas funcionan correctamente
- ✅ No aparece el error "Session missing organizationId"
- ✅ El tiempo de respuesta es <3 segundos

---

## 🆘 Si aún no funciona

### Verificar logs en Cloudflare Workers

```bash
wrangler tail --format pretty
```

Buscar errores como:
- `SSE connection closed`
- `Tool call failed`
- `Missing organizationId`

### Habilitar debug en Laburen

Agregar en el código del agente:

```typescript
console.log('[MCP] Sending request:', toolName, args);
console.log('[MCP] Connection status:', sseClient.readyState);
console.log('[MCP] User context:', user);
```

### Contactar soporte de Chatwoot

Si el problema persiste, puede ser un bug/limitación de Chatwoot:
- Verificar si Chatwoot cierra conexiones SSE después de N segundos
- Revisar configuración de timeouts en variables de entorno
- Consultar documentación de webhooks vs SSE en Chatwoot

---

## 📚 Referencias

- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [Server-Sent Events (SSE) - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Chatwoot API Documentation](https://www.chatwoot.com/docs)
