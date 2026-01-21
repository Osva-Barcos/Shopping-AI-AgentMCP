# ✅ Railway Deployment Checklist

## Pre-Deployment
- [ ] Ejecutar `npm run test:railway` - Todos los archivos deben estar presentes
- [ ] Verificar que `npm run build` compila sin errores
- [ ] Confirmar que el servidor local funciona: `npm run mcp:http`
- [ ] Probar health check local: http://localhost:3000/health

## Git Repository
- [ ] Todos los cambios commiteados
- [ ] Push a la rama principal (main/master)
- [ ] Repositorio accesible en GitHub

## Railway Setup
- [ ] Cuenta creada en railway.app
- [ ] Repositorio conectado a Railway
- [ ] Variables de entorno configuradas:
  - [ ] API_URL
  - [ ] PORT
  - [ ] NODE_ENV

## Deployment Verification
- [ ] Build exitoso (sin errores en logs)
- [ ] Servidor iniciado correctamente
- [ ] Health check responde: `/health`
- [ ] SSE endpoint accesible: `/sse`

## Integration Testing
- [ ] Conectar dashboard con URL de Railway
- [ ] Probar herramienta `list_products`
- [ ] Probar creación de carrito `create_cart`
- [ ] Probar agregar producto `add_to_cart`
- [ ] Verificar respuestas con formato correcto

## Production Ready
- [ ] URL pública obtenida de Railway
- [ ] Dashboard configurado con la URL
- [ ] Pruebas end-to-end completadas
- [ ] Documentación actualizada con URL de producción

---

**Estado actual:** ⏳ Pre-deployment (archivos listos)

**Próximo paso:** Subir código a GitHub y conectar con Railway

---

## 📋 Comandos Rápidos

```bash
# Verificar setup
npm run test:railway

# Build local
npm run build

# Test local
npm run mcp:http

# Commit y push
git add .
git commit -m "chore: add Railway deployment config"
git push origin main
```

---

## 🔗 Enlaces Útiles

- Railway Dashboard: https://railway.app/dashboard
- Guía Rápida: [RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)
- Guía Completa: [docs/DEPLOYMENT_RAILWAY.md](docs/DEPLOYMENT_RAILWAY.md)
- API REST: https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev
