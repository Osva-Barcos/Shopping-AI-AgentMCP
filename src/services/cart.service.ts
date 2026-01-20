// Servicio de carritos
// Lógica de negocio para carritos de compra

import { DbClient } from '../db/client';
import { ProductService } from './product.service';
import {
  Cart,
  CartItem,
  CartWithItems,
  CartItemDetail,
  NotFoundError,
  ValidationError,
  ConflictError
} from '../types';
import { generateId } from '../utils/errors';

export class CartService {
  constructor(
    private db: DbClient,
    private productService: ProductService
  ) {}

  /**
   * Crea un nuevo carrito
   */
  async createCart(): Promise<Cart> {
    const id = generateId('cart');
    const now = new Date().toISOString();

    await this.db.run(
      `INSERT INTO carts (id, created_at, updated_at) VALUES (?, ?, ?)`,
      id,
      now,
      now
    );

    return {
      id,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Obtiene un carrito por ID
   */
  async getCartById(id: string): Promise<Cart> {
    const cart = await this.db.get<Cart>(
      'SELECT * FROM carts WHERE id = ?',
      id
    );

    if (!cart) {
      throw new NotFoundError(`Carrito con ID ${id} no encontrado`);
    }

    return cart;
  }

  /**
   * Obtiene un carrito completo con sus items y productos
   */
  async getCartWithItems(cartId: string): Promise<CartWithItems> {
    const cart = await this.getCartById(cartId);

    const items = await this.db.all<CartItem>(
      'SELECT * FROM cart_items WHERE cart_id = ?',
      cartId
    );

    if (items.length === 0) {
      return {
        ...cart,
        items: [],
        total: 0
      };
    }

    // Obtener los productos de los items
    const productIds = items.map(item => item.product_id);
    const products = await this.productService.getProductsByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    // Construir los items con detalle
    const itemsWithDetail: CartItemDetail[] = items.map(item => {
      const product = productMap.get(item.product_id)!;
      return {
        ...item,
        product,
        subtotal: product.price * item.qty
      };
    });

    const total = itemsWithDetail.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      ...cart,
      items: itemsWithDetail,
      total
    };
  }

  /**
   * Agrega un producto al carrito
   */
  async addProductToCart(
    cartId: string,
    productId: string,
    qty: number = 1
  ): Promise<CartItem> {
    // Validaciones
    if (qty <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0');
    }

    await this.getCartById(cartId); // Valida que existe el carrito
    const product = await this.productService.getProductById(productId);

    // Validar que el producto esté marcado como disponible
    if (product.available === 'No') {
      throw new ConflictError(
        `Product not available. "${product.name}" is not available for sale.`
      );
    }

    // Validar que el producto tenga stock
    if (product.stock === 0) {
      throw new ConflictError(
        `Producto sin stock. "${product.name}" no tiene unidades disponibles.`
      );
    }

    // Validar stock suficiente
    if (product.stock < qty) {
      throw new ConflictError(
        `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${qty}`
      );
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = await this.db.get<CartItem>(
      'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
      cartId,
      productId
    );

    if (existingItem) {
      // Actualizar cantidad
      const newQty = existingItem.qty + qty;
      
      if (product.stock < newQty) {
        throw new ConflictError(
          `Stock insuficiente. Disponible: ${product.stock}, en carrito: ${existingItem.qty}, solicitado: ${qty}`
        );
      }

      await this.db.run(
        'UPDATE cart_items SET qty = ? WHERE id = ?',
        newQty,
        existingItem.id
      );

      await this.updateCartTimestamp(cartId);

      return {
        ...existingItem,
        qty: newQty
      };
    }

    // Crear nuevo item
    const itemId = generateId('item');
    await this.db.run(
      `INSERT INTO cart_items (id, cart_id, product_id, qty) VALUES (?, ?, ?, ?)`,
      itemId,
      cartId,
      productId,
      qty
    );

    await this.updateCartTimestamp(cartId);

    return {
      id: itemId,
      cart_id: cartId,
      product_id: productId,
      qty
    };
  }

  /**
   * Actualiza la cantidad de un item en el carrito
   */
  async updateCartItem(
    cartId: string,
    itemId: string,
    qty: number
  ): Promise<CartItem> {
    if (qty <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0');
    }

    await this.getCartById(cartId); // Valida que existe el carrito

    const item = await this.db.get<CartItem>(
      'SELECT * FROM cart_items WHERE id = ? AND cart_id = ?',
      itemId,
      cartId
    );

    if (!item) {
      throw new NotFoundError(`Item con ID ${itemId} no encontrado en el carrito`);
    }

    // Validar stock
    const product = await this.productService.getProductById(item.product_id);
    if (product.stock < qty) {
      throw new ConflictError(
        `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${qty}`
      );
    }

    await this.db.run(
      'UPDATE cart_items SET qty = ? WHERE id = ?',
      qty,
      itemId
    );

    await this.updateCartTimestamp(cartId);

    return {
      ...item,
      qty
    };
  }

  /**
   * Elimina un item del carrito
   */
  async removeCartItem(cartId: string, itemId: string): Promise<void> {
    await this.getCartById(cartId); // Valida que existe el carrito

    const result = await this.db.run(
      'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
      itemId,
      cartId
    );

    if (!result.success) {
      throw new NotFoundError(`Item con ID ${itemId} no encontrado en el carrito`);
    }

    await this.updateCartTimestamp(cartId);
  }

  /**
   * Actualiza el timestamp de updated_at del carrito
   */
  private async updateCartTimestamp(cartId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE carts SET updated_at = ? WHERE id = ?',
      now,
      cartId
    );
  }
}
