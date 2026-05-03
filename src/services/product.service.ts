// Servicio de productos
// Lógica de negocio para productos

import { DbClient } from '../db/client.js';
import { Product, NotFoundError } from '../types/index.js';

// Mapeo de sinónimos comunes en español para ropa
// La clave es la palabra que el usuario podría decir, el valor es la palabra que aparece en la DB
const SYNONYMS: Record<string, string> = {
  'remera': 'camiseta',
  'remeras': 'camiseta',
  'buzo': 'sudadera',
  'buzos': 'sudadera',
  'campera': 'chaqueta',
  'camperas': 'chaqueta',
  'camperon': 'chaqueta',
  'camperón': 'chaqueta',
  'camperones': 'chaqueta',
  'jean': 'pantalón',
  'jeans': 'pantalón',
  'calza': 'pantalón',
  'calzas': 'pantalón',
  'pollera': 'falda',
  'polleras': 'falda',
  'musculosa': 'camiseta',
  'musculosas': 'camiseta',
};

// Palabras vacías/stop words en español que no aportan a la búsqueda de productos
const STOP_WORDS = new Set([
  'disponible', 'disponibles', 'mostrame', 'muestrame', 'muéstrame',
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
  'loco', 'loca', 'porfa', 'porfavor', 'por favor', 'dale', 'fijate',
]);

/**
 * Normaliza un texto para búsqueda:
 * - Convierte a minúsculas
 * - Quita acentos (NFD decomposition + remove diacritics)
 * - Quita espacios extra
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Sinónimos exportados para usar también en tools.ts
export { SYNONYMS };

/**
 * Genera variantes de búsqueda para una palabra:
 * - Sinónimos (remera → camiseta)
 * - Singular/plural básico
 */
function generateSearchVariants(word: string): string[] {
  const normalized = normalizeText(word);
  const variants = new Set<string>([normalized]);

  // Sinónimos
  if (SYNONYMS[normalized]) {
    variants.add(normalizeText(SYNONYMS[normalized]));
  }

  // Singular/plural simple
  if (normalized.endsWith('es')) {
    variants.add(normalized.slice(0, -2));
  } else if (normalized.endsWith('s')) {
    variants.add(normalized.slice(0, -1));
  } else {
    variants.add(normalized + 's');
    variants.add(normalized + 'es');
  }

  return Array.from(variants);
}

export class ProductService {
  constructor(private db: DbClient) {}

  /**
   * Lista todos los productos con filtro opcional de búsqueda.
   * La búsqueda se hace en memoria (JavaScript) para manejar correctamente:
   * - Caracteres acentuados (SQLite LIKE no los maneja bien)
   * - Sinónimos (remera = camiseta)
   * - Singular/plural
   *
   * Dado que el catálogo tiene ~100 productos, traer todos a memoria es eficiente.
   * @param search - Término de búsqueda del usuario
   */
  async listProducts(search?: string): Promise<Product[]> {
    // Siempre traemos todos los productos (catálogo pequeño)
    const allProducts = await this.db.all<Product>(
      'SELECT * FROM products ORDER BY id ASC'
    );

    if (!search || search.trim() === '') {
      return allProducts;
    }

    // Procesar palabras de búsqueda
    const rawWords = search.trim().split(/\s+/).filter(w => w.length > 0);
    const searchWords = rawWords
      .map(w => w.toLowerCase())
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));

    // Si después de filtrar no queda nada útil, devolver todos
    if (searchWords.length === 0) {
      return allProducts;
    }

    console.log('🔍 Raw search:', search, '→ Processed words:', searchWords);

    // Generar variantes para cada palabra de búsqueda
    const wordVariantGroups = searchWords.map(word => generateSearchVariants(word));
    console.log('🔍 Variants:', wordVariantGroups);

    // Filtrar productos: un producto matchea si CADA palabra de búsqueda
    // tiene AL MENOS UNA variante que aparece en el nombre o descripción del producto
    let results = allProducts.filter(product => {
      const productText = normalizeText(product.name + ' ' + (product.description || ''));

      return wordVariantGroups.every(variants =>
        variants.some(variant => productText.includes(variant))
      );
    });

    // Si AND no devuelve nada, fallback a OR (cualquier palabra)
    if (results.length === 0) {
      results = allProducts.filter(product => {
        const productText = normalizeText(product.name + ' ' + (product.description || ''));

        return wordVariantGroups.some(variants =>
          variants.some(variant => productText.includes(variant))
        );
      });
      console.log('🔍 Fallback to OR →', results.length, 'results');
    }

    console.log('🔍 Final results:', results.length);
    return results;
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
