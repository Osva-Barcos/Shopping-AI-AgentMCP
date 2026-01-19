// Cliente de base de datos D1
// Wrapper simple para facilitar queries

import { Env } from '../types';

export class DbClient {
  constructor(private db: D1Database) {}

  /**
   * Ejecuta una query y retorna una sola fila
   */
  async get<T = any>(query: string, ...params: any[]): Promise<T | null> {
    const result = await this.db.prepare(query).bind(...params).first<T>();
    return result || null;
  }

  /**
   * Ejecuta una query y retorna todas las filas
   */
  async all<T = any>(query: string, ...params: any[]): Promise<T[]> {
    const result = await this.db.prepare(query).bind(...params).all<T>();
    return result.results || [];
  }

  /**
   * Ejecuta un INSERT/UPDATE/DELETE
   */
  async run(query: string, ...params: any[]): Promise<D1Result> {
    return await this.db.prepare(query).bind(...params).run();
  }

  /**
   * Ejecuta múltiples queries en batch
   */
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return await this.db.batch(statements);
  }

  /**
   * Prepara una statement (útil para batch)
   */
  prepare(query: string, ...params: any[]): D1PreparedStatement {
    return this.db.prepare(query).bind(...params);
  }
}

/**
 * Factory para crear instancia del cliente
 */
export function createDbClient(env: Env): DbClient {
  return new DbClient(env.DB);
}
