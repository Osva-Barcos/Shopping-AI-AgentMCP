// Servicio de carritos
// Lógica de negocio para carritos de compra

import { DbClient } from '../db/client.js';
import { ProductService } from './product.service.js';
import {
  Cart,
  CartItem,
  CartWithItems,
  CartItemDetail,
  NotFoundError,
  ValidationError,
  ConflictError
} from '../types/index.js';
import { generateId } from '../utils/errors.js';

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
   * Optimizado con un solo JOIN en lugar de múltiples queries
   */
  async getCartWithItems(cartId: string): Promise<CartWithItems> {
    const cart = await this.getCartById(cartId);

    // Query optimizada con JOIN - una sola consulta
    const itemsWithProducts = await this.db.all<any>(
      `SELECT 
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.qty,
        p.id as p_id,
        p.name as p_name,
        p.description as p_description,
        p.price as p_price,
        p.stock as p_stock,
        p.available as p_available
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?`,
      cartId
    );

    if (itemsWithProducts.length === 0) {
      return {
        ...cart,
        items: [],
        total: 0
      };
    }

    // Mapear los resultados
    const itemsWithDetail: CartItemDetail[] = itemsWithProducts.map(row => ({
      id: row.id,
      cart_id: row.cart_id,
      product_id: row.product_id,
      qty: row.qty,
      product: {
        id: row.p_id,
        name: row.p_name,
        description: row.p_description,
        price: row.p_price,
        stock: row.p_stock,
        available: row.p_available
      },
      subtotal: row.p_price * row.qty
    }));

    const total = itemsWithDetail.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      ...cart,
      items: itemsWithDetail,
      total
    };
  }

  /**
   * Agrega un producto al carrito
   * Optimizado: valida y ejecuta en menos queries
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

    // Query combinada: valida carrito, producto y item existente en paralelo
    const [cart, product, existingItem] = await Promise.all([
      this.getCartById(cartId),
      this.productService.getProductById(productId),
      this.db.get<CartItem>(
        'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?',
        cartId,
        productId
      )
    ]);

    // Validar disponibilidad
    if (product.available === 'No') {
      throw new ConflictError(
        `Product not available. "${product.name}" is not available for sale.`
      );
    }

    // Validar stock
    if (product.stock === 0) {
      throw new ConflictError(
        `Producto sin stock. "${product.name}" no tiene unidades disponibles.`
      );
    }

    const requiredQty = existingItem ? existingItem.qty + qty : qty;
    if (product.stock < requiredQty) {
      throw new ConflictError(
        `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${requiredQty}`
      );
    }

    if (existingItem) {
      // Actualizar cantidad existente
      const newQty = existingItem.qty + qty;
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
   * Optimizado: queries en paralelo
   */
  async updateCartItem(
    cartId: string,
    itemId: string,
    qty: number
  ): Promise<CartItem> {
    if (qty <= 0) {
      throw new ValidationError('La cantidad debe ser mayor a 0');
    }

    // Queries en paralelo
    const [cart, item] = await Promise.all([
      this.getCartById(cartId),
      this.db.get<CartItem>(
        'SELECT * FROM cart_items WHERE id = ? AND cart_id = ?',
        itemId,
        cartId
      )
    ]);

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

    // Actualizar en paralelo
    await Promise.all([
      this.db.run('UPDATE cart_items SET qty = ? WHERE id = ?', qty, itemId),
      this.updateCartTimestamp(cartId)
    ]);

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
