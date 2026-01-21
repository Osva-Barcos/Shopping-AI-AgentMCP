// Rutas para productos
// GET /products
// GET /products/:id

import { ProductService } from '../services/product.service.js';
import { successResponse, handleError } from '../utils/errors.js';

export class ProductRoutes {
  constructor(private productService: ProductService) {}

  /**
   * GET /products?search=...
   * Lista productos con filtro opcional
   */
  async listProducts(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const search = url.searchParams.get('search') || undefined;

      const products = await this.productService.listProducts(search);
      return successResponse(products);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /products/:id
   * Obtiene un producto por ID
   */
  async getProduct(productId: string): Promise<Response> {
    try {
      const product = await this.productService.getProductById(productId);
      return successResponse(product);
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Router para /products/*
   */
  async handleRequest(request: Request, pathParts: string[]): Promise<Response> {
    // GET /products
    if (pathParts.length === 0 && request.method === 'GET') {
      return this.listProducts(request);
    }

    // GET /products/:id
    if (pathParts.length === 1 && request.method === 'GET') {
      return this.getProduct(pathParts[0]);
    }

    return new Response('Not Found', { status: 404 });
  }
}
