/**
 * MCP HTTP Backend - Laburen AI Agent
 * 
 * Cloudflare Worker con endpoints REST para manejo de productos y carritos
 * Diseñado para ser consumido por un Agente de IA conversacional
 * 
 * Endpoints:
 * - GET    /products           - Lista productos (con filtro opcional ?search=...)
 * - GET    /products/:id       - Obtiene un producto
 * - POST   /carts              - Crea un carrito nuevo
 * - GET    /carts/:cart_id     - Obtiene un carrito con items
 * - POST   /carts/:cart_id/items - Agrega producto al carrito (body: {product_id, qty})
 * - PUT    /carts/:cart_id/items/:item_id - Actualiza cantidad de item
 * - DELETE /carts/:cart_id/items/:item_id - Elimina item del carrito
 */

import { Env } from './types';
import { createDbClient } from './db/client';
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { ProductRoutes } from './routes/products';
import { CartRoutes } from './routes/carts';
import { AdminRoutes } from './routes/admin';
import { errorResponse } from './utils/errors';
import { handleSSE } from './mcp/sse-handler';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Configurar CORS para permitir llamadas desde cualquier origen
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Manejar preflight requests
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

      // Inicializar routers
      const productRoutes = new ProductRoutes(productService);
      const cartRoutes = new CartRoutes(cartService);
      const adminRoutes = new AdminRoutes(productService);

      // Parsear path
      const pathSegments = path.split('/').filter(p => p.length > 0);

      // Health check
      if (path === '/' || path === '/health') {
        return new Response(
          JSON.stringify({
            success: true,
            service: 'Laburen AI Agent MCP',
            status: 'healthy',
            timestamp: new Date().toISOString()
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      let response: Response;

      // Routing
      // MCP SSE endpoint
      if (pathSegments[0] === 'sse' || path === '/sse') {
        return await handleSSE(request, productService, cartService);
      } else if (pathSegments[0] === 'products') {
        response = await productRoutes.handleRequest(request, pathSegments.slice(1));
      } else if (pathSegments[0] === 'carts') {
        response = await cartRoutes.handleRequest(request, pathSegments.slice(1));
      } else if (pathSegments[0] === 'admin') {
        response = await adminRoutes.handleRequest(request, pathSegments.slice(1));
      } else {
        response = errorResponse(404, 'Ruta no encontrada', 'NOT_FOUND');
      }

      // Agregar headers CORS a la respuesta
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      console.error('Error no manejado:', error);
      const response = errorResponse(500, 'Error interno del servidor', 'INTERNAL_ERROR');
      
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers
      });
    }
  }
};
