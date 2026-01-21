import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from './api-client.js';

/**
 * MCP Server para el sistema de carrito de compras
 * Usa la API REST desplegada en Cloudflare Workers
 */
export class LaburenMCPServer {
  private server: Server;
  private apiClient: ApiClient;

  constructor(apiBaseUrl?: string) {
    this.apiClient = new ApiClient(apiBaseUrl);

    // Crear servidor MCP
    this.server = new Server(
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

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // Handler para listar tools disponibles
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_products',
          description: 'Lista todos los productos disponibles del catálogo con información de precio, stock y disponibilidad',
          inputSchema: {
            type: 'object',
            properties: {},
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

    // Handler para ejecutar tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_products': {
            const typedArgs = args as { search?: string } | undefined;
            const products = await this.apiClient.listProducts(typedArgs?.search);
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
            const product = await this.apiClient.getProduct(typedArgs.product_id);
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
            const cart = await this.apiClient.createCart();
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
            // Normalizar product_id y qty
            let productId = String(typedArgs.product_id).padStart(4, '0');
            let qty = Number(typedArgs.qty);
            
            if (isNaN(qty) || qty <= 0) {
              throw new Error('qty debe ser un número positivo');
            }

            const item = await this.apiClient.addToCart(
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
            const cart = await this.apiClient.getCart(typedArgs.cart_id);
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

            const item = await this.apiClient.updateCartItem(
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
            await this.apiClient.removeCartItem(typedArgs.cart_id, typedArgs.item_id);
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

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Laburen MCP Server running on stdio');
  }
}
