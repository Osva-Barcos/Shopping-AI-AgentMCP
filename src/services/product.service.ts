// Servicio de productos
// Lógica de negocio para productos

import { DbClient } from '../db/client.js';
import { Product, NotFoundError } from '../types/index.js';

export class ProductService {
  constructor(private db: DbClient) {}

  // Palabras vacías/stop words en español que no aportan a la búsqueda de productos
  private static STOP_WORDS = new Set([
    'disponible', 'disponibles', 'mostrame', 'mostrame', 'muestrame', 'muéstrame',
    'todos', 'todas', 'alguno', 'alguna', 'algunos', 'algunas',
    'tenes', 'tienes', 'tenga', 'tengas', 'tengan',
    'que', 'los', 'las', 'el', 'la', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'por', 'para', 'con', 'sin', 'en', 'a', 'y', 'o',
    'me', 'te', 'se', 'lo', 'le', 'les', 'nos', 'os',
    'quiero', 'quieres', 'quiera', 'queremos', 'quieren',
    'hay', 'esta', 'estan', 'están', 'son', 'es', 'soy', 'eres',
    'ver', 'verlos', 'verlas', 'buscar', 'busco', 'buscame',
    'hoy', 'ahora', 'bien', 'mas', 'más', 'menos', 'muy', 'tan',
    'ropa', 'prenda', 'prendas', 'articulo', 'artículo', 'articulos', 'artículos',
  ]);

  /**
   * Genera variantes singular/plural para una palabra en español.
   * Esto mejora la búsqueda cuando el usuario usa plural pero el producto está en singular.
   */
  private generateWordVariants(word: string): string[] {
    const variants = new Set<string>([word]);
    const lower = word.toLowerCase();

    // Reglas básicas de singular/plural en español
    if (lower.endsWith('es')) {
      // Ej: pantalones → pantalón, camisetas → camiseta (no, camisetas termina en 's' no 'es')
      // Ej: pantalones → pantalon (sin acento, por si acaso)
      variants.add(word.slice(0, -2)); // pantalones → pantalon
      variants.add(word.slice(0, -2) + 'ón'); // pantalones → pantalón
      variants.add(word.slice(0, -2) + 'on'); // pantalones → pantalon (sin tilde)
    }
    if (lower.endsWith('s') && !lower.endsWith('es')) {
      // Ej: camisetas → camiseta, faldas → falda
      variants.add(word.slice(0, -1));
    }
    if (!lower.endsWith('s')) {
      // Variante plural por si el usuario busca singular pero el producto está en plural
      variants.add(word + 's');
      variants.add(word + 'es');
    }

    return Array.from(variants);
  }

  /**
   * Lista todos los productos con filtro opcional de búsqueda
   * Búsqueda mejorada:
   * - Ignora palabras vacías/stop words
   * - Genera variantes singular/plural
   * - Usa LOWER() para búsqueda case-insensitive con caracteres acentuados
   * - Primero intenta con AND entre palabras, si no hay resultados fallback a OR
   * @param search - Busca en nombre o descripción (soporta múltiples palabras)
   */
  async listProducts(search?: string): Promise<Product[]> {
    if (search) {
      // Dividir búsqueda en palabras y filtrar stop words
      const rawWords = search.trim().split(/\s+/).filter(w => w.length > 0);
      const words = rawWords.filter(w => !ProductService.STOP_WORDS.has(w.toLowerCase()));
      
      // Si después de filtrar no queda nada, mostrar todos
      if (words.length === 0) {
        return await this.db.all<Product>(
          'SELECT * FROM products ORDER BY id ASC'
        );
      }
      
      // Para cada palabra, generar variantes (singular/plural)
      // La condición entre variantes de la MISMA palabra es OR
      // La condición entre palabras DISTINTAS es AND
      const buildConditions = (useOrBetweenWords: boolean): { conditions: string, params: string[] } => {
        const wordConditions: string[] = [];
        const params: string[] = [];

        for (const word of words) {
          const variants = this.generateWordVariants(word);
          const variantConditions = variants.map(() => '(LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?))').join(' OR ');
          wordConditions.push(`(${variantConditions})`);
          
          for (const variant of variants) {
            params.push(`%${variant}%`, `%${variant}%`);
          }
        }
        
        const joinOperator = useOrBetweenWords ? ' OR ' : ' AND ';
        const conditions = wordConditions.join(joinOperator);
        return { conditions, params };
      };
      
      // Intento 1: buscar con AND (más restrictivo)
      const attempt1 = buildConditions(false);
      console.log('🔍 Search terms:', words, 'AND query:', attempt1.conditions);
      
      let results = await this.db.all<Product>(
        `SELECT * FROM products 
         WHERE ${attempt1.conditions}
         ORDER BY id ASC`,
        ...attempt1.params
      );
      
      // Intento 2: si no hay resultados con AND, fallback a OR (más permisivo)
      if (results.length === 0) {
        const attempt2 = buildConditions(true);
        console.log('🔍 Fallback to OR query:', attempt2.conditions);
        results = await this.db.all<Product>(
          `SELECT * FROM products 
           WHERE ${attempt2.conditions}
           ORDER BY id ASC`,
          ...attempt2.params
        );
      }
      
      return results;
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
