#!/usr/bin/env node
/**
 * Punto de entrada del MCP Server
 * Para usar con Claude Desktop u otros clientes MCP
 */

import { LaburenMCPServer } from './server.js';

// Mock de D1Database para desarrollo local
// En producción esto vendría de Cloudflare Workers
const createMockDB = (): any => {
  console.error('Warning: Using mock database. Run with Cloudflare Workers for production.');
  return {
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({ success: true }),
      }),
    }),
    exec: async () => {},
    dump: async () => new ArrayBuffer(0),
    batch: async () => [],
  };
};

// Obtener database
const db = process.env.D1_DATABASE || createMockDB();

// Iniciar servidor
const server = new LaburenMCPServer(db);
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
