// Utilidades para manejo de errores HTTP

import { AppError, ApiResponse } from '../types/index.js';

/**
 * Crea una respuesta JSON exitosa
 */
export function successResponse<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data
  };
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Crea una respuesta JSON de error
 */
export function errorResponse(
  statusCode: number,
  message: string,
  code = 'ERROR'
): Response {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message
    }
  };

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Maneja errores de la aplicación y los convierte en Response
 */
export function handleError(error: unknown): Response {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return errorResponse(error.statusCode, error.message, error.code);
  }

  // Error genérico
  return errorResponse(500, 'Internal server error', 'INTERNAL_ERROR');
}

/**
 * Genera un ID único simple (no usar en producción crítica)
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}
