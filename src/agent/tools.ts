/**
 * Agent Tools — AI Shopping Agent
 *
 * Define las herramientas (tools) disponibles para el agente de IA.
 * Estas tools se pasan al LLM como function-calling y se ejecutan
 * directamente contra los servicios de base de datos.
 */

import { ProductService } from '../services/product.service.js';
import { CartService } from '../services/cart.service.js';

// ===== Definición de Tools para Cloudflare AI =====
// Formato compatible con OpenAI function calling

export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_products',
      description:
        'Lista los productos disponibles en el catálogo de la tienda. Úsalo cuando el usuario quiera ver productos, buscar algo específico, o explorar el catálogo. Puedes filtrar por término de búsqueda.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description:
              'Término de búsqueda opcional. Puede ser nombre, color, tipo de prenda o talla. Ejemplo: "camiseta azul", "talla M", "pantalón".',
          },
          limit: {
            type: 'number',
            description: 'Máximo de productos a retornar. Default: 8.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product',
      description:
        'Obtiene los detalles completos de un producto específico usando su ID único (formato "0001" a "0100").',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'ID del producto. Formato: 4 dígitos con ceros a la izquierda. Ejemplo: "0001", "0025".',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_cart',
      description:
        'Crea un nuevo carrito de compras vacío. SOLO usar UNA VEZ por conversación. Guardar el cart_id retornado para todas las operaciones siguientes. NUNCA crear múltiples carritos.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cart',
      description:
        'Obtiene el contenido del carrito del usuario: todos sus items, precios y el total. Úsalo cuando el usuario quiera ver su carrito.',
      parameters: {
        type: 'object',
        properties: {
          cart_id: {
            type: 'string',
            description: 'ID del carrito (guardado de create_cart).',
          },
        },
        required: ['cart_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description:
        'Agrega un producto al carrito. Requiere un cart_id existente. Si no hay carrito todavía, primero llamar a create_cart.',
      parameters: {
        type: 'object',
        properties: {
          cart_id: {
            type: 'string',
            description: 'ID del carrito.',
          },
          product_id: {
            type: 'string',
            description: 'ID del producto a agregar. Formato 4 dígitos: "0001".',
          },
          qty: {
            type: 'number',
            description: 'Cantidad a agregar. Mínimo 1.',
          },
        },
        required: ['cart_id', 'product_id', 'qty'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_cart_item',
      description: 'Actualiza la cantidad de un item en el carrito.',
      parameters: {
        type: 'object',
        properties: {
          cart_id: {
            type: 'string',
            description: 'ID del carrito.',
          },
          item_id: {
            type: 'string',
            description: 'ID del item dentro del carrito (obtenido de get_cart).',
          },
          qty: {
            type: 'number',
            description: 'Nueva cantidad (debe ser mayor a 0).',
          },
        },
        required: ['cart_id', 'item_id', 'qty'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_cart',
      description: 'Elimina un item del carrito.',
      parameters: {
        type: 'object',
        properties: {
          cart_id: {
            type: 'string',
            description: 'ID del carrito.',
          },
          item_id: {
            type: 'string',
            description: 'ID del item a eliminar (obtenido de get_cart).',
          },
        },
        required: ['cart_id', 'item_id'],
      },
    },
  },
] as const;

// ===== Ejecución de Tools =====

/**
 * Ejecuta una tool con los argumentos dados y devuelve el resultado como string JSON.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  productService: ProductService,
  cartService: CartService
): Promise<string> {
  console.log(`🔧 Executing tool: ${toolName}`, args);

  try {
    let result: any;

    switch (toolName) {
      case 'list_products': {
        const allProducts = await productService.listProducts(args.search);
        const limit = args.limit ?? 8;
        const products = allProducts.slice(0, limit);
        const simplified = products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          available: p.available,
        }));
        result = { products: simplified, count: simplified.length, total_in_catalog: allProducts.length };
        break;
      }

      case 'get_product': {
        const productId = String(args.product_id).padStart(4, '0');
        const product = await productService.getProductById(productId);
        result = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          available: product.available,
        };
        break;
      }

      case 'create_cart': {
        const cart = await cartService.createCart();
        result = {
          cart_id: cart.id,
          status: 'created',
          message: 'Carrito creado exitosamente.',
        };
        break;
      }

      case 'get_cart': {
        const cart = await cartService.getCartWithItems(args.cart_id);
        const items = cart.items.map((item) => ({
          item_id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || 'Producto',
          qty: item.qty,
          unit_price: item.product?.price || 0,
          subtotal: item.subtotal,
        }));
        result = {
          cart_id: cart.id,
          items,
          items_count: items.length,
          total: cart.total,
        };
        break;
      }

      case 'add_to_cart': {
        const productId = String(args.product_id).padStart(4, '0');
        const item = await cartService.addProductToCart(args.cart_id, productId, args.qty || 1);
        result = {
          cart_id: args.cart_id,
          item_id: item.id,
          product_id: item.product_id,
          qty: item.qty,
          status: 'added',
        };
        break;
      }

      case 'update_cart_item': {
        const item = await cartService.updateCartItem(args.cart_id, args.item_id, args.qty);
        result = {
          cart_id: args.cart_id,
          item_id: item.id,
          qty: item.qty,
          status: 'updated',
        };
        break;
      }

      case 'remove_from_cart': {
        await cartService.removeCartItem(args.cart_id, args.item_id);
        result = {
          cart_id: args.cart_id,
          item_id: args.item_id,
          status: 'removed',
        };
        break;
      }

      default:
        result = { error: `Tool desconocida: ${toolName}` };
    }

    console.log(`✅ Tool ${toolName} result:`, JSON.stringify(result).substring(0, 200));
    return JSON.stringify(result);
  } catch (error: any) {
    console.error(`❌ Tool ${toolName} error:`, error.message);
    return JSON.stringify({ error: error.message, tool: toolName });
  }
}
