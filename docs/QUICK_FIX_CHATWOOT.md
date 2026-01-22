# 🚀 Guía Rápida: Fix Chatwoot + WhatsApp

## ⚡ Solución Rápida (5 minutos)

### Problema
- ✅ El agente responde el **primer mensaje** 
- ❌ El agente **NO responde** mensajes subsecuentes
- ⚠️ Solo ocurre con **Chatwoot + WhatsApp** (funciona bien en Dashboard)

### Causa
La conexión SSE se cierra después del primer mensaje debido a timeouts de Chatwoot/WhatsApp.

---

## 🔧 Solución Implementada

### Cambios realizados (ya aplicados en el código):

1. ✅ **Keep-alive más frecuente**: 30s → 10s
2. ✅ **Mejor logging** para debug
3. ✅ **Endpoint REST stateless** como alternativa a SSE
4. ✅ **Endpoint de diagnósticos** `/diagnostics`
5. ✅ **Validación mejorada** de parámetros

---

## 📋 Pasos para Aplicar el Fix

### Paso 1: Desplegar cambios a Cloudflare

```bash
# Compilar TypeScript
npm run build

# Desplegar a Cloudflare Workers
npm run deploy
```

**Verificar despliegue:**
```bash
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/diagnostics
```

### Paso 2: Configurar Laburen Dashboard

**Opción A: Usar endpoint REST (RECOMENDADO para Chatwoot)**

En la configuración del agente en Laburen:

```
MCP URL: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call
Método: POST
Formato: REST (stateless)
```

**Opción B: Mantener SSE con keep-alive mejorado**

```
MCP URL: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/sse
Método: SSE
Keep-alive: 10 segundos
```

### Paso 3: Verificar organizationId del usuario

El error `Session missing organizationId` indica que el usuario no tiene organización asignada.

**En la base de datos de Laburen:**

```sql
-- Verificar usuario
SELECT id, email, organization_id 
FROM users 
WHERE id = 'cmkn0zpsl0ti9oxqcmr0g5p1u';

-- Si organization_id es NULL, asignar:
UPDATE users 
SET organization_id = 'TU_ORG_ID_AQUI' 
WHERE id = 'cmkn0zpsl0ti9oxqcmr0g5p1u';
```

### Paso 4: Probar en WhatsApp

1. Enviar primer mensaje: "Hola"
2. Esperar respuesta del agente
3. Enviar segundo mensaje: "Mostrame pantalones"
4. **Debería funcionar** ✅

---

## 🧪 Testing

### Test Local (antes de desplegar)

```bash
# Terminal 1: Iniciar servidor local
npm run dev:mcp

# Terminal 2: Probar endpoint
.\scripts\test-mcp-connection.ps1
```

### Test Producción (después de desplegar)

```bash
# Test 1: Health check
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/health

# Test 2: Diagnostics
curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/diagnostics

# Test 3: REST tool call
curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_products",
    "args": { "search": "pantalon", "limit": 5 }
  }'
```

---

## 📊 Monitoreo

### Ver logs en tiempo real

```bash
wrangler tail --format pretty
```

**Buscar:**
- `🔌 SSE Connection opened` - Nueva conexión
- `📡 SSE ping sent` - Keep-alive funcionando (cada 10s)
- `🔧 Executing tool: list_products` - Herramienta llamada
- `✅ Tool list_products executed successfully` - Éxito
- `❌ Tool list_products failed` - Error

### Verificar en Chatwoot

1. Abrir conversación de WhatsApp
2. Enviar mensaje al agente
3. En el panel de Chatwoot, verificar:
   - Estado de la conversación: "Bot"
   - No debe aparecer "Handover to Agent"
   - Las respuestas deben llegar en <3 segundos

---

## 🆘 Troubleshooting

### Si aún no funciona después del fix:

1. **Verificar que el despliegue fue exitoso:**
   ```bash
   curl https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/diagnostics | jq
   ```
   
   Debe mostrar:
   ```json
   {
     "config": {
       "sse_keepalive_interval": "10 seconds"
     }
   }
   ```

2. **Verificar logs de Cloudflare:**
   ```bash
   wrangler tail
   ```
   
   Si ves muchos `❌` (errores), hay un problema.

3. **Verificar configuración en Laburen:**
   - URL del MCP debe ser EXACTAMENTE: `https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call`
   - Método: POST
   - Headers: `Content-Type: application/json`

4. **Verificar organizationId:**
   ```bash
   # En la consola de Laburen dashboard
   console.log('User org:', currentUser.organizationId);
   ```
   
   No debe ser `null` o `undefined`.

5. **Probar manualmente el webhook:**
   ```bash
   # Simular llamada desde Chatwoot
   curl -X POST https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev/api/tools/call \
     -H "Content-Type: application/json" \
     -d '{
       "tool": "list_products",
       "args": {
         "search": "pantalon"
       }
     }'
   ```

---

## 📝 Checklist de Verificación

Antes de dar la demo:

- [ ] Código desplegado a Cloudflare Workers
- [ ] `/diagnostics` endpoint responde correctamente
- [ ] Usuario tiene `organizationId` asignado
- [ ] URL del MCP configurada en Laburen dashboard
- [ ] Probado en WhatsApp: primer mensaje funciona
- [ ] Probado en WhatsApp: segundo mensaje funciona
- [ ] Logs de Cloudflare muestran ejecución exitosa
- [ ] No aparece error "Session missing organizationId"
- [ ] Tiempo de respuesta <3 segundos

---

## 📚 Documentación Completa

Para más detalles técnicos y soluciones alternativas:
- [TROUBLESHOOTING_CHATWOOT_WHATSAPP.md](./TROUBLESHOOTING_CHATWOOT_WHATSAPP.md)

Para entender el prompt del agente:
- [AI_AGENT_PROMPT.md](./AI_AGENT_PROMPT.md)

Para información sobre el protocolo MCP:
- [MCP_SERVER.md](./MCP_SERVER.md)
