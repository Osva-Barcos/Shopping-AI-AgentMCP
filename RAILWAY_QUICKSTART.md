# 🚀 Railway Deployment - Quick Start

## ⚡ Pasos Rápidos (5 minutos)

### 1️⃣ Preparar código
```bash
# Verificar que todo está listo
npm run test:railway

# Debería mostrar todos los checkmarks ✓
```

### 2️⃣ Subir a GitHub
```bash
git add .
git commit -m "chore: add Railway deployment config"
git push origin main
```

### 3️⃣ Desplegar en Railway

1. **Ve a:** https://railway.app/
2. **Clic en:** "Start a New Project"
3. **Selecciona:** "Deploy from GitHub repo"
4. **Elige:** `laburen-ai-agent-mcp`
5. **Espera:** Railway detectará automáticamente el proyecto Node.js

### 4️⃣ Configurar Variables de Entorno

En el dashboard de Railway, agrega estas variables:

| Variable | Valor |
|----------|-------|
| `API_URL` | `https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

### 5️⃣ Obtener URL

Railway te dará una URL pública como:
```
https://laburen-ai-agent-mcp-production.up.railway.app
```

### 6️⃣ Verificar

#### Test rápido:
```bash
curl https://TU-URL-RAILWAY.up.railway.app/health
```

**Respuesta esperada:**
```json
{"status":"ok","message":"MCP HTTP Server is running"}
```

#### Test SSE endpoint:
Abre en tu navegador:
```
https://TU-URL-RAILWAY.up.railway.app/sse
```

Deberías ver una conexión SSE activa.

### 7️⃣ Integrar con Dashboard

En tu dashboard de Laburen, configura:

```javascript
const MCP_SSE_URL = 'https://TU-URL-RAILWAY.up.railway.app/sse';
```

---

## 🎯 Herramientas MCP Disponibles

Una vez conectado, tendrás acceso a:

1. `list_products` - Lista productos con paginación
2. `get_product` - Obtiene detalles de un producto
3. `search_products` - Busca productos por nombre/categoría
4. `create_cart` - Crea un carrito nuevo
5. `add_to_cart` - Agrega producto al carrito
6. `get_cart` - Obtiene carrito con items y total
7. `remove_from_cart` - Elimina item del carrito

---

## 🐛 Troubleshooting

### ❌ Error: "Application failed to start"
**Solución:** Verifica que el script `start` esté en package.json:
```json
"scripts": {
  "start": "node dist/mcp/http-server.js"
}
```

### ❌ Error: "Cannot find module"
**Solución:** Railway debe ejecutar `npm run build` antes de start. Verifica Procfile:
```
web: npm run build && npm start
```

### ❌ Error de CORS
**Solución:** El servidor ya incluye CORS (`Access-Control-Allow-Origin: *`). Si necesitas restringir, modifica `src/mcp/http-server.ts`.

### ❌ No se conecta a la API
**Solución:** Verifica que la variable `API_URL` esté correctamente configurada en Railway.

---

## 💡 Tips

- **Auto-deploy:** Railway re-despliega automáticamente cuando haces push a GitHub
- **Logs:** Revisa los logs en Railway Dashboard → Deployments → View logs
- **Free Tier:** Railway ofrece $5 gratis/mes, suficiente para este proyecto
- **Custom Domain:** Puedes agregar un dominio personalizado en Railway Settings

---

## 📖 Más Información

- [Guía completa de deployment](docs/DEPLOYMENT_RAILWAY.md)
- [Documentación oficial de Railway](https://docs.railway.app/)
- [API REST documentation](docs/examples.http)

---

**¿Listo?** Ejecuta: `npm run test:railway` y sigue los pasos! 🚀
