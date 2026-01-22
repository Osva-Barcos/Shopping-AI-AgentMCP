# 📋 Resumen de Cambios - Fix Chatwoot + WhatsApp

## 🎯 Problema Identificado

**Síntoma:** El agente de IA funciona perfectamente en el dashboard de Laburen, pero cuando se usa a través de Chatwoot conectado por WhatsApp, solo responde el primer mensaje y luego deja de responder.

**Causa raíz:** La conexión SSE (Server-Sent Events) entre Chatwoot y el servidor MCP se cierra prematuramente debido a:
1. Keep-alive timeout muy largo (30 segundos)
2. WhatsApp/Chatwoot cierra conexiones idle
3. El ReadableStream de SSE no se mantiene activo entre mensajes
4. Error adicional: Usuario sin `organizationId` asignado

---

## ✅ Soluciones Implementadas

### 1. Reducción de Keep-Alive Interval (30s → 10s)

**Archivo modificado:** `src/mcp/sse-handler.ts`

```typescript
// ANTES:
}, 30000);  // 30 segundos

// DESPUÉS:
}, 10000);  // 10 segundos
```

**Beneficio:** Mantiene la conexión SSE activa más tiempo, evitando timeouts de Chatwoot/WhatsApp.

---

### 2. Endpoint REST Stateless como Alternativa

**Ya existía en el código pero se mejoró con:**
- ✅ Validación de parámetros
- ✅ Mejor manejo de errores
- ✅ Logging detallado con timestamps
- ✅ Mensajes de error más descriptivos

**Archivo modificado:** `src/mcp/http-server.ts`

**Uso recomendado para Chatwoot:**
```
URL: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call
Método: POST
Body: { "tool": "list_products", "args": { "search": "pantalon" } }
```

**Ventaja:** No requiere mantener conexión persistente, funciona en cada request independiente.

---

### 3. Endpoint de Diagnósticos

**Archivo modificado:** `src/index.ts`

**Nuevo endpoint:** `GET /diagnostics`

Retorna:
- Estado de la base de datos
- Cantidad de productos
- URLs de endpoints SSE y REST
- Tips de troubleshooting
- Configuración actual (keep-alive interval)

**Uso:**
```bash
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/diagnostics
```

---

### 4. Logging Mejorado

**Archivos modificados:**
- `src/mcp/sse-handler.ts`
- `src/mcp/http-server.ts`

**Mejoras:**
- ✅ Timestamps en cada log
- ✅ Emojis para identificar tipo de evento rápidamente
- ✅ JSON.stringify en args para ver datos completos
- ✅ Logs de inicio y fin de ejecución de tools
- ✅ Info de cliente (IP, User-Agent) en conexiones SSE
- ✅ Mensajes de error más descriptivos

**Ejemplo de logs:**
```
🔌 [2026-01-22T10:30:45Z] SSE Connection opened from: 192.168.1.100 | User-Agent: Mozilla/5.0
⏰ Keep-alive ping interval: 10 seconds
🔧 [2026-01-22T10:30:50Z] Executing tool: list_products {"search":"pantalon","limit":5}
✅ [2026-01-22T10:30:51Z] Tool list_products executed successfully
📡 [2026-01-22T10:30:55Z] SSE ping sent: 2026-01-22T10:30:55Z
```

---

### 5. Validación de Parámetros

**Archivo modificado:** `src/mcp/http-server.ts`

Se agregó validación para cada herramienta:
- `get_product`: requiere `product_id`
- `add_to_cart`: requiere `cart_id` y `product_id`
- `get_cart`: requiere `cart_id`
- `update_cart_item`: requiere `cart_id`, `item_id` y `qty`
- `remove_from_cart`: requiere `cart_id` y `item_id`

**Beneficio:** Errores más claros cuando faltan parámetros, facilita debug.

---

### 6. Endpoint Health Mejorado

**Archivo modificado:** `src/index.ts`

**Antes:**
```json
{
  "success": true,
  "service": "Laburen AI Agent MCP",
  "status": "healthy"
}
```

**Después:**
```json
{
  "success": true,
  "service": "Laburen AI Agent MCP",
  "status": "healthy",
  "timestamp": "2026-01-22T10:30:00Z",
  "endpoints": {
    "rest_api": "/products, /carts",
    "mcp_sse": "/sse (Server-Sent Events)",
    "mcp_rest": "/api/tools/call (Stateless)",
    "health": "/health",
    "diagnostics": "/diagnostics"
  },
  "config": {
    "sse_keepalive_interval": "10 seconds",
    "cors_enabled": true
  }
}
```

---

## 📚 Documentación Creada

### 1. TROUBLESHOOTING_CHATWOOT_WHATSAPP.md
**Ubicación:** `docs/TROUBLESHOOTING_CHATWOOT_WHATSAPP.md`

**Contenido:**
- Diagnóstico detallado del problema
- 3 soluciones con pros/contras
- Plan de acción paso a paso
- Tests para verificar que todo funciona
- Métricas de éxito
- Referencias técnicas

**Audiencia:** Desarrolladores que necesitan entender el problema en profundidad.

---

### 2. QUICK_FIX_CHATWOOT.md
**Ubicación:** `docs/QUICK_FIX_CHATWOOT.md`

**Contenido:**
- Resumen del problema (3 líneas)
- Pasos de solución (1-2-3-4)
- Comandos copy-paste listos para usar
- Checklist de verificación pre-demo
- Troubleshooting rápido

**Audiencia:** Usuario que necesita resolver el problema AHORA para una demo.

---

### 3. README.md actualizado
**Cambios:**
- Agregada sección "Troubleshooting" en la tabla de contenidos
- Nueva sección con tabla de problemas comunes
- Links a las guías de troubleshooting
- Comandos de diagnóstico
- Referencia al endpoint REST para Chatwoot

---

## 🧪 Script de Testing

**Ubicación:** `scripts/test-mcp-connection.ps1`

**Funcionalidad:**
1. ✅ Test de health check
2. ✅ Test de diagnostics
3. ✅ Test de REST API de productos
4. ✅ Test de endpoint MCP REST (local y remoto)
5. ✅ Test de conexión SSE con monitoreo de pings
6. ✅ Recomendaciones finales

**Uso:**
```powershell
.\scripts\test-mcp-connection.ps1
```

---

## 🚀 Próximos Pasos para el Usuario

### Paso 1: Desplegar cambios
```bash
npm run build
npm run deploy
```

### Paso 2: Verificar despliegue
```bash
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/diagnostics
```

Debe mostrar:
```json
{
  "config": {
    "sse_keepalive_interval": "10 seconds"
  }
}
```

### Paso 3: Configurar Laburen Dashboard

**Opción A (RECOMENDADA):** Usar endpoint REST
```
URL: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call
```

**Opción B:** Mantener SSE con keep-alive mejorado
```
URL: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
```

### Paso 4: Asignar organizationId al usuario

En la base de datos de Laburen:
```sql
UPDATE users 
SET organization_id = 'TU_ORG_ID' 
WHERE id = 'cmkn0zpsl0ti9oxqcmr0g5p1u';
```

### Paso 5: Probar en WhatsApp

1. Enviar: "Hola"
2. Esperar respuesta ✅
3. Enviar: "Mostrame pantalones"
4. Esperar respuesta ✅ ← **Debe funcionar ahora**

---

## 🎯 Métricas de Éxito

- ✅ El agente responde **todos los mensajes** en WhatsApp (no solo el primero)
- ✅ Las herramientas MCP (`list_products`, etc.) funcionan correctamente
- ✅ No aparece el error "Session missing organizationId"
- ✅ Tiempo de respuesta <3 segundos
- ✅ Los logs muestran ejecución exitosa de tools
- ✅ SSE pings se envían cada 10 segundos (si se usa SSE)

---

## 📊 Resumen de Archivos Modificados

### Código fuente
1. ✅ `src/mcp/sse-handler.ts` - Keep-alive 10s, logging mejorado
2. ✅ `src/mcp/http-server.ts` - Validación, logging, mejoras REST
3. ✅ `src/index.ts` - Endpoint /diagnostics, health mejorado

### Documentación
4. ✅ `docs/TROUBLESHOOTING_CHATWOOT_WHATSAPP.md` - Guía completa
5. ✅ `docs/QUICK_FIX_CHATWOOT.md` - Guía rápida
6. ✅ `README.md` - Sección troubleshooting

### Scripts
7. ✅ `scripts/test-mcp-connection.ps1` - Testing automatizado

### Resumen
8. ✅ `docs/RESUMEN_CAMBIOS.md` - Este archivo

---

## 🔍 ¿Por Qué Estos Cambios Resuelven el Problema?

### Problema: SSE se cierra después del primer mensaje

**Solución 1 (Keep-alive más frecuente):**
- Antes: Ping cada 30s → Chatwoot/WhatsApp cierran conexión antes
- Ahora: Ping cada 10s → Conexión se mantiene activa

**Solución 2 (Endpoint REST):**
- SSE requiere conexión persistente (difícil con WhatsApp)
- REST hace request independiente por cada tool call (más robusto)
- No depende de que la conexión se mantenga abierta

### Problema: organizationId faltante

**Solución:**
- Logs mejorados identifican cuándo falta el ID
- Documentación guía al usuario para asignarlo en DB
- Validación más clara en errores

### Problema: Debug difícil

**Solución:**
- Logs con timestamps y emojis facilitan seguimiento
- Endpoint /diagnostics muestra estado del sistema
- Script de testing verifica todo automáticamente

---

## 💡 Lecciones Aprendidas

1. **SSE no es ideal para WhatsApp/Chatwoot:**
   - Los timeouts de conexión son agresivos
   - Mejor usar REST stateless para canales de mensajería

2. **Keep-alive debe ser frecuente:**
   - 30s es demasiado largo para algunos proxies/gateways
   - 10s es un balance razonable

3. **Logging es crítico:**
   - Sin logs detallados, estos problemas son muy difíciles de diagnosticar
   - Timestamps y contexto (IP, User-Agent) son esenciales

4. **Validación temprana:**
   - Fallar rápido con errores claros ahorra tiempo de debug
   - Mejor validar parámetros que esperar error de DB/API

5. **Documentación por capas:**
   - Quick fix para urgencias
   - Troubleshooting profundo para entender el problema
   - README para descubrimiento inicial

---

## 📞 Soporte

Si los cambios no resuelven el problema:

1. Verificar que el despliegue fue exitoso (`/diagnostics`)
2. Revisar logs de Cloudflare Workers (`wrangler tail`)
3. Verificar configuración en Laburen dashboard
4. Consultar `docs/TROUBLESHOOTING_CHATWOOT_WHATSAPP.md`
5. Probar endpoint REST manualmente con curl

**Todos los cambios están diseñados para NO romper funcionalidad existente.** El código es backward-compatible.
