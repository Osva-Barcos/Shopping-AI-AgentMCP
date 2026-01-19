# Guía de Importación de Productos

## 📦 Método 1: Script Node.js (Recomendado)

### Paso 1: Preparar tus datos

Convierte tu PDF/Excel a uno de estos formatos:

#### Opción A: JSON
```json
[
  {
    "name": "Notebook Lenovo IdeaPad 3",
    "description": "Intel Core i5, 8GB RAM, 256GB SSD",
    "price": 850,
    "stock": 15
  },
  {
    "name": "Mouse Logitech M185",
    "description": "Mouse inalámbrico",
    "price": 25,
    "stock": 50
  }
]
```

#### Opción B: CSV
```csv
name,description,price,stock
Notebook Lenovo IdeaPad 3,Intel Core i5 8GB RAM 256GB SSD,850,15
Mouse Logitech M185,Mouse inalámbrico,25,50
```

### Paso 2: Ejecutar el script

```bash
# Desde la raíz del proyecto
node scripts/import-products.js products.json
# o
node scripts/import-products.js products.csv
```

### Paso 3: Importar a D1

El script generará un archivo `import-products.sql`. Luego ejecuta:

```bash
wrangler d1 execute laburen-ai-db --file=import-products.sql
```

---

## 📡 Método 2: Endpoint API

### Paso 1: Iniciar el Worker

```bash
npm run dev
```

### Paso 2: Enviar productos vía POST

```bash
curl -X POST http://localhost:8787/admin/products/import \
  -H "Content-Type: application/json" \
  -d @products.json
```

O usando el archivo HTTP:

```http
POST http://localhost:8787/admin/products/import
Content-Type: application/json

[
  {
    "name": "Notebook Lenovo",
    "description": "Intel Core i5",
    "price": 850,
    "stock": 15
  }
]
```

---

## 🔄 Método 3: Manual (Pequeñas cantidades)

Si son pocos productos, puedes insertarlos directamente:

```bash
wrangler d1 execute laburen-ai-db --command "
INSERT INTO products (id, name, description, price, stock) VALUES
('prod_0001', 'Notebook Lenovo', 'Intel Core i5', 85000, 15),
('prod_0002', 'Mouse Logitech', 'Inalámbrico', 2500, 50);
"
```

---

## 📋 Formato de Datos

### Campos requeridos:
- `name` (string) - Nombre del producto
- `price` (number) - Precio en pesos/dólares (el script lo convierte a centavos)
- `stock` (number) - Cantidad disponible

### Campos opcionales:
- `id` (string) - Si no se provee, se genera automáticamente
- `description` (string) - Descripción del producto

### Notas:
- Los precios se guardan en **centavos** (ej: $850 → 85000)
- El script valida todos los datos antes de importar
- Si hay errores, te muestra exactamente qué líneas tienen problemas

---

## ✅ Verificar importación

```bash
# Ver todos los productos
wrangler d1 execute laburen-ai-db --command "SELECT * FROM products"

# Contar productos
wrangler d1 execute laburen-ai-db --command "SELECT COUNT(*) as total FROM products"

# Ver un producto específico
wrangler d1 execute laburen-ai-db --command "SELECT * FROM products WHERE id = 'prod_0001'"
```

---

## 🆘 Problemas comunes

### "File not found"
Asegúrate de estar en la raíz del proyecto y que el archivo existe.

### "Validation errors"
Revisa que todos los productos tengan `name` y `price` válidos.

### "Syntax error in SQL"
Puede haber caracteres especiales en nombres/descripciones. El script los escapa automáticamente, pero verifica comillas simples.

---

## 💡 Tips

1. **Prueba primero con pocos productos** - Importa 2-3 para verificar el formato
2. **Usa la BD local** - Prueba con `--local` antes de producción
3. **Backup antes de importar** - Si ya tienes productos, exporta primero

```bash
# Backup
wrangler d1 execute laburen-ai-db --command "SELECT * FROM products" > backup-products.txt
```

---

**¿Necesitas ayuda para convertir tu PDF a JSON/CSV?** Puedes usar herramientas online o Excel.
