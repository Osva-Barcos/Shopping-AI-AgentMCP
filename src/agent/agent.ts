/**
 * Laburen AI Agent
 *
 * Agente de inteligencia artificial que usa Cloudflare Workers AI (Llama 3.1)
 * con function-calling para interactuar con la base de datos de Laburen.
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
import { AGENT_TOOLS, executeTool } from './tools.js';

// System prompt del agente
const SYSTEM_PROMPT = `Eres Lau, la asistente de compras de Laburen, una tienda de moda. 
Eres amigable, entusiasta y muy útil. Siempre respondes en español.

Tu trabajo:
- Ayudar a los clientes a explorar el catálogo de productos de moda
- Buscar productos por nombre, color, tipo o talla
- Agregar productos al carrito de compras
- Mostrar el contenido del carrito y los totales
- Modificar cantidades o eliminar productos del carrito

Reglas importantes:
- SOLO crea UN carrito por conversación. Guarda el cart_id y reutilízalo siempre.
- Los precios están en pesos. Muéstralos con formato $X,XXX (ej: $1,058).
- Sé concisa pero amigable. Usa emojis con moderación (👕 🛒 ✅).
- Si algo falla, explica qué pasó de forma clara y ofrece alternativas.
- Cuando muestres productos, muestra: nombre, precio y stock disponible.
- Siempre pregunta si el usuario necesita algo más después de cada acción.

Ejemplo de respuesta al mostrar productos:
"¡Encontré estas opciones para ti! 👕
• Camiseta Azul Talla M — $599 (5 disponibles)
• Camiseta Negra Talla L — $599 (3 disponibles)
¿Alguna te interesa? Te la agrego al carrito 🛒"`;

export class LaburenAgent {
  private productService: ProductService;
  private cartService: CartService;
  private ai: Env['AI'];

  constructor(env: Env, productService: ProductService, cartService: CartService) {
    this.ai = env.AI;
    this.productService = productService;
    this.cartService = cartService;
  }

  /**
   * Procesa un mensaje del usuario y devuelve la respuesta del agente.
   * Implementa el loop agentico con function-calling.
   */
  async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
    // Construir el array de mensajes para el LLM
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userMessage },
    ];

    console.log(`🤖 Starting agent loop. History length: ${history.length}`);

    // Loop agentico — máximo 5 iteraciones para evitar loops infinitos
    const MAX_ITERATIONS = 5;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      console.log(`🔄 Agent iteration ${iteration + 1}`);

      let response: any;

      try {
        // Llamar al LLM con tools disponibles
        response = await (this.ai as any).run('@cf/meta/llama-3.1-8b-instruct', {
          messages,
          tools: AGENT_TOOLS,
          max_tokens: 1024,
        });
      } catch (error: any) {
        console.error('❌ AI call failed:', error.message);
        throw new Error(`Error al llamar al modelo de IA: ${error.message}`);
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

          const toolResult = await executeTool(
            toolName,
            toolArgs,
            this.productService,
            this.cartService
          );

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

      if (textResponse) {
        console.log(`✅ Agent finished after ${iteration + 1} iteration(s)`);
        return textResponse.trim();
      }

      // Si no hay respuesta de texto ni tool calls, algo salió mal
      console.warn('⚠️ LLM returned empty response, raw:', JSON.stringify(response).substring(0, 300));
      return 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.';
    }

    // Se alcanzó el límite de iteraciones
    console.warn('⚠️ Agent reached max iterations');
    return 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta con un mensaje más sencillo.';
  }
}
