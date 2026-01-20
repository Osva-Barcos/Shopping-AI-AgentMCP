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
  async getCart(cartId: string): Promise<Response> {
    try {
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
      
      if (!body.product_id) {
        return errorResponse(400, 'El campo product_id es requerido', 'VALIDATION_ERROR');
      }
      
      const qty = body.qty || 1;

      const item = await this.cartService.addProductToCart(cartId, body.product_id, qty);
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
      
      if (!body.qty || typeof body.qty !== 'number') {
        return errorResponse(400, 'El campo qty es requerido y debe ser un número', 'VALIDATION_ERROR');
      }

      const item = await this.cartService.updateCartItem(cartId, itemId, body.qty);
      return successResponse(item);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /carts/:cart_id/items/:item_id
   * Elimina un item del carrito
   */
  async removeCartItem(cartId: string, itemId: string): Promise<Response> {
    try {
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
