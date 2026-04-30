/**
 * Chat Route — POST /chat
 *
 * Endpoint que recibe mensajes del usuario, los pasa al agente de IA,
 * y devuelve la respuesta generada.
 *
 * Body: { message: string, session_id?: string, history?: ChatMessage[] }
 * Response: { reply: string, session_id: string }
 */

import { Env, ChatRequest, ChatResponse, ChatMessage } from '../types/index.js';
import { ProductService } from '../services/product.service.js';
import { CartService } from '../services/cart.service.js';
import { LaburenAgent } from '../agent/agent.js';

export class ChatRoutes {
  private productService: ProductService;
  private cartService: CartService;

  constructor(productService: ProductService, cartService: CartService) {
    this.productService = productService;
    this.cartService = cartService;
  }

  async handleRequest(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Parsear body
      let body: ChatRequest;
      try {
        body = await request.json<ChatRequest>();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { message, session_id, history = [] } = body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'El campo "message" es requerido y no puede estar vacío.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generar session_id si no viene
      const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      console.log(`💬 Chat request — session: ${sessionId} — message: "${message.substring(0, 80)}"`);

      // Instanciar el agente con el env actual
      const agent = new LaburenAgent(env, this.productService, this.cartService);

      // Ejecutar el loop del agente
      const reply = await agent.chat(message.trim(), history as ChatMessage[]);

      const responseBody: ChatResponse = {
        reply,
        session_id: sessionId,
      };

      console.log(`✅ Chat response — session: ${sessionId} — reply length: ${reply.length}`);

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('❌ Chat route error:', error);
      return new Response(
        JSON.stringify({
          error: 'Error interno al procesar el mensaje.',
          details: error.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
}
