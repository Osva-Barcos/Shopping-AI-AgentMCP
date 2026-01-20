// Tipos y interfaces para el MCP Backend

// ===== Environment =====
export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

// ===== Entidades de Base de Datos =====

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // En centavos
  stock: number;
  available?: string; // 'Yes' | 'No'
}

export interface Cart {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  qty: number;
}

// ===== DTOs para Responses =====

export interface CartWithItems extends Cart {
  items: CartItemDetail[];
  total: number; // Total en centavos
}

export interface CartItemDetail extends CartItem {
  product: Product;
  subtotal: number; // qty * precio
}

// ===== Request Bodies =====

export interface AddToCartRequest {
  qty?: number; // Por defecto 1
}

export interface UpdateCartItemRequest {
  qty: number;
}

// ===== Errores =====

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

// ===== Utilidades para Responses =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
