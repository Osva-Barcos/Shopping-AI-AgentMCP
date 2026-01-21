// Rutas para carritos
// POST /carts
// GET /carts/:cart_id o ?cart_id=xxx
// POST /carts/:cart_id/items o ?cart_id=xxx&product_id=xxx&qty=n
// PUT /carts/:cart_id/items/:item_id o ?cart_id=xxx&item_id=xxx&qty=n
// DELETE /carts/:cart_id/items/:item_id o ?cart_id=xxx&item_id=xxx

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
   * GET /carts/:cart_id o /carts?cart_id=xxx
   * Obtiene un carrito con todos sus items
   */
  async getCart(cartId: string, request?: Request): Promise<Response> {
    try {
      // Soportar ?cart_id como query parameter
      if (request) {
        const url = new URL(request.url);
        const queryCartId = url.searchParams.get('cart_id');
        if (queryCartId) {
          cartId = queryCartId;
        }
      }
      
      // Validar que tengamos un cart_id válido
      if (!cartId || cartId === ':cart_id' || cartId === '{cart_id}' || cartId.includes('cart_id')) {
        return errorResponse(400, 'cart_id es requerido (usa /carts/{id} o ?cart_id={id})', 'VALIDATION_ERROR');
      }
      
      console.log('🛒 GET CART:', { cartId });
      const cart = await this.cartService.getCartWithItems(cartId);
      console.log('✅ Cart retrieved:', cart.id, 'with', cart.items?.length || 0, 'items');
      return successResponse(cart);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /carts/:cart_id/items o /carts/items?cart_id=xxx
   * Agrega un producto al carrito
   * Body: { product_id: string, qty?: number }
   */
  async addProductToCart(
    cartId: string,
    request: Request
  ): Promise<Response> {
    try {
      const body = await request.json<AddToCartRequest>().catch(() => ({} as AddToCartRequest));
      const url = new URL(request.url);
      
      // Soportar cart_id desde query params, body o URL
      const queryCartId = url.searchParams.get('cart_id');
      
      if (queryCartId) {
        cartId = queryCartId;
      } else if (cartId === ':cart_id' || cartId === '{cart_id}' || cartId.includes('cart_id')) {
        cartId = (body as any).cart_id || '';
      }
      
      if (!cartId || cartId.includes('cart_id')) {
        return errorResponse(400, 'cart_id es requerido (URL, query param o body)', 'VALIDATION_ERROR');
      }
      
      // Soportar product_id desde query params o body
      let productId = url.searchParams.get('product_id') || body.product_id;
      
      console.log('🛒 ADD TO CART:', {
        cartId,
        product_id: productId,
        qty: body.qty,
        source: url.searchParams.get('product_id') ? 'query' : 'body'
      });
      
      if (!productId) {
        return errorResponse(400, 'product_id es requerido (body o query param)', 'VALIDATION_ERROR');
      }
      
      // Convertir a string y formatear con padding si es necesario
      productId = String(productId).padStart(4, '0');
      console.log('✅ Normalized product_id:', productId);
      
      // Soportar qty desde query params o body
      let qty = 1;
      const qtyParam = url.searchParams.get('qty') || body.qty;
      if (qtyParam !== undefined && qtyParam !== null && qtyParam !== '') {
        qty = Number(qtyParam);
        if (isNaN(qty) || qty <= 0) {
          return errorResponse(400, 'qty debe ser un número positivo', 'VALIDATION_ERROR');
        }
      }

      const item = await this.cartService.addProductToCart(cartId, productId, qty);
      console.log('✅ Item added to cart:', item.id);
      return successResponse(item, 201);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * PUT /carts/:cart_id/items/:item_id o ?cart_id=xxx&item_id=xxx
   * Actualiza la cantidad de un item
   * Body: { qty: number }
   */
  async updateCartItem(
    cartId: string,
    itemId: string,
    request: Request
  ): Promise<Response> {
    try {
      const body = await request.json<UpdateCartItemRequest>().catch(() => ({} as UpdateCartItemRequest));
      const url = new URL(request.url);
      
      // Soportar desde query params, body o URL
      const queryCartId = url.searchParams.get('cart_id');
      const queryItemId = url.searchParams.get('item_id');
      const queryQty = url.searchParams.get('qty');
      
      if (queryCartId) cartId = queryCartId;
      else if (cartId.includes('cart_id')) cartId = (body as any).cart_id || '';
      
      if (queryItemId) itemId = queryItemId;
      else if (itemId.includes('item_id')) itemId = (body as any).item_id || '';
      
      if (!cartId || !itemId || cartId.includes('cart_id') || itemId.includes('item_id')) {
        return errorResponse(400, 'cart_id e item_id son requeridos (URL, query params o body)', 'VALIDATION_ERROR');
      }
      
      console.log('🛒 UPDATE CART ITEM:', { cartId, itemId, qty: queryQty || body.qty });
      
      // Normalizar qty desde query o body
      const qtyValue = queryQty || body.qty;
      if (qtyValue === undefined || qtyValue === null || qtyValue === 0 || qtyValue === '') {
        return errorResponse(400, 'qty es requerido', 'VALIDATION_ERROR');
      }
      
      const qty = Number(qtyValue);
      if (isNaN(qty) || qty <= 0) {
        return errorResponse(400, 'qty debe ser un número positivo', 'VALIDATION_ERROR');
      }

      const item = await this.cartService.updateCartItem(cartId, itemId, qty);
      console.log('✅ Cart item updated:', item.id);
      return successResponse(item);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /carts/:cart_id/items/:item_id o ?cart_id=xxx&item_id=xxx
   * Elimina un item del carrito
   */
  async removeCartItem(cartId: string, itemId: string, request?: Request): Promise<Response> {
    try {
      // Soportar desde query params o URL
      if (request) {
        const url = new URL(request.url);
        const queryCartId = url.searchParams.get('cart_id');
        const queryItemId = url.searchParams.get('item_id');
        
        if (queryCartId) cartId = queryCartId;
        if (queryItemId) itemId = queryItemId;
      }
      
      if (!cartId || !itemId || cartId.includes('cart_id') || itemId.includes('item_id')) {
        return errorResponse(400, 'cart_id e item_id son requeridos (URL o query params)', 'VALIDATION_ERROR');
      }
      
      console.log('🛒 REMOVE FROM CART:', { cartId, itemId });
      await this.cartService.removeCartItem(cartId, itemId);
      console.log('✅ Item removed from cart');
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
      return this.getCart(pathParts[0], request);
    }

    // GET /carts?cart_id=xxx (obtener carrito por query)
    if (pathParts.length === 0 && method === 'GET') {
      return this.getCart('', request);
    }

    // POST /carts/:cart_id/items (agregar producto)
    if (pathParts.length === 2 && pathParts[1] === 'items' && method === 'POST') {
      return this.addProductToCart(pathParts[0], request);
    }

    // POST /carts/items?cart_id=xxx (agregar producto por query)
    if (pathParts.length === 1 && pathParts[0] === 'items' && method === 'POST') {
      return this.addProductToCart('', request);
    }

    // PUT /carts/:cart_id/items/:item_id (actualizar cantidad)
    if (pathParts.length === 3 && pathParts[1] === 'items' && method === 'PUT') {
      return this.updateCartItem(pathParts[0], pathParts[2], request);
    }

    // PUT /carts/items?cart_id=xxx&item_id=xxx (actualizar por query)
    if (pathParts.length === 1 && pathParts[0] === 'items' && method === 'PUT') {
      return this.updateCartItem('', '', request);
    }

    // DELETE /carts/items?cart_id=xxx&item_id=xxx (eliminar por query)
    if (pathParts.length === 1 && pathParts[0] === 'items' && method === 'DELETE') {
      return this.removeCartItem('', '', request);
    }

    // DELETE /carts/:cart_id/items/:item_id (eliminar item)
    if (pathParts.length === 3 && pathParts[1] === 'items' && method === 'DELETE') {
      return this.removeCartItem(pathParts[0], pathParts[2], request);
    }

    return new Response('Not Found', { status: 404 });
  }
}
