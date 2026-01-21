# Laburen Shop MCP Server

Implementación del Model Context Protocol (MCP) para el sistema de carrito de compras.

## 🎯 ¿Qué es esto?

Este es un **servidor MCP** que permite a Claude Desktop (y otros clientes MCP) interactuar con el sistema de carrito de compras de manera nativa, sin necesidad de configurar HTTP tools manualmente.

## 🚀 Ventajas vs HTTP Tools

| Feature | HTTP Tools | MCP Server |
|---------|-----------|------------|
| Configuración manual | ✅ Necesaria | ❌ No necesaria |
| Auto-discovery | ❌ No | ✅ Sí |
| Validación de esquemas | ⚠️ Manual | ✅ Automática |
| Experiencia de debugging | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Soporte Claude Desktop | ⚠️ Limitado | ✅ Nativo |

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build
```

## 🔧 Configuración en Claude Desktop

1. Abre la configuración de Claude Desktop
2. Busca el archivo `claude_desktop_config.json`
3. Agrega la configuración del servidor MCP:

```json
{
  "mcpServers": {
    "laburen-shop": {
      "command": "node",
      "args": [
        "RUTA_COMPLETA/laburen-ai-agent-mcp/dist/mcp/index.js"
      ]
    }
  }
}
```

4. Reinicia Claude Desktop
5. El servidor estará disponible automáticamente

## 🛠️ Tools Disponibles

El servidor MCP expone los siguientes tools:

### 1. `list_products`
Lista todos los productos del catálogo.

**Parámetros:** Ninguno

### 2. `get_product`
Obtiene detalles de un producto específico.

**Parámetros:**
- `product_id` (string): ID del producto (ej: "0001")

### 3. `create_cart`
Crea un nuevo carrito de compras.

**Parámetros:** Ninguno

**Retorna:** `{ id: "cart_xxx", created_at, updated_at }`

### 4. `add_to_cart`
Agrega un producto al carrito.

**Parámetros:**
- `cart_id` (string): ID del carrito
- `product_id` (string): ID del producto
- `qty` (number): Cantidad a agregar

### 5. `get_cart`
Obtiene el contenido completo del carrito.

**Parámetros:**
- `cart_id` (string): ID del carrito

### 6. `update_cart_item`
Actualiza la cantidad de un item en el carrito.

**Parámetros:**
- `cart_id` (string): ID del carrito
- `item_id` (string): ID del item
- `qty` (number): Nueva cantidad

### 7. `remove_cart_item`
Elimina un item del carrito.

**Parámetros:**
- `cart_id` (string): ID del carrito
- `item_id` (string): ID del item a eliminar

## 🧪 Testing Local

```bash
# Iniciar el servidor MCP en modo stdio
npm run mcp
```

El servidor se comunicará vía stdio (standard input/output), que es el protocolo estándar de MCP.

## 🔄 Diferencias con la versión HTTP

### HTTP Tools (rama main)
- Endpoints REST tradicionales
- Requiere configuración manual en Laburen
- Problemas con variables de ruta en algunos clientes

### MCP Server (rama feature/mcp-protocol)
- Protocolo nativo de MCP
- Auto-discovery de tools
- Validación automática de esquemas
- Mejor integración con Claude Desktop

## 📝 Notas

- **Base de datos:** El servidor MCP usa la misma base de datos D1 que la versión HTTP
- **Servicios:** Comparte la misma lógica de negocio (ProductService, CartService)
- **Compatible:** Puedes tener ambas versiones corriendo simultáneamente

## 🐛 Debugging

Para ver logs del servidor MCP:

```bash
# Los logs se envían a stderr
npm run mcp 2> mcp-server.log
```

## 📚 Referencias

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Claude Desktop MCP Guide](https://modelcontextprotocol.io/quickstart/user)
