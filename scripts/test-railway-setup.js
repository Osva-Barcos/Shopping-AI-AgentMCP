#!/usr/bin/env node
/**
 * Script de prueba local para verificar el servidor HTTP/SSE
 * antes de hacer deployment a Railway
 */

console.log('🧪 Iniciando pruebas del servidor MCP HTTP/SSE...\n');

const API_URL = process.env.API_URL || 'https://laburen-ai-agent-mcp.mcp-osvaldo.workers.dev';
const PORT = process.env.PORT || 3000;

console.log('📋 Configuración:');
console.log(`   API_URL: ${API_URL}`);
console.log(`   PORT: ${PORT}\n`);

// Test 1: Verificar que el API REST responde
console.log('✅ Test 1: Verificando API REST...');
fetch(`${API_URL}/products?limit=5`)
  .then(res => res.json())
  .then(data => {
    console.log(`   ✓ API REST funcionando - ${data.data?.length || 0} productos`);
  })
  .catch(err => {
    console.error('   ✗ Error en API REST:', err.message);
  });

// Test 2: Instrucciones para probar el servidor HTTP
console.log('\n✅ Test 2: Instrucciones para probar servidor HTTP:');
console.log('   1. Ejecuta en otra terminal: npm run mcp:http');
console.log(`   2. Abre en navegador: http://localhost:${PORT}/health`);
console.log(`   3. Deberías ver: {"status":"ok","message":"MCP HTTP Server is running"}`);
console.log(`   4. Prueba SSE endpoint: http://localhost:${PORT}/sse`);

console.log('\n✅ Test 3: Verificar archivos para Railway:');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  'Procfile',
  'railway.json',
  '.env.example',
  'package.json',
  'src/mcp/http-server.ts'
];

files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`   ${exists ? '✓' : '✗'} ${file}`);
});

console.log('\n📦 Próximos pasos para deployment en Railway:');
console.log('   1. Sube el código a GitHub: git push origin main');
console.log('   2. Ve a railway.app y conecta tu repositorio');
console.log('   3. Configura variables de entorno (API_URL, PORT, NODE_ENV)');
console.log('   4. Railway detectará el Procfile y desplegará automáticamente');
console.log('   5. Obtén la URL pública y configura tu dashboard de Laburen\n');

console.log('📖 Guía completa: docs/DEPLOYMENT_RAILWAY.md\n');
