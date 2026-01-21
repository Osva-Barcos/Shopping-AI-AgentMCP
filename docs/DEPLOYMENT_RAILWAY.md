# 🚂 Deployment a Railway.app

Esta guía te ayudará a desplegar el servidor HTTP/SSE del MCP en Railway.app para que tu dashboard de Laburen pueda acceder a él públicamente.

## 📋 Prerrequisitos

1. Cuenta en [Railway.app](https://railway.app/) (gratis)
2. Repositorio GitHub con este código
3. API de Cloudflare Workers ya desplegada (✅ Ya la tienes: `https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev`)

## 🚀 Pasos de Deployment

### 1. Conectar Railway con GitHub

1. Ve a [railway.app](https://railway.app/)
2. Haz clic en "Start a New Project"
3. Selecciona "Deploy from GitHub repo"
4. Autoriza Railway para acceder a tu repositorio
5. Selecciona el repositorio `laburen-ai-agent-mcp`

### 2. Configurar Variables de Entorno

Railway detectará automáticamente el proyecto Node.js. Ahora configura las variables:

1. En el dashboard de Railway, ve a tu proyecto
2. Clic en la pestaña "Variables"
3. Agrega las siguientes variables:

```bash
API_URL=https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev
PORT=3000
NODE_ENV=production
```

### 3. Verificar la Configuración

Railway debería detectar automáticamente:
- ✅ `package.json` → Instalará dependencias con `npm install`
- ✅ `Procfile` → Ejecutará `npm run build && npm start`
- ✅ TypeScript → Compilará automáticamente antes de iniciar

### 4. Deploy

1. Railway iniciará el deployment automáticamente
2. Espera a que termine (1-3 minutos)
3. Una vez completado, Railway te dará una URL pública como:
   ```
   https://laburen-ai-agent-mcp-production.up.railway.app
   ```

### 5. Verificar que Funciona

#### Opción A: Health Check
```bash
curl https://TU-URL-RAILWAY.up.railway.app/health
```

Deberías ver:
```json
{"status":"ok","message":"MCP HTTP Server is running"}
```

#### Opción B: SSE Endpoint
Abre en tu navegador:
```
https://TU-URL-RAILWAY.up.railway.app/sse
```

Deberías ver una conexión SSE activa (el navegador esperará eventos).

## 🔗 Integrar con Laburen Dashboard

Una vez desplegado, configura tu dashboard de Laburen con la URL del SSE endpoint:

```javascript
// En tu dashboard de Laburen
const MCP_SSE_URL = 'https://TU-URL-RAILWAY.up.railway.app/sse';

// Conectar con EventSource
const eventSource = new EventSource(MCP_SSE_URL);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Mensaje MCP:', data);
};
```

## 📊 Arquitectura Desplegada

```
[Laburen Dashboard (Web)]
        ↓ (SSE)
[Railway: MCP HTTP Server] ← TU-URL-RAILWAY.up.railway.app/sse
        ↓ (REST API)
[Cloudflare Workers: REST API] ← laburen-ai-agent-mcp.mcp-osvaldo.workers.dev
        ↓
[D1 Database: SQLite]
```

## 🛠️ Herramientas MCP Disponibles

El servidor expone 7 herramientas vía MCP:

1. **list_products** - Lista todos los productos
2. **get_product** - Obtiene un producto por ID
3. **search_products** - Busca productos por nombre/categoría
4. **create_cart** - Crea un carrito de compras
5. **add_to_cart** - Agrega producto al carrito
6. **get_cart** - Obtiene el carrito con items
7. **remove_from_cart** - Elimina item del carrito

## 🔧 Troubleshooting

### El deployment falla
- Verifica que todas las dependencias estén en `package.json`
- Revisa los logs en Railway: Dashboard → Deployments → Ver logs

### Error de conexión con API
- Verifica que `API_URL` esté correctamente configurada
- Prueba el health check: `curl https://TU-URL/health`

### CORS errors
- El servidor ya incluye headers CORS con `Access-Control-Allow-Origin: *`
- Si necesitas restringir, modifica `src/mcp/http-server.ts`

## 💰 Costos

- **Railway Free Tier**: $5 de crédito gratis mensual
- Este servidor consume ~0.5GB RAM, funcionará sin problemas en el tier gratuito
- Si excedes el límite, Railway te cobra por uso (aprox $5-10/mes)

## 🔄 Actualizaciones

Railway hace auto-deploy cuando haces push a tu rama principal:

```bash
git add .
git commit -m "Update MCP server"
git push origin main
```

Railway detectará el cambio y re-desplegará automáticamente.

## 📝 Variables de Entorno Opcionales

Si quieres más control, puedes agregar:

```bash
# Restringir CORS a tu dominio específico
CORS_ORIGIN=https://tu-dashboard.laburen.com

# Cambiar puerto (Railway asigna automáticamente)
PORT=3000

# Modo de logging
LOG_LEVEL=info
```

## ✅ Checklist Final

- [ ] Proyecto conectado a GitHub en Railway
- [ ] Variables de entorno configuradas (`API_URL`, `PORT`, `NODE_ENV`)
- [ ] Deployment exitoso (sin errores en logs)
- [ ] Health check responde correctamente
- [ ] SSE endpoint accesible
- [ ] Dashboard de Laburen configurado con la URL de Railway
- [ ] Prueba de conexión exitosa (list_products, create_cart, etc.)

---

**¿Problemas?** Revisa los logs en Railway o contacta al soporte.
