/**
 * AI Shopping Agent
 *
 * Agente de inteligencia artificial que usa Cloudflare Workers AI (Llama 3.1)
 * con function-calling para interactuar con el catálogo de productos.
 *
 * Flujo agentico:
 * 1. Recibe el mensaje del usuario + historial
 * 2. Llama al LLM con tools disponibles
 * 3. Si el LLM quiere usar una tool → la ejecuta
 * 4. Repite hasta que el LLM genere una respuesta final (sin tool calls)
 * 5. Devuelve la respuesta al usuario
 */

import { Env, ChatMessage } from '../types/index.js';
import { ProductService } from '../services/product.service.js';
import { CartService } from '../services/cart.service.js';
import { SessionService } from '../services/session.service.js';
import { AGENT_TOOLS, executeTool } from './tools.js';

// System prompt del agente
const SYSTEM_PROMPT = `Eres Lau, la Asistente de Compras de una tienda de moda.
Eres amigable, entusiasta y muy útil. SIEMPRE respondes en español de Argentina.

Tu trabajo:
- Ayudar a los clientes a explorar el catálogo de productos de moda
- Buscar productos por nombre, color, tipo o talla
- Agregar productos al carrito de compras
- Mostrar el contenido del carrito y los totales
- Modificar cantidades o eliminar productos del carrito

REGLAS ABSOLUTAS — NUNCA las ignores:
1. NUNCA hagas cálculos matemáticos vos misma. Los totales y subtotales vienen ya calculados en los resultados de las tools. Solo copiá los números tal como te los dan.
2. NUNCA menciones nombres de funciones, variables, parámetros, ni el nombre de las tools. NO digas "la función get_cart", "el parámetro cart_id", "llamar a la tool", etc. Esas son cosas internas que el usuario NUNCA debe saber.
3. NUNCA describas cómo funcionan las herramientas. Si necesitás información, USÁ la tool directamente y respondé con los datos obtenidos, como una vendedora real.
4. SOLO crea UN carrito por conversación. Guarda el cart_id y reutilizalo siempre.
5. Los precios están en pesos argentinos. Muéstralos con formato $X,XXX (ej: $1,058).
6. Sé concisa pero amigable. Usa emojis con moderación (👕 🛒 ✅).
7. Si algo falla, explicá qué pasó de forma clara y ofrecé alternativas.
8. Cuando muestres productos, mostrá: nombre, precio y stock disponible.
9. Cuando muestres el carrito, usá el total que te da la tool. NO lo recalculés.
10. Siempre preguntá si el usuario necesita algo más después de cada acción.

Ejemplo de respuesta al mostrar productos:
"¡Encontré estas opciones para ti! 👕
• Camiseta Azul Talla M — $599 (5 disponibles)
• Camiseta Negra Talla L — $599 (3 disponibles)
¿Alguna te interesa? Te la agrego al carrito 🛒"

Ejemplo de respuesta al mostrar el carrito:
"Este es tu carrito 🛒
• Pantalón Verde — $1,058 x 2 = $2,116
• Camiseta Azul Talla M — $599 x 1 = $599
Total: $2,715
¿Querés agregar algo más?"`;

/**
 * Intenta extraer tool calls desde una respuesta de texto plano.
 * Algunos modelos generan JSON en vez de usar tool_calls nativas.
 */
function parseToolCallsFromText(text: string): any[] | null {
  if (!text || typeof text !== 'string') return null;

  // Buscar bloques JSON tipo: {"function": "list_products", "arguments": {...}}
  // o {"tool": "list_products", "args": {...}}
  const patterns = [
    /\{\s*["']function["']\s*:\s*["'](\w+)["']\s*,\s*["']arguments["']\s*:\s*(\{[^}]*\})\s*\}/,
    /\{\s*["']tool["']\s*:\s*["'](\w+)["']\s*,\s*["']arguments["']\s*:\s*(\{[^}]*\})\s*\}/,
    /\{\s*["']name["']\s*:\s*["'](\w+)["']\s*,\s*["']arguments["']\s*:\s*(\{[^}]*\})\s*\}/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const args = JSON.parse(match[2]);
        return [{ name: match[1], arguments: args, id: `parsed_${Date.now()}` }];
      } catch {
        // continue
      }
    }
  }

  return null;
}

/**
 * Limpia la respuesta del agente eliminando menciones a nombres de funciones,
 * variables internas, o descripciones técnicas que el modelo a veces incluye.
 */
function cleanAgentResponse(text: string): string {
  if (!text) return text;

  // Patrones de nombres técnicos que NUNCA deben aparecer en la respuesta al usuario
  const technicalPatterns = [
    // Nombres de funciones/tools
    /\b(list_products|search_products_by_attributes|get_product|create_cart|get_cart|add_to_cart|update_cart_item|remove_from_cart)\b/gi,
    // Parámetros comunes
    /\b(cart_id|product_id|item_id|tool_call|function_call|args|arguments)\b/gi,
    // Frases técnicas comunes
    /la funci[oó]n\s+[`"]\w+[`"]/gi,
    /la tool\s+[`"]\w+[`"]/gi,
    /voy a (llamar|usar|invocar)\s+(la funci[oó]n|la tool|el m[eé]todo)/gi,
    /necesito (llamar|usar)\s+(una funci[oó]n|una tool)/gi,
    /devuelve un objeto/gi,
    /comando\s+`/gi,
    /par[aá]metro\s+\w+/gi,
  ];

  let cleaned = text;

  // Si detectamos patrones técnicos, marcamos la respuesta como sospechosa
  const hasTechnicalContent = technicalPatterns.some((p) => p.test(text));

  if (hasTechnicalContent) {
    console.warn('⚠️ Detected technical content in response. Cleaning...');
    // Eliminamos líneas que contengan esos patrones
    const lines = cleaned.split('\n');
    cleaned = lines
      .filter((line) => {
        const lineLower = line.toLowerCase();
        return !technicalPatterns.some((p) => p.test(line));
      })
      .join('\n')
      .trim();

    // Si después de limpiar quedó muy corto o vacío, devolvemos un fallback amigable
    if (cleaned.length < 10) {
      return '¡Perfecto! Ya procesé tu solicitud. ¿Necesitás que te muestre algo más? 🛒';
    }
  }

  return cleaned;
}

export class AiShopAgent {
  private productService: ProductService;
  private cartService: CartService;
  private sessionService: SessionService;
  private ai: Env['AI'];

  constructor(env: Env, productService: ProductService, cartService: CartService, sessionService: SessionService) {
    this.ai = env.AI;
    this.productService = productService;
    this.cartService = cartService;
    this.sessionService = sessionService;
  }

  /**
   * Procesa un mensaje del usuario y devuelve la respuesta del agente.
   * Implementa el loop agentico con function-calling.
   */
  async chat(userMessage: string, history: ChatMessage[] = [], sessionId?: string): Promise<string> {
    // Verificar que el binding de AI esté disponible
    if (!this.ai) {
      console.error('❌ AI binding is undefined. Make sure [ai] binding is configured in wrangler.toml and you are running with wrangler dev.');
      throw new Error('El servicio de IA no está configurado. Verifica tu wrangler.toml y que hayas hecho wrangler login.');
    }

    // Few-shot examples para guiar al modelo a usar tools correctamente.
    // Incluimos ejemplos de listar productos, buscar por atributos y ver carrito
    // para que el modelo aprenda a NO calcular manualmente y a NO mencionar funciones.
    const fewShotExamples: any[] = [
      {
        role: 'user',
        content: 'Quiero ver los productos disponibles',
      },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'fs_1', name: 'list_products', arguments: '{}' }],
      },
      {
        role: 'tool',
        content: '{"products":[{"id":"0001","name":"Pantalón Verde","price":1058,"stock":177}],"count":1}',
        tool_call_id: 'fs_1',
      },
      {
        role: 'assistant',
        content: '¡Encontré estas opciones para ti! 👕\n• Pantalón Verde — $1,058 (177 disponibles)\n¿Alguno te interesa?',
      },
      {
        role: 'user',
        content: 'Traeme ropa talle L',
      },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'fs_2', name: 'search_products_by_attributes', arguments: '{"size":"L"}' }],
      },
      {
        role: 'tool',
        content: '{"products":[{"id":"0007","name":"Pantalón Gris Talla L","price":1331,"stock":436}],"count":1,"filters":{"size":"L"}}',
        tool_call_id: 'fs_2',
      },
      {
        role: 'assistant',
        content: '¡Encontré productos en talla L! 👕\n• Pantalón Gris Talla L — $1,331 (436 disponibles)\n¿Te interesa alguno?',
      },
      {
        role: 'user',
        content: 'Mostrame mi carrito',
      },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'fs_3', name: 'get_cart', arguments: '{"cart_id":"CART_123"}' }],
      },
      {
        role: 'tool',
        content: '{"cart_id":"CART_123","items":[{"item_id":"CI_1","product_id":"0001","product_name":"Pantalón Verde","qty":2,"unit_price":1058,"subtotal":2116}],"items_count":1,"total":2116,"total_formatted":"$2,116"}',
        tool_call_id: 'fs_3',
      },
      {
        role: 'assistant',
        content: 'Este es tu carrito 🛒\n• Pantalón Verde — $1,058 x 2 = $2,116\nTotal: $2,116\n¿Querés agregar algo más?',
      },
    ];

    // Construir el array de mensajes para el LLM
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...fewShotExamples,
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
      })),
      { role: 'user', content: userMessage },
    ];

    console.log(`🤖 Starting agent loop. History length: ${history.length}`);

    // Loop agentico — máximo 5 iteraciones para evitar loops infinitos
    const MAX_ITERATIONS = 5;
    let reminderAdded = false;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      console.log(`🔄 Agent iteration ${iteration + 1}`);

      let response: any;

      try {
        // Modelo más robusto para function-calling
        const modelName = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
        const requestBody = {
          messages,
          tools: AGENT_TOOLS,
          max_tokens: 1024,
          temperature: 0.1,
        };
        console.log(`📤 Calling AI model: ${modelName}`);
        console.log(`📤 Request body (truncated):`, JSON.stringify(requestBody).substring(0, 500));

        // Llamar al LLM con tools disponibles
        response = await (this.ai as any).run(modelName, requestBody);

        console.log(`📥 Raw AI response:`, JSON.stringify(response));
      } catch (error: any) {
        console.error('❌ AI call failed:', error?.message || error);
        console.error('❌ AI call stack:', error?.stack || 'No stack trace');
        throw new Error(`Error al llamar al modelo de IA: ${error?.message || 'Unknown error'}`);
      }

      console.log(`📨 LLM response type:`, typeof response);

      // Cloudflare AI puede devolver el resultado de distintas formas
      const result = response?.response ?? response?.result ?? response;

      // Verificar si el LLM quiere llamar tools
      const toolCalls = result?.tool_calls ?? response?.tool_calls;

      if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
        console.log(`🔧 LLM requested ${toolCalls.length} tool call(s)`);

        // Agregar la respuesta del asistente con las tool calls al historial
        messages.push({
          role: 'assistant',
          content: result?.response || '',
          tool_calls: toolCalls,
        });

        // Ejecutar cada tool call
        for (const toolCall of toolCalls) {
          const toolName = toolCall.name ?? toolCall.function?.name;
          let toolArgs: Record<string, any> = {};

          try {
            const argsRaw = toolCall.arguments ?? toolCall.function?.arguments ?? '{}';
            toolArgs = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
          } catch {
            toolArgs = {};
          }

          // Si el modelo no proporcionó cart_id pero hay uno en sesión, usarlo
          if (sessionId && !toolArgs.cart_id &&
            (toolName === 'add_to_cart' || toolName === 'get_cart' || toolName === 'update_cart_item' || toolName === 'remove_from_cart')) {
            const sessionCartId = await this.sessionService.getCartId(sessionId);
            if (sessionCartId) {
              console.log(`📦 Using cart_id from session: ${sessionCartId}`);
              toolArgs.cart_id = sessionCartId;
            }
          }

          let toolResult = await executeTool(
            toolName,
            toolArgs,
            this.productService,
            this.cartService
          );

          // Auto-corrección: si el modelo intentó usar un carrito inexistente,
          // primero buscar en la sesión un carrito válido antes de crear uno nuevo.
          const parsedResult = (() => {
            try { return JSON.parse(toolResult); } catch { return null; }
          })();

          const isCartNotFound = parsedResult?.error?.toLowerCase?.().includes('no encontrado') &&
            (toolName === 'add_to_cart' || toolName === 'get_cart' || toolName === 'update_cart_item' || toolName === 'remove_from_cart');

          if (isCartNotFound && sessionId) {
            const sessionCartId = await this.sessionService.getCartId(sessionId);
            if (sessionCartId && sessionCartId !== toolArgs.cart_id) {
              console.warn(`⚠️ Cart ${toolArgs.cart_id} not found. Retrying with session cart: ${sessionCartId}`);
              toolArgs.cart_id = sessionCartId;
              toolResult = await executeTool(toolName, toolArgs, this.productService, this.cartService);
            } else if (!sessionCartId && toolName === 'add_to_cart') {
              // Solo crear carrito automáticamente para add_to_cart si no hay sesión
              console.warn(`⚠️ No session cart found. Auto-creating cart...`);
              const newCart = await this.cartService.createCart();
              toolArgs.cart_id = newCart.id;
              await this.sessionService.setCartId(sessionId, newCart.id);
              console.log(`💾 Saved cart_id ${newCart.id} to session ${sessionId}`);
              toolResult = await executeTool(toolName, toolArgs, this.productService, this.cartService);
            } else if (!sessionCartId && toolName === 'get_cart') {
              // Para get_cart, no crear carrito vacío; informar que no hay carrito
              toolResult = JSON.stringify({ items: [], items_count: 0, total: 0, message: 'No tienes un carrito activo todavía.' });
            }
          }

          // Si se ejecutó create_cart exitosamente, guardar el cart_id en sesión
          if (toolName === 'create_cart' && sessionId) {
            const createdCart = (() => { try { return JSON.parse(toolResult); } catch { return null; } })();
            if (createdCart?.cart_id) {
              await this.sessionService.setCartId(sessionId, createdCart.cart_id);
              console.log(`💾 Saved cart_id ${createdCart.cart_id} to session ${sessionId}`);
            }
          }

          // Agregar resultado de la tool al historial
          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCall.id ?? `tool_${iteration}`,
          });
        }

        // Continuar el loop para que el LLM procese los resultados
        continue;
      }

      // El LLM generó una respuesta de texto final
      const textResponse =
        typeof result === 'string'
          ? result
          : result?.response
          ?? result?.content
          ?? result?.text
          ?? '';

      // Fallback: si el modelo no usó tool_calls nativas pero escribió un JSON
      // con una llamada a función en el texto, parsearlo manualmente.
      const parsedToolCalls = parseToolCallsFromText(textResponse);
      if (parsedToolCalls && parsedToolCalls.length > 0) {
        console.log(`🔧 Parsed ${parsedToolCalls.length} tool call(s) from text response`);
        messages.push({
          role: 'assistant',
          content: textResponse,
        });
        for (const toolCall of parsedToolCalls) {
          const toolResult = await executeTool(
            toolCall.name,
            toolCall.arguments,
            this.productService,
            this.cartService
          );
          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }
        continue;
      }

      // Si la respuesta parece una descripción técnica de una función en vez de
      // una respuesta conversacional, agregar un recordatorio y reintentar una vez.
      const looksLikeTechnicalDescription =
        !reminderAdded &&
        textResponse &&
        (textResponse.toLowerCase().includes('la función') ||
          textResponse.toLowerCase().includes('devuelve un objeto') ||
          textResponse.toLowerCase().includes('comando `'));

      if (looksLikeTechnicalDescription) {
        console.warn('⚠️ LLM described a tool instead of using it. Adding reminder and retrying...');
        messages.push({
          role: 'assistant',
          content: textResponse,
        });
        messages.push({
          role: 'system',
          content:
            'IMPORTANTE: No describas las funciones. Si necesitas información de productos o del carrito, USA las tools disponibles llamándolas directamente. No hables sobre "la función list_products" ni sobre comandos. Actúa como Lau, la asistente de compras, y usa las tools para obtener los datos.',
        });
        reminderAdded = true;
        continue;
      }

      if (textResponse) {
        console.log(`✅ Agent finished after ${iteration + 1} iteration(s)`);
        const cleanedResponse = cleanAgentResponse(textResponse.trim());
        return cleanedResponse;
      }

      // Si no hay respuesta de texto ni tool calls, algo salió mal
      console.warn('⚠️ LLM returned empty response, raw:', JSON.stringify(response).substring(0, 500));
      return 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.';
    }

    // Se alcanzó el límite de iteraciones
    console.warn('⚠️ Agent reached max iterations');
    return 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta con un mensaje más sencillo.';
  }
}
