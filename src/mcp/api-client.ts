/**
 * Cliente HTTP para consumir la API REST de Cloudflare Workers
 */

const API_BASE_URL = 'https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data.data;
  }

  // Products
  async listProducts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/products${params}`);
  }

  async getProduct(productId: string) {
    return this.request(`/products/${productId}`);
  }

  // Carts
  async createCart() {
    return this.request('/carts', { method: 'POST' });
  }

  async getCart(cartId: string) {
    return this.request(`/carts/${cartId}`);
  }

  async addToCart(cartId: string, productId: string, qty: number) {
    return this.request(`/carts/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, qty }),
    });
  }

  async updateCartItem(cartId: string, itemId: string, qty: number) {
    return this.request(`/carts/${cartId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ qty }),
    });
  }

  async removeCartItem(cartId: string, itemId: string) {
    return this.request(`/carts/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }
}
