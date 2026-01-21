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

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data.data;
  }

  // Helper para formatear precios
  private formatPrice(priceInCents: number): string {
    return `$${(priceInCents / 100).toFixed(2)}`;
  }

  private formatProduct(product: any) {
    return {
      ...product,
      price_display: this.formatPrice(product.price),
      price_cents: product.price,
    };
  }

  // Products
  async listProducts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const cart = await this.request(`/carts/${cartId}`);
    // Formatear precios en el carrito
    if (cart.items) {
      cart.items = cart.items.map((item: any) => ({
        ...item,
        product: this.formatProduct(item.product),
        subtotal_display: this.formatPrice(item.subtotal),
      }));
    }
    if (cart.total !== undefined) {
      cart.total_display = this.formatPrice(cart.total);
    }
    return cart;
  }

  async addToCart(cartId: string, productId: string, qty: number) {
    const item = await this.request(`/carts/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, qty }),
    });
    // Formatear item agregado
    if (item.product) {
      item.product = this.formatProduct(item.product);
      item.subtotal_display = this.formatPrice(item.subtotal);
    }
    return item;
  }

  async updateCartItem(cartId: string, itemId: string, qty: number) {
    const item = await this.request(`/carts/${cartId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ qty }),
    });
    // Formatear item actualizado
    if (item.product) {
      item.product = this.formatProduct(item.product);
      item.subtotal_display = this.formatPrice(item.subtotal);
    }
    return itemc getCart(cartId: string) {
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
