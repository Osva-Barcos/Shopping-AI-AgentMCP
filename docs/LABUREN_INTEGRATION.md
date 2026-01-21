# 🔗 Integración con Laburen Dashboard

## 📡 URLs de Conexión

- **Health Check:** `https://laburen-ai-agent-mcp-production.up.railway.app/health`
- **SSE Endpoint:** `https://laburen-ai-agent-mcp-production.up.railway.app/sse` ⬅️ **USA ESTA**

## 🚀 Código de Integración

### Opción 1: EventSource Simple (Recomendado)

```javascript
// Configuración
const MCP_SSE_URL = 'https://laburen-ai-agent-mcp-production.up.railway.app/sse';

// Conectar al servidor MCP
const eventSource = new EventSource(MCP_SSE_URL);

eventSource.onopen = () => {
  console.log('✅ Conectado al servidor MCP de Laburen');
};

eventSource.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    console.log('📨 Mensaje recibido:', message);
    
    // Manejar diferentes tipos de mensajes
    if (message.result) {
      handleToolResult(message.result);
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
};

eventSource.onerror = (error) => {
  console.error('❌ Error de conexión SSE:', error);
  // Reconectar automáticamente después de 3 segundos
  setTimeout(() => {
    console.log('🔄 Intentando reconectar...');
    window.location.reload(); // O crear nuevo EventSource
  }, 3000);
};

// Función para llamar herramientas MCP
async function callMCPTool(toolName, args = {}) {
  try {
    const response = await fetch('https://laburen-ai-agent-mcp-production.up.railway.app/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error llamando herramienta:', error);
    throw error;
  }
}

// Función para manejar resultados
function handleToolResult(result) {
  console.log('Resultado de herramienta:', result);
  // Aquí actualizas tu UI del dashboard
}
```

### Ejemplo de Uso: Listar Productos

```javascript
// Listar todos los productos
async function loadProducts() {
  try {
    const result = await callMCPTool('list_products', {
      limit: 100
    });
    
    console.log('Productos:', result);
    // Renderizar en tu dashboard
    displayProducts(result.content[0].text);
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

// Buscar productos
async function searchProducts(query) {
  const result = await callMCPTool('search_products', {
    query: query
  });
  
  const products = JSON.parse(result.content[0].text);
  return products;
}

// Crear carrito y agregar producto
async function addProductToNewCart(productId, quantity) {
  // 1. Crear carrito
  const cartResult = await callMCPTool('create_cart');
  const cart = JSON.parse(cartResult.content[0].text);
  
  // 2. Agregar producto
  const addResult = await callMCPTool('add_to_cart', {
    cart_id: cart.id,
    product_id: productId,
    qty: quantity
  });
  
  return JSON.parse(addResult.content[0].text);
}

// Obtener carrito con items
async function getCartDetails(cartId) {
  const result = await callMCPTool('get_cart', {
    cart_id: cartId
  });
  
  return JSON.parse(result.content[0].text);
}
```

## 🧪 Test de Conexión

Primero verifica que el servidor está funcionando:

```javascript
// Test 1: Health Check
fetch('https://laburen-ai-agent-mcp-production.up.railway.app/health')
  .then(res => res.json())
  .then(data => console.log('Health:', data));
// Esperado: {status: "ok", message: "MCP HTTP Server is running"}

// Test 2: Conectar SSE
const testSSE = new EventSource('https://laburen-ai-agent-mcp-production.up.railway.app/sse');
testSSE.onopen = () => console.log('✅ SSE conectado!');
testSSE.onerror = (e) => console.error('❌ Error SSE:', e);
```

## 📋 Herramientas Disponibles

### 1. list_products
Lista todos los productos con paginación.

```javascript
await callMCPTool('list_products', {
  limit: 20,    // Opcional, default: 100
  offset: 0     // Opcional, default: 0
});
```

### 2. get_product
Obtiene un producto específico por ID.

```javascript
await callMCPTool('get_product', {
  product_id: '0001'
});
```

### 3. search_products
Busca productos por nombre o descripción.

```javascript
await callMCPTool('search_products', {
  query: 'camisa'
});
```

### 4. create_cart
Crea un nuevo carrito de compras.

```javascript
await callMCPTool('create_cart');
// Retorna: {id: "cart_xxx", created_at: "..."}
```

### 5. add_to_cart
Agrega un producto al carrito.

```javascript
await callMCPTool('add_to_cart', {
  cart_id: 'cart_xxx',
  product_id: '0001',
  qty: 5
});
```

### 6. get_cart
Obtiene el carrito con todos sus items.

```javascript
await callMCPTool('get_cart', {
  cart_id: 'cart_xxx'
});
```

### 7. remove_from_cart
Elimina un item del carrito.

```javascript
await callMCPTool('remove_from_cart', {
  cart_id: 'cart_xxx',
  item_id: 'item_xxx'
});
```

## 🎨 Ejemplo Completo para Dashboard

```javascript
// === CONFIGURACIÓN INICIAL ===
const MCP_CONFIG = {
  sseUrl: 'https://laburen-ai-agent-mcp-production.up.railway.app/sse',
  apiUrl: 'https://laburen-ai-agent-mcp-production.up.railway.app'
};

// === CLASE DE INTEGRACIÓN ===
class LaburenMCPClient {
  constructor() {
    this.eventSource = null;
    this.messageHandlers = [];
  }
  
  connect() {
    this.eventSource = new EventSource(MCP_CONFIG.sseUrl);
    
    this.eventSource.onopen = () => {
      console.log('✅ MCP conectado');
      this.onConnectionChange(true);
    };
    
    this.eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(message));
    };
    
    this.eventSource.onerror = () => {
      console.error('❌ Error de conexión');
      this.onConnectionChange(false);
    };
  }
  
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }
  
  async callTool(name, args) {
    const response = await fetch(`${MCP_CONFIG.apiUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args }
      })
    });
    
    const result = await response.json();
    return JSON.parse(result.result.content[0].text);
  }
  
  onConnectionChange(connected) {
    // Actualizar UI del dashboard
    document.getElementById('mcp-status').textContent = 
      connected ? '🟢 Conectado' : '🔴 Desconectado';
  }
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// === USO EN EL DASHBOARD ===
const mcpClient = new LaburenMCPClient();

// Conectar al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  mcpClient.connect();
  
  // Escuchar mensajes
  mcpClient.onMessage((message) => {
    console.log('Mensaje MCP:', message);
  });
  
  // Cargar productos iniciales
  loadInitialProducts();
});

async function loadInitialProducts() {
  try {
    const products = await mcpClient.callTool('list_products', { limit: 50 });
    renderProducts(products.data);
  } catch (error) {
    console.error('Error cargando productos:', error);
  }
}

function renderProducts(products) {
  const container = document.getElementById('products-grid');
  container.innerHTML = products.map(product => `
    <div class="product-card">
      <h3>${product.name}</h3>
      <p>${product.price_display}</p>
      <p>Stock: ${product.stock}</p>
      <button onclick="addToCart('${product.id}')">
        Agregar al Carrito
      </button>
    </div>
  `).join('');
}

async function addToCart(productId) {
  // Obtener o crear carrito
  let cartId = localStorage.getItem('cartId');
  
  if (!cartId) {
    const cart = await mcpClient.callTool('create_cart');
    cartId = cart.id;
    localStorage.setItem('cartId', cartId);
  }
  
  // Agregar producto
  await mcpClient.callTool('add_to_cart', {
    cart_id: cartId,
    product_id: productId,
    qty: 1
  });
  
  alert('✅ Producto agregado al carrito!');
  updateCartDisplay();
}

async function updateCartDisplay() {
  const cartId = localStorage.getItem('cartId');
  if (!cartId) return;
  
  const cart = await mcpClient.callTool('get_cart', { cart_id: cartId });
  document.getElementById('cart-total').textContent = 
    `Total: $${(cart.total / 100).toFixed(2)}`;
  document.getElementById('cart-items-count').textContent = 
    cart.items.length;
}

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
  mcpClient.disconnect();
});
```

## 🔧 Variables de Configuración

Puedes hacer configurable la URL del MCP:

```javascript
// .env o config.js
const config = {
  MCP_SSE_URL: process.env.REACT_APP_MCP_SSE_URL || 
               'https://laburen-ai-agent-mcp-production.up.railway.app/sse',
  MCP_API_URL: process.env.REACT_APP_MCP_API_URL || 
               'https://laburen-ai-agent-mcp-production.up.railway.app'
};
```

## 🎯 Próximos Pasos

1. Copia el código de integración a tu dashboard
2. Ajusta los selectores CSS/IDs según tu UI
3. Prueba primero con el health check
4. Conecta el SSE
5. Prueba llamar a `list_products`
6. Integra las demás herramientas según tus necesidades

¡Tu integración está lista! 🚀
