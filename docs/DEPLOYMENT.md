# 🚀 Guía de Deployment - Cloudflare Workers

## Prerrequisitos

- [ ] Cuenta de Cloudflare (gratis)
- [ ] Node.js instalado (v18+)
- [ ] Git instalado

---

## 📋 Paso a Paso

### 1️⃣ Clonar e Instalar

```bash
cd laburen-ai-agent-mcp
npm install
```

---

### 2️⃣ Autenticarse en Cloudflare

```bash
npx wrangler login
```

Esto abrirá el navegador para autorizar el acceso.

---

### 3️⃣ Crear la Base de Datos D1

```bash
npm run db:create
```

**Importante:** Copiar el `database_id` que devuelve el comando.

**Ejemplo de output:**
```
✅ Successfully created DB 'laburen-ai-db'!

[[d1_databases]]
binding = "DB"
database_name = "laburen-ai-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

### 4️⃣ Configurar wrangler.toml

Abrir [wrangler.toml](../wrangler.toml) y pegar el `database_id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "laburen-ai-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ⬅️ PEGAR AQUÍ
```

---

### 5️⃣ Ejecutar Migraciones

```bash
npm run db:migrate
```

Esto crea las tablas en la base de datos de producción.

---

### 6️⃣ (Opcional) Cargar Datos de Ejemplo

```bash
wrangler d1 execute laburen-ai-db --file=./src/db/seed.sql
```

---

### 7️⃣ Deployar el Worker

```bash
npm run deploy
```

Wrangler te mostrará la URL de tu Worker:

```
Published laburen-ai-agent-mcp
  https://laburen-ai-agent-mcp.<tu-subdomain>.workers.dev
```

---

### 8️⃣ Verificar el Deployment

```bash
curl https://laburen-ai-agent-mcp.<tu-subdomain>.workers.dev/health
```

Deberías ver:

```json
{
  "success": true,
  "service": "Laburen AI Agent MCP",
  "status": "healthy",
  "timestamp": "2026-01-19T10:30:00.000Z"
}
```

---

## 🔄 Actualizar el Worker

Cada vez que hagas cambios:

```bash
npm run deploy
```

---

## 📊 Monitorear Logs

```bash
npm run tail
```

Esto muestra los logs en tiempo real.

---

## 🗄️ Gestionar Base de Datos

### Ver tablas

```bash
wrangler d1 execute laburen-ai-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Ver productos

```bash
wrangler d1 execute laburen-ai-db --command "SELECT * FROM products"
```

### Insertar producto manualmente

```bash
wrangler d1 execute laburen-ai-db --command "INSERT INTO products (id, name, description, price, stock) VALUES ('prod_test', 'Producto Test', 'Descripción', 10000, 5)"
```

---

## 🔧 Troubleshooting

### Error: "Database not found"

Verificar que el `database_id` en `wrangler.toml` sea correcto.

### Error: "Table not found"

Ejecutar las migraciones:

```bash
npm run db:migrate
```

### Error: "Authentication failed"

Volver a autenticarse:

```bash
npx wrangler logout
npx wrangler login
```

---

## 🌍 Configurar Dominio Custom (Opcional)

1. Ir a Cloudflare Dashboard
2. Workers & Pages → tu worker
3. Settings → Triggers → Custom Domains
4. Add Custom Domain

---

## 💰 Límites del Plan Gratuito

- **100,000 requests/día**
- **10 bases de datos D1**
- **5 GB de datos por BD**

Suficiente para desarrollo y testing.

---

## 📝 Notas

- El Worker se despliega en el edge de Cloudflare (ultra rápido)
- D1 tiene replicación global automática
- Sin servidores que mantener
- Deploy en segundos

---

**¿Problemas?** Revisar la [documentación oficial de Wrangler](https://developers.cloudflare.com/workers/wrangler/)
