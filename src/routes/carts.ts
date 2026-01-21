// Rutas para carritos
// POST /carts
// GET /carts/:cart_id
// POST /carts/:cart_id/items
// PUT /carts/:cart_id/items/:item_id
// DELETE /carts/:cart_id/items/:item_id

import { CartService } from '../services/cart.service';
import { successResponse, handleError, errorResponse } from '../utils/errors';
import { AddToCartRequest, UpdateCartItemRequest } from '../types';

export class CartRoutes {
  constructor(private cartService: CartService) {}

  /**
   * POST /carts
   * Crea un nuevo carrito
   */
  async createCart(): Promise<Response> {
    try {
      const cart = await this.cartService.createCart();
      return successResponse(cart, 201);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /carts/:cart_id
   * Obtiene un carrito con todos sus items
   */
  async getCart(cartId: string, request?: Request): Promise<Response> {
    try {
      // FALLBACK: Si cart_id viene como placeholder literal, tomarlo del query
      if (cartId === ':cart_id' || cartId === '{cart_id}') {
        if (request) {
          const url = new URL(request.url);
          const queryCartId = url.searchParams.get('cart_id');
          if (queryCartId) {
            cartId = queryCartId;
          } else {
            return errorResponse(400, 'cart_id es requerido como query param (?cart_id=xxx)', 'VALIDATION_ERROR');
          }
        } else {
          return errorResponse(400, 'cart_id es requerido', 'VALIDATION_ERROR');
        }
      }
      
      const cart = await this.cartService.getCartWithItems(cartId);
      return successResponse(cart);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /carts/:cart_id/items
   * Agrega un producto al carrito
   * Body: { product_id: string, qty?: number }
   */
  async addProductToCart(
    cartId: string,
    request: Request
  ): Promise<Response> {
    try {
      const body = await request.json<AddToCartRequest>().catch(() => ({}));
      
      // FALLBACK: Si cart_id viene como :cart_id literal, intentar obtenerlo del body
      if (cartId === ':cart_id' || cartId === '{cart_id}') {
        cartId = (body as any).cart_id;
        if (!cartId) {
          return errorResponse(400, 'El campo cart_id es requerido (envíalo en la URL o en el body)', 'VALIDATION_ERROR');
        }
      }
      
      // LOG para debugging
      console.log('[ADD_TO_CART] Received request:', {
        cartId,
        body: JSON.stringify(body),
        product_id_type: typeof body.product_id,
        product_id_value: body.product_id
      });
      
      // Normalizar product_id (puede venir como número o string)
      let productId = body.product_id;
      if (!productId) {
        return errorResponse(400, 'El campo product_id es requerido', 'VALIDATION_ERROR');
      }
      
      // Convertir a string y formatear con padding si es necesario
      productId = String(productId).padStart(4, '0');
      console.log('[ADD_TO_CART] Normalized product_id:', productId);
      
      // Normalizar qty (puede venir como string o número, o vacío)
      let qty = 1;
      if (body.qty !== undefined && body.qty !== null && body.qty !== '') {
        qty = Number(body.qty);
        if (isNaN(qty) || qty <= 0) {
          return errorResponse(400, 'El campo qty debe ser un número positivo', 'VALIDATION_ERROR');
        }
      }

      const item = await this.cartService.addProductToCart(cartId, productId, qty);
      return successResponse(item, 201);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * PUT /carts/:cart_id/items/:item_id
   * Actualiza la cantidad de un item
   * Body: { qty: number }
   */
  async updateCartItem(
    cartId: string,
    itemId: string,
    request: Request
  ): Promise<Response> {
    try {
      const body = await request.json<UpdateCartItemRequest>();
      
      // FALLBACK: Si vienen como placeholders, obtenerlos del body
      if (cartId === ':cart_id' || cartId === '{cart_id}' || cartId === '%7Bcart_id%7D') {
        cartId = (body as any).cart_id || '';
      }
      if (itemId === ':item_id' || itemId === '{item_id}' || itemId === '%7Bitem_id%7D') {
        itemId = (body as any).item_id || '';
      }
      if (!cartId || !itemId || cartId.includes('cart_id') || itemId.includes('item_id')) {
        return errorResponse(400, 'cart_id e item_id son requeridos en el body (ej: {"cart_id": "cart_xxx", "item_id": "item_xxx", "qty": 5})', 'VALIDATION_ERROR');
      }
      
      // Normalizar qty (puede venir como string o número)
      if (body.qty === undefined || body.qty === null || body.qty === '') {
        return errorResponse(400, 'El campo qty es requerido', 'VALIDATION_ERROR');
      }
      
      const qty = Number(body.qty);
      if (isNaN(qty) || qty <= 0) {
        return errorResponse(400, 'El campo qty debe ser un número positivo', 'VALIDATION_ERROR');
      }

      const item = await this.cartService.updateCartItem(cartId, itemId, qty);
      return successResponse(item);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /carts/:cart_id/items/:item_id
   * Elimina un item del carrito
   */
  async removeCartItem(cartId: string, itemId: string, request?: Request): Promise<Response> {
    try {
      // FALLBACK: Si vienen como placeholders, obtenerlos del query
      if (cartId === ':cart_id' || cartId === '{cart_id}' || cartId === '%7Bcart_id%7D') {
        if (request) {
          const url = new URL(request.url);
          cartId = url.searchParams.get('cart_id') || '';
        }
      }
      if (itemId === ':item_id' || itemId === '{item_id}' || itemId === '%7Bitem_id%7D') {
        if (request) {
          const url = new URL(request.url);
          itemId = url.searchParams.get('item_id') || '';
        }
      }
      if (!cartId || !itemId || cartId.includes('cart_id') || itemId.includes('item_id')) {
        return errorResponse(400, 'cart_id e item_id son requeridos como query params (?cart_id=xxx&item_id=xxx)', 'VALIDATION_ERROR');
      }
            await this.cartService.removeCartItem(cartId, itemId);
      return successResponse({ message: 'Item eliminado correctamente' });
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Router para /carts/*
   */
  async handleRequest(request: Request, pathParts: string[]): Promise<Response> {
    const method = request.method;

    // POST /carts (crear carrito)
    if (pathParts.length === 0 && method === 'POST') {
      return this.createCart();
    }

    // GET /carts/:cart_id (obtener carrito)
    if (pathParts.length === 1 && method === 'GET') {
      return this.getCart(pathParts[0]);
    }

    // POST /carts/:cart_id/items (agregar producto)
    if (pathParts.length === 2 && pathParts[1] === 'items' && method === 'POST') {
      return this.addProductToCart(pathParts[0], request);
    }

    // PUT /carts/:cart_id/items/:item_id (actualizar cantidad)
    if (pathParts.length === 3 && pathParts[1] === 'items' && method === 'PUT') {
      return this.updateCartItem(pathParts[0], pathParts[2], request);
    }

    // DELETE /carts/:cart_id/items/:item_id (eliminar item)
    if (pathParts.length === 3 && pathParts[1] === 'items' && method === 'DELETE') {
      return this.removeCartItem(pathParts[0], pathParts[2]);
    }

    return new Response('Not Found', { status: 404 });
  }
}
