// Servicio de productos
// Lógica de negocio para productos

import { DbClient } from '../db/client';
import { Product, NotFoundError } from '../types';

export class ProductService {
  constructor(private db: DbClient) {}

  /**
   * Lista todos los productos con filtro opcional de búsqueda
   * @param search - Busca en nombre o descripción
   */
  async listProducts(search?: string): Promise<Product[]> {
    if (search) {
      const searchTerm = `%${search}%`;
      return await this.db.all<Product>(
        `SELECT * FROM products 
         WHERE name LIKE ? OR description LIKE ?
         ORDER BY name ASC`,
        searchTerm,
        searchTerm
      );
    }

    return await this.db.all<Product>(
      'SELECT * FROM products ORDER BY name ASC'
    );
  }

  /**
   * Obtiene un producto por ID
   */
  async getProductById(id: string): Promise<Product> {
    const product = await this.db.get<Product>(
      'SELECT * FROM products WHERE id = ?',
      id
    );

    if (!product) {
      throw new NotFoundError(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  /**
   * Valida si hay stock suficiente de un producto
   */
  async validateStock(productId: string, qty: number): Promise<boolean> {
    const product = await this.getProductById(productId);
    return product.stock >= qty;
  }

  /**
   * Obtiene múltiples productos por IDs
   */
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    return await this.db.all<Product>(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      ...ids
    );
  }
}
