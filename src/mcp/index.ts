#!/usr/bin/env node
/**
 * Punto de entrada del MCP Server
 * Para usar con Claude Desktop u otros clientes MCP
 * Conecta con la API REST desplegada en Cloudflare Workers
 */

import { LaburenMCPServer } from './server.js';

// URL de la API en producción
const API_URL = process.env.API_URL || 'https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev';

console.error(`Connecting to API: ${API_URL}`);

// Iniciar servidor MCP
const server = new LaburenMCPServer(API_URL);
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
