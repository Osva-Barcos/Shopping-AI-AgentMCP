// Servicio de sesiones
// Persiste el cart_id asociado a un session_id en la base de datos

import { DbClient } from '../db/client.js';

export class SessionService {
  constructor(private db: DbClient) {}

  /**
   * Asegura que la tabla de sesiones exista (para compatibilidad sin migraciones manuales)
   */
  async ensureTable(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        cart_id TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Obtiene el cart_id asociado a una sesión
   */
  async getCartId(sessionId: string): Promise<string | null> {
    const row = await this.db.get<{ cart_id: string }>(
      'SELECT cart_id FROM sessions WHERE session_id = ?',
      sessionId
    );
    return row?.cart_id || null;
  }

  /**
   * Guarda el cart_id para una sesión
   */
  async setCartId(sessionId: string, cartId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO sessions (session_id, cart_id, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET cart_id = excluded.cart_id, updated_at = excluded.updated_at`,
      sessionId,
      cartId,
      now
    );
  }
}
