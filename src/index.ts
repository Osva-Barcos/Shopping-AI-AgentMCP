/**
 * Laburen AI Agent — Cloudflare Worker
 *
 * Endpoints:
 * - GET    /              — Frontend del chat (página principal)
 * - POST   /chat          — Endpoint del agente de IA
 * - GET    /products      — Lista productos
 * - GET    /products/:id  — Obtiene un producto
 * - POST   /carts         — Crea un carrito nuevo
 * - GET    /carts/:id     — Obtiene un carrito con items
 * - POST   /carts/:id/items        — Agrega producto al carrito
 * - PUT    /carts/:id/items/:item  — Actualiza cantidad
 * - DELETE /carts/:id/items/:item  — Elimina item
 * - GET    /sse           — MCP SSE endpoint (legacy)
 */

import { Env } from './types/index.js';
import { createDbClient } from './db/client.js';
import { ProductService } from './services/product.service.js';
import { CartService } from './services/cart.service.js';
import { ProductRoutes } from './routes/products.js';
import { CartRoutes } from './routes/carts.js';
import { AdminRoutes } from './routes/admin.js';
import { ChatRoutes } from './routes/chat.js';
import { errorResponse } from './utils/errors.js';
import { handleSSE } from './mcp/sse-handler.js';
import { FRONTEND_HTML } from './frontend.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Inicializar servicios
      const dbClient = createDbClient(env);
      const productService = new ProductService(dbClient);
      const cartService = new CartService(dbClient, productService);

      const pathSegments = path.split('/').filter((p) => p.length > 0);

      // ── Frontend — página principal ──────────────────────────────────────
      if (path === '/' || path === '') {
        return new Response(FRONTEND_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // ── Health check ─────────────────────────────────────────────────────
      if (path === '/health') {
        return new Response(
          JSON.stringify({
            success: true,
            service: 'Laburen AI Agent',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            endpoints: {
              frontend: '/',
              chat: 'POST /chat',
              rest_api: '/products, /carts',
              mcp_sse: '/sse',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ── Diagnostics ───────────────────────────────────────────────────────
      if (path === '/diagnostics') {
        const testProducts = await productService.listProducts('pantalon');
        return new Response(
          JSON.stringify({
            success: true,
            service: 'Laburen AI Agent',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            tests: {
              database: testProducts.length > 0 ? 'OK' : 'FAIL',
              products_count: testProducts.length,
              ai_model: '@cf/meta/llama-3.1-8b-instruct',
              chat_endpoint: url.origin + '/chat',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let response: Response;

      // ── Chat endpoint (agente de IA) ─────────────────────────────────────
      if (path === '/chat') {
        const chatRoutes = new ChatRoutes(productService, cartService);
        return await chatRoutes.handleRequest(request, env);
      }

      // ── MCP SSE endpoint ──────────────────────────────────────────────────
      if (pathSegments[0] === 'sse' || path === '/sse') {
        return await handleSSE(request, productService, cartService);
      }

      // ── REST API ──────────────────────────────────────────────────────────
      if (pathSegments[0] === 'products') {
        const productRoutes = new ProductRoutes(productService);
        response = await productRoutes.handleRequest(request, pathSegments.slice(1));
      } else if (pathSegments[0] === 'carts') {
        const cartRoutes = new CartRoutes(cartService);
        response = await cartRoutes.handleRequest(request, pathSegments.slice(1));
      } else if (pathSegments[0] === 'admin') {
        const adminRoutes = new AdminRoutes(productService);
        response = await adminRoutes.handleRequest(request, pathSegments.slice(1));
      } else {
        response = errorResponse(404, 'Ruta no encontrada', 'NOT_FOUND');
      }

      // Agregar headers CORS a la respuesta REST
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error('Error no manejado:', error);
      const response = errorResponse(500, 'Error interno del servidor', 'INTERNAL_ERROR');

      const headers = new Headers(response.headers);
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, { status: response.status, headers });
    }
  },
};

