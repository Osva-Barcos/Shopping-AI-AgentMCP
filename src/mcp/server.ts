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
          description: `Obtiene el catálogo completo de productos de moda disponibles en la tienda Laburen.

**Información retornada por producto:**
- ID único (formato "0001")
- Nombre descriptivo (ej: "Camiseta Azul Talla M")
- Precio en pesos (mostrar directamente con formato $X,XXX)
- Stock disponible
- Estado de disponibilidad ("Yes"/"No")
- Categoría, tipo, color y talla

**Guía de respuesta al usuario:**
- Presenta los productos de forma atractiva y organizada
- Menciona colores, tallas y precios de forma clara
- Formatea los precios con separador de miles (ej: $1,058)
- Si hay muchos resultados, agrupa por categoría o tipo
- Destaca productos con buen stock o precios atractivos
- Usa emojis para hacer la respuesta más visual (👕👖👗)
- Ofrece ayuda para encontrar algo específico si el catálogo es extenso

**Ejemplo de respuesta:**
"¡Tenemos un catálogo increíble! 🛍️ Te muestro algunas opciones:
👕 Camiseta Azul Talla M - $599 (5 en stock)
👖 Pantalón Negro Talla L - $1,295 (3 en stock)
¿Te interesa algo en particular?"`,
          inputSchema: {
            type: 'object',
            properties: {
              search: {
                type: 'string',
                description: 'Término de búsqueda opcional para filtrar productos por nombre, color, tipo o talla'
              }
            },
          },
        },
        {
          name: 'get_product',
          description: `Obtiene todos los detalles de un producto específico usando su ID único.

**Información retornada:**
- Nombre completo del producto
- Precio en pesos (mostrar directamente con formato $X,XXX)
- Stock actual disponible
- Estado de disponibilidad
- Categoría (Casual, Deportivo, Formal)
- Tipo (Camiseta, Pantalón, Falda, etc.)
- Color y Talla

**Guía de respuesta al usuario:**
- Presenta el producto de forma atractiva y detallada
- Formatea el precio con separador de miles (ej: $1,058)
- Indica claramente si está disponible y cuántas unidades hay
- Sugiere agregarlo al carrito si hay stock
- Si no está disponible, ofrece buscar alternativas similares
- Usa emojis relevantes según el tipo de prenda

**Ejemplo de respuesta:**
"👕 **Camiseta Azul Talla M**
💰 Precio: $599
📦 Stock: 5 unidades disponibles
🏷️ Categoría: Casual

¡Excelente elección! ¿Quieres que lo agregue a tu carrito?"`,
          inputSchema: {
            type: 'object',
            properties: {
              product_id: {
                type: 'string',
                description: 'ID del producto a consultar. Formato: 4 dígitos con ceros a la izquierda (ej: "0001", "0025", "0100")',
              },
            },
            required: ['product_id'],
          },
        },
        {
          name: 'create_cart',
          description: `Crea un nuevo carrito de compras vacío para el cliente.

**⚠️ REGLA CRÍTICA:**
- SOLO crear UN carrito por conversación
- Guardar el cart_id retornado para TODAS las operaciones siguientes
- NUNCA crear un carrito nuevo si ya existe uno en la conversación
- Si el usuario quiere agregar más productos, usar el carrito existente

**Información retornada:**
- cart_id: Identificador único del carrito (guardar internamente)
- created_at: Fecha de creación
- items: Array vacío (carrito recién creado)
- total: 0

**Guía de respuesta al usuario:**
- Confirma que se creó el carrito de forma amigable
- NO menciones el cart_id técnico al usuario (es interno)
- Ofrece ayuda para encontrar productos
- Mantén un tono entusiasta y servicial

**Ejemplo de respuesta:**
"🛒 ¡Perfecto! Ya tienes tu carrito listo para comprar.
¿Qué te gustaría agregar? Puedo ayudarte a buscar camisetas, pantalones, o lo que necesites 😊"`,
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'add_to_cart',
          description: `Agrega un producto al carrito de compras del cliente.

**⚠️ IMPORTANTE:**
- Requiere un cart_id existente (usar el guardado de create_cart)
- Si no hay carrito, crear uno PRIMERO con create_cart
- Valida automáticamente disponibilidad y stock
- El product_id debe tener formato de 4 dígitos ("0001", "0025")

**Validaciones automáticas:**
- Producto debe existir en el catálogo
- Producto debe estar disponible (available="Yes")
- Debe haber stock suficiente para la cantidad solicitada
- Cantidad debe ser mayor a 0

**Información retornada:**
- Detalles del item agregado
- Nombre del producto, precio unitario
- Cantidad agregada y subtotal
- Total actualizado del carrito

**Guía de respuesta al usuario:**
- Confirma con entusiasmo qué se agregó
- Muestra el nombre del producto, cantidad y precio
- Indica el nuevo total del carrito
- Pregunta si desea agregar algo más
- Si hay error de stock, ofrece cantidad disponible como alternativa
- Usa emojis para hacer la confirmación más visual

**Ejemplo de respuesta exitosa:**
"✅ ¡Agregado a tu carrito!
👕 1x Camiseta Azul Talla M - $599

🛒 Total actual: $599
¿Deseas agregar algo más?"`,
          inputSchema: {
            type: 'object',
            properties: {
              cart_id: {
                type: 'string',
                description: 'ID del carrito (usar el cart_id guardado de create_cart)',
              },
              product_id: {
                type: 'string',
                description: 'ID del producto a agregar. Formato: 4 dígitos (ej: "0001", "0025")',
              },
              qty: {
                type: 'number',
                description: 'Cantidad de unidades a agregar (mínimo 1)',
              },
            },
            required: ['cart_id', 'product_id', 'qty'],
          },
        },
        {
          name: 'get_cart',
          description: `Obtiene el contenido completo del carrito de compras del cliente.

**Información retornada:**
- Lista de todos los items en el carrito
- Por cada item: nombre, cantidad, precio unitario, subtotal
- Total general del carrito
- Número de items

**Guía de respuesta al usuario:**
- Presenta el carrito de forma clara y organizada
- Usa formato de lista para los productos
- Muestra precios formateados correctamente
- Destaca el total de forma prominente
- Si está vacío, sugiere productos populares
- Ofrece opciones: modificar cantidades, eliminar items, o proceder al checkout
- Usa emojis para hacer el resumen más visual

**Ejemplo de respuesta con items:**
"🛒 **Tu Carrito de Compras**

1. 👕 Camiseta Azul Talla M
   Cantidad: 2 × $599.00 = $1,198.00

2. 👖 Pantalón Negro Talla L
   Cantidad: 1 × $1,295.00 = $1,295.00

━━━━━━━━━━━━━━━━━━━━
💰 **Total: $2,493.00** (3 items)

¿Deseas modificar algo o proceder con la compra?"

**Ejemplo de carrito vacío:**
"🛒 Tu carrito está vacío por ahora.
¿Te ayudo a encontrar algo? Tenemos camisetas, pantalones, faldas y más 😊"`,
          inputSchema: {
            type: 'object',
            properties: {
              cart_id: {
                type: 'string',
                description: 'ID del carrito a consultar (usar el cart_id guardado)',
              },
            },
            required: ['cart_id'],
          },
        },
        {
          name: 'update_cart_item',
          description: `Modifica la cantidad de un producto que ya está en el carrito.

**Casos de uso:**
- Usuario quiere más unidades de un producto
- Usuario quiere reducir la cantidad
- Ajustar cantidades antes de checkout

**Validaciones automáticas:**
- El item debe existir en el carrito
- Nueva cantidad debe ser mayor a 0 (usar remove_cart_item para eliminar)
- Debe haber stock suficiente para la nueva cantidad

**Información retornada:**
- Item actualizado con nueva cantidad
- Nuevo subtotal del item
- Total actualizado del carrito

**Guía de respuesta al usuario:**
- Confirma el cambio de forma clara
- Muestra la cantidad anterior vs la nueva
- Indica el nuevo subtotal y total del carrito
- Si hay error de stock, ofrece la cantidad máxima disponible
- Pregunta si necesita algo más

**Ejemplo de respuesta:**
"✅ ¡Cantidad actualizada!
👕 Camiseta Azul Talla M: 1 → 3 unidades
   Nuevo subtotal: $1,797.00

💰 Total del carrito: $3,092.00

¿Algo más que ajustar?"`,
          inputSchema: {
            type: 'object',
            properties: {
              cart_id: {
                type: 'string',
                description: 'ID del carrito (usar el cart_id guardado)',
              },
              item_id: {
                type: 'string',
                description: 'ID del item específico dentro del carrito (se obtiene de get_cart)',
              },
              qty: {
                type: 'number',
                description: 'Nueva cantidad deseada (debe ser mayor a 0)',
              },
            },
            required: ['cart_id', 'item_id', 'qty'],
          },
        },
        {
          name: 'remove_cart_item',
          description: `Elimina completamente un producto del carrito de compras.

**Casos de uso:**
- Usuario ya no quiere el producto
- Usuario cambió de opinión
- Usuario quiere reemplazar por otro producto

**Información retornada:**
- Confirmación de eliminación
- Total actualizado del carrito

**Guía de respuesta al usuario:**
- Confirma qué producto se eliminó
- Muestra el nuevo total del carrito
- Si el carrito queda vacío, ofrece ayuda para encontrar otros productos
- Mantén un tono comprensivo (no hagas sentir mal al usuario por quitar algo)
- Ofrece alternativas si aplica

**Ejemplo de respuesta:**
"✅ Eliminado del carrito:
👕 Camiseta Azul Talla M

🛒 Tu carrito ahora tiene 2 items
💰 Nuevo total: $2,590.00

¿Hay algo más que quieras ajustar?"

**Si el carrito queda vacío:**
"✅ Producto eliminado.
🛒 Tu carrito está vacío ahora.

Sin problema, ¿te ayudo a buscar algo diferente? 😊"`,
          inputSchema: {
            type: 'object',
            properties: {
              cart_id: {
                type: 'string',
                description: 'ID del carrito (usar el cart_id guardado)',
              },
              item_id: {
                type: 'string',
                description: 'ID del item a eliminar (se obtiene de get_cart)',
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
