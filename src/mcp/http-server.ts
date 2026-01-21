#!/usr/bin/env node
/**
 * Servidor HTTP para exponer MCP via SSE
 * Para integración con dashboards web como Laburen
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { ApiClient } from './api-client.js';

const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev';

console.log(`🔧 Initializing MCP HTTP Server`);
console.log(`🌐 API URL: ${API_URL}`);

// Crear servidor HTTP
const httpServer = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Endpoint POST para recibir mensajes MCP (con sessionId)
  if (req.url?.startsWith('/message') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const message = JSON.parse(body);
        console.log('📨 Mensaje POST recibido en /message:', message);
        
        // El SSEServerTransport maneja estos mensajes automáticamente
        // Solo confirmamos recepción
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id || 1,
          result: { status: 'message received' }
        }));
      } catch (error) {
        console.error('Error procesando mensaje:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' }
        }));
      }
    });
    return;
  }

  // Endpoint SSE para MCP
  if (req.url === '/sse' && req.method === 'GET') {
    console.log('📡 Nueva conexión SSE desde:', req.socket.remoteAddress);
    
    const apiClient = new ApiClient(API_URL);
    const mcpServer = new Server(
      {
        name: 'laburen-shop-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Configurar handlers
    setupMCPHandlers(mcpServer, apiClient);

    const transport = new SSEServerTransport('/message', res);
    await mcpServer.connect(transport);

    req.on('close', () => {
      console.log('❌ Conexión SSE cerrada');
    });

    return;
  }

  // Endpoint REST simple para llamadas directas (sin SSE)
  if (req.url === '/api/tools/call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { tool, args } = JSON.parse(body);
        console.log(`🔧 Llamando herramienta: ${tool}`, args);
        
        const apiClient = new ApiClient(API_URL);
        
        // Llamar directamente a la herramienta
        let result;
        switch (tool) {
          case 'list_products':
            result = await apiClient.listProducts(args?.search);
            break;
          case 'get_product':
            result = await apiClient.getProduct(args.product_id);
            break;
          case 'search_products':
            result = await apiClient.searchProducts(args.query);
            break;
          case 'create_cart':
            result = await apiClient.createCart();
            break;
          case 'add_to_cart':
            result = await apiClient.addToCart(args.cart_id, args.product_id, args.qty);
            break;
          case 'get_cart':
            result = await apiClient.getCart(args.cart_id);
            break;
          case 'remove_from_cart':
            result = await apiClient.removeFromCart(args.cart_id, args.item_id);
            break;
          default:
            throw new Error(`Herramienta no encontrada: ${tool}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
        console.log(`✅ Herramienta ${tool} ejecutada exitosamente`);
      } catch (error: any) {
        console.error('❌ Error ejecutando herramienta:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // Health check
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'Laburen MCP HTTP Server',
      version: '1.0.0',
      endpoints: {
        sse: '/sse (MCP protocol)',
        api: '/api/tools/call (REST simple)',
        health: '/health'
      },
      api_url: API_URL,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

function setupMCPHandlers(server: Server, apiClient: ApiClient) {
  // Lista de tools disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'list_products',
        description: 'Lista todos los productos disponibles del catálogo con información de precio, stock y disponibilidad',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filtro de búsqueda opcional por nombre o descripción'
            }
          },
        },
      },
      {
        name: 'get_product',
        description: 'Obtiene información detallada de un producto específico por su ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'ID del producto a consultar (ej: "0001")',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_cart',
        description: 'Crea un nuevo carrito de compras vacío. Devuelve un cart_id que debe usarse para todas las operaciones posteriores',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'add_to_cart',
        description: 'Agrega un producto al carrito. Valida automáticamente que el producto esté disponible (available="Yes") y que haya stock suficiente',
        inputSchema: {
          type: 'object',
          properties: {
            cart_id: {
              type: 'string',
              description: 'ID del carrito donde agregar el producto',
            },
            product_id: {
              type: 'string',
              description: 'ID del producto a agregar (ej: "0001")',
            },
            qty: {
              type: 'number',
              description: 'Cantidad de unidades a agregar (debe ser mayor a 0)',
            },
          },
          required: ['cart_id', 'product_id', 'qty'],
        },
      },
      {
        name: 'get_cart',
        description: 'Obtiene el contenido completo del carrito con todos los productos, cantidades y total',
        inputSchema: {
          type: 'object',
          properties: {
            cart_id: {
              type: 'string',
              description: 'ID del carrito a consultar',
            },
          },
          required: ['cart_id'],
        },
      },
      {
        name: 'update_cart_item',
        description: 'Actualiza la cantidad de un producto que ya está en el carrito. Valida que haya stock suficiente',
        inputSchema: {
          type: 'object',
          properties: {
            cart_id: {
              type: 'string',
              description: 'ID del carrito',
            },
            item_id: {
              type: 'string',
              description: 'ID del item en el carrito a actualizar',
            },
            qty: {
              type: 'number',
              description: 'Nueva cantidad del producto (debe ser mayor a 0)',
            },
          },
          required: ['cart_id', 'item_id', 'qty'],
        },
      },
      {
        name: 'remove_cart_item',
        description: 'Elimina un producto específico del carrito',
        inputSchema: {
          type: 'object',
          properties: {
            cart_id: {
              type: 'string',
              description: 'ID del carrito',
            },
            item_id: {
              type: 'string',
              description: 'ID del item en el carrito a eliminar',
            },
          },
          required: ['cart_id', 'item_id'],
        },
      },
    ],
  }));

  // Ejecutar tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_products': {
          const typedArgs = args as { search?: string } | undefined;
          const products = await apiClient.listProducts(typedArgs?.search);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(products, null, 2),
              },
            ],
          };
        }

        case 'get_product': {
          const typedArgs = args as { product_id: string };
          const product = await apiClient.getProduct(typedArgs.product_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(product, null, 2),
              },
            ],
          };
        }

        case 'create_cart': {
          const cart = await apiClient.createCart();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(cart, null, 2),
              },
            ],
          };
        }

        case 'add_to_cart': {
          const typedArgs = args as { cart_id: string; product_id: string | number; qty: number | string };
          let productId = String(typedArgs.product_id).padStart(4, '0');
          let qty = Number(typedArgs.qty);
          
          if (isNaN(qty) || qty <= 0) {
            throw new Error('qty debe ser un número positivo');
          }

          const item = await apiClient.addToCart(
            typedArgs.cart_id,
            productId,
            qty
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(item, null, 2),
              },
            ],
          };
        }

        case 'get_cart': {
          const typedArgs = args as { cart_id: string };
          const cart = await apiClient.getCart(typedArgs.cart_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(cart, null, 2),
              },
            ],
          };
        }

        case 'update_cart_item': {
          const typedArgs = args as { cart_id: string; item_id: string; qty: number | string };
          const qty = Number(typedArgs.qty);
          if (isNaN(qty) || qty <= 0) {
            throw new Error('qty debe ser un número positivo');
          }

          const item = await apiClient.updateCartItem(
            typedArgs.cart_id,
            typedArgs.item_id,
            qty
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(item, null, 2),
              },
            ],
          };
        }

        case 'remove_cart_item': {
          const typedArgs = args as { cart_id: string; item_id: string };
          await apiClient.removeCartItem(typedArgs.cart_id, typedArgs.item_id);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'Item eliminado correctamente' }, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Tool desconocido: ${name}`);
      }
    } catch (error: any) {
      console.error(`❌ Error en tool ${name}:`, error.message);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error.message,
                name: error.name,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });
}

httpServer.listen(PORT, () => {
  console.log(`\n🚀 MCP HTTP Server running!`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`🏥 Health check:  http://localhost:${PORT}/health`);
  console.log(`🔗 Connected to:  ${API_URL}\n`);
});
