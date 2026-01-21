// Servicio de productos
// Lógica de negocio para productos

import { DbClient } from '../db/client.js';
import { Product, NotFoundError } from '../types/index.js';

export class ProductService {
  constructor(private db: DbClient) {}

  /**
   * Lista todos los productos con filtro opcional de búsqueda
   * Búsqueda mejorada: divide el término en palabras y busca todas
   * @param search - Busca en nombre o descripción (soporta múltiples palabras)
   */
  async listProducts(search?: string): Promise<Product[]> {
    if (search) {
      // Dividir búsqueda en palabras para búsqueda más flexible
      const words = search.trim().split(/\s+/).filter(w => w.length > 0);
      
      if (words.length === 0) {
        return await this.db.all<Product>(
          'SELECT * FROM products ORDER BY id ASC'
        );
      }
      
      // Construir condición WHERE que busque TODAS las palabras
      const conditions = words.map(() => `(name LIKE ? OR description LIKE ?)`).join(' AND ');
      const params = words.flatMap(word => [`%${word}%`, `%${word}%`]);
      
      console.log('🔍 Search terms:', words, 'Query:', conditions);
      
      return await this.db.all<Product>(
        `SELECT * FROM products 
         WHERE ${conditions}
         ORDER BY id ASC`,
        ...params
      );
    }

    return await this.db.all<Product>(
      'SELECT * FROM products ORDER BY id ASC'
    );
  }

  /**
   * Obtiene un producto por ID
   */
  async getProductById(id: string): Promise<Product> {
    console.log('[PRODUCT_SERVICE] Looking for product with id:', id, 'type:', typeof id);
    
    const product = await this.db.get<Product>(
      'SELECT * FROM products WHERE id = ?',
      id
    );

    console.log('[PRODUCT_SERVICE] Query result:', product ? 'Found' : 'Not found');
    
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
