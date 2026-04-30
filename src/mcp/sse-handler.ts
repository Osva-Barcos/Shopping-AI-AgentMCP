/**
 * MCP SSE Handler para Cloudflare Workers
 * 
 * Implementa el protocolo MCP sobre SSE para integraciones con:
 * - Claude Desktop
 * - Cualquier dashboard web
 * - Cualquier cliente MCP compatible
 * 
 * URL: https://ai-shop-agent.mcp-osvaldo.workers.dev/sse
 */

import { ProductService } from '../services/product.service';
import { CartService } from '../services/cart.service';

// Tipos MCP
interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

interface MCPToolCall {
  jsonrpc: '2.0';
  id: string | number;
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

// Definición de tools disponibles
const MCP_TOOLS: MCPTool[] = [
  {
    name: 'list_products',
    description: 'Lista todos los productos disponibles en el catálogo. Opcionalmente filtra por término de búsqueda.',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Término de búsqueda opcional para filtrar productos por nombre o descripción' },
        limit: { type: 'number', description: 'Número máximo de productos a retornar (default: 20)' }
      }
    }
  },
  {
    name: 'get_product',
    description: 'Obtiene los detalles de un producto específico por su ID',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'ID del producto (ej: "0001", "0042")' }
      },
      required: ['product_id']
    }
  },
  {
    name: 'create_cart',
    description: 'Crea un nuevo carrito de compras vacío y retorna su ID',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_cart',
    description: 'Obtiene el contenido de un carrito con todos sus items y totales',
    inputSchema: {
      type: 'object',
      properties: {
        cart_id: { type: 'string', description: 'ID del carrito (ej: "cart_abc123")' }
      },
      required: ['cart_id']
    }
  },
  {
    name: 'add_to_cart',
    description: 'Agrega un producto al carrito. Si el producto ya existe, suma la cantidad.',
    inputSchema: {
      type: 'object',
      properties: {
        cart_id: { type: 'string', description: 'ID del carrito' },
        product_id: { type: 'string', description: 'ID del producto a agregar' },
        qty: { type: 'number', description: 'Cantidad a agregar (default: 1)' }
      },
      required: ['cart_id', 'product_id']
    }
  },
  {
    name: 'update_cart_item',
    description: 'Actualiza la cantidad de un item específico en el carrito',
    inputSchema: {
      type: 'object',
      properties: {
        cart_id: { type: 'string', description: 'ID del carrito' },
        item_id: { type: 'string', description: 'ID del item en el carrito' },
        qty: { type: 'number', description: 'Nueva cantidad (debe ser > 0)' }
      },
      required: ['cart_id', 'item_id', 'qty']
    }
  },
  {
    name: 'remove_from_cart',
    description: 'Elimina un item del carrito',
    inputSchema: {
      type: 'object',
      properties: {
        cart_id: { type: 'string', description: 'ID del carrito' },
        item_id: { type: 'string', description: 'ID del item a eliminar' }
      },
      required: ['cart_id', 'item_id']
    }
  }
];

/**
 * Ejecuta un tool MCP y retorna el resultado
 */
async function executeTool(
  toolName: string,
  args: Record<string, any>,
  productService: ProductService,
  cartService: CartService
): Promise<any> {
  const timestamp = new Date().toISOString();
  console.log(`🔧 [${timestamp}] Executing tool: ${toolName}`, JSON.stringify(args));

  switch (toolName) {
    case 'list_products': {
      const allProducts = await productService.listProducts(args.search);
      const limit = args.limit ?? 10; // Reducido de 20 a 10
      const products = allProducts.slice(0, limit);
      // Simplificar cada producto - solo campos esenciales
      const simplifiedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        available: p.available
      }));
      return { 
        products: simplifiedProducts, 
        count: simplifiedProducts.length, 
        total: allProducts.length 
      };
    }

    case 'get_product': {
      const productId = String(args.product_id).padStart(4, '0');
      const product = await productService.getProductById(productId);
      // Solo campos esenciales
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        available: product.available
      };
    }

    case 'create_cart': {
      const cart = await cartService.createCart();
      // Payload simplificado - solo lo esencial
      return { 
        cart_id: cart.id,
        status: 'created',
        message: 'Carrito creado. Usa este cart_id para agregar productos.'
      };
    }

    case 'get_cart': {
      const cart = await cartService.getCartWithItems(args.cart_id);
      // Simplificar items - solo lo esencial para la IA
      const simplifiedItems = cart.items.map(item => ({
        item_id: item.id,
        product_name: item.product?.name || 'Producto',
        qty: item.qty,
        price: item.product?.price || 0,
        subtotal: item.subtotal
      }));
      
      return {
        cart_id: cart.id,
        items: simplifiedItems,
        items_count: simplifiedItems.length,
        total: cart.total
      };
    }

    case 'add_to_cart': {
      const productId = String(args.product_id).padStart(4, '0');
      const item = await cartService.addProductToCart(args.cart_id, productId, args.qty || 1);
      // Payload simplificado - solo datos esenciales, sin objetos anidados profundos
      return { 
        cart_id: args.cart_id,
        item_id: item.id,
        product_id: item.product_id,
        qty: item.qty,
        status: 'added',
        message: 'Producto agregado al carrito'
      };
    }

    case 'update_cart_item': {
      const item = await cartService.updateCartItem(args.cart_id, args.item_id, args.qty);
      return { 
        cart_id: args.cart_id,
        item_id: item.id,
        qty: item.qty,
        status: 'updated'
      };
    }

    case 'remove_from_cart': {
      await cartService.removeCartItem(args.cart_id, args.item_id);
      return { 
        cart_id: args.cart_id,
        item_id: args.item_id,
        status: 'removed'
      };
    }

    default:
      throw new Error(`Tool desconocido: ${toolName}`);
  }
}

/**
 * Crea respuesta SSE para MCP
 */
function createSSEResponse(
  productService: ProductService,
  cartService: CartService,
  request: Request
): Response {
  const encoder = new TextEncoder();
  let pingCount = 0;
  
  // ReadableStream para SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('❌ Failed to send SSE message:', error);
        }
      };

      console.log('🔌 SSE stream started - connection active');
      
      // 1️⃣ Enviar endpoint info
      send('endpoint', {
        url: new URL(request.url).origin + '/sse'
      });

      // 2️⃣ Enviar server info
      send('message', {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {
          serverInfo: {
            name: 'ai-shop-agent',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      });

      // 3️⃣ Enviar lista de tools
      send('message', {
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed'
      });
      
      console.log('✅ SSE handshake completed - ready for tool calls');

      // Keep-alive ping cada 5 segundos (muy agresivo para Chatwoot/WhatsApp)
      const pingInterval = setInterval(() => {
        try {
          const pingData = { 
            timestamp: new Date().toISOString(),
            type: 'keepalive'
          };
          send('ping', pingData);
          console.log('📡 SSE ping sent:', pingData.timestamp);
        } catch (error) {
          console.error('❌ Ping failed, closing connection:', error);
          clearInterval(pingInterval);
        }
      }, 5000);

      // Mantener conexión abierta
      // El cliente enviará requests vía POST /sse/message
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Handler principal para /sse
 */
export async function handleSSE(
  request: Request,
  productService: ProductService,
  cartService: CartService
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // GET /sse - Iniciar conexión SSE
  if (request.method === 'GET' && (path === '/sse' || path === '/sse/')) {
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log('🔌 SSE Connection opened from:', clientIp, '| User-Agent:', userAgent);
    console.log('⏰ Keep-alive ping interval: 5 seconds (aggressive mode)');
    return createSSEResponse(productService, cartService, request);
  }

  // POST /sse o /sse/message - Recibir mensajes MCP
  if (request.method === 'POST') {
    try {
      const body = await request.json<MCPRequest>();
      console.log('📨 MCP Request:', body.method, body.id);

      let result: any;

      switch (body.method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'ai-shop-agent',
              version: '1.0.0'
            },
            capabilities: {
              tools: {}
            }
          };
          break;

        case 'tools/list':
          result = { tools: MCP_TOOLS };
          break;

        case 'tools/call':
          const { name, arguments: args } = (body as MCPToolCall).params;
          try {
            console.log(`🎯 Tool call received: ${name}`);
            const toolResult = await executeTool(name, args || {}, productService, cartService);
            console.log(`✅ Tool ${name} executed successfully`);
            
            // Convertir a string y verificar tamaño
            const resultString = JSON.stringify(toolResult);
            console.log(`📦 Response size: ${resultString.length} bytes`);
            
            // Sanitizar caracteres problemáticos
            const sanitizedResult = resultString
              .replace(/[\u0000-\u001F]/g, '') // Remove control characters
              .replace(/\\n/g, ' ')            // Replace newlines with spaces
              .replace(/\\t/g, ' ');           // Replace tabs with spaces
            
            result = {
              content: [
                {
                  type: 'text',
                  text: sanitizedResult
                }
              ]
            };
          } catch (error: any) {
            console.error(`❌ Tool ${name} failed:`, error.message);
            // Respuesta de error simplificada
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: error.message, tool: name })
                }
              ],
              isError: true
            };
          }
          break;

        case 'ping':
          result = {};
          break;

        default:
          return new Response(JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: `Method not found: ${body.method}`
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
      }

      // SIEMPRE devolver 200 OK con respuesta válida
      const responseBody = JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result
      });
      
      console.log(`📤 Sending response for ${body.method} (${responseBody.length} bytes)`);
      
      return new Response(responseBody, {
        status: 200, // Siempre 200 para evitar que Chatwoot marque como error
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error: any) {
      console.error('❌ SSE Error:', error);
      // Incluso en error, devolver 200 con estructura de error válida
      // para evitar que Chatwoot marque la conversación como "open"
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Parse error', details: error.message })
            }
          ],
          isError: true
        }
      }), {
        status: 200, // 200 en lugar de 400 para Chatwoot
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
