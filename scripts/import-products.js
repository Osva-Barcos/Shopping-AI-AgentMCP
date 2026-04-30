/**
 * Script de importación de productos desde CSV/JSON
 * Ejecutar: node scripts/import-products.js <archivo>
 */

const fs = require('fs');
const path = require('path');

// Configuración
const WRANGLER_DB = 'ai-shop-db';

/**
 * Genera un ID simple para productos
 */
function generateProductId(index) {
  return `prod_${String(index).padStart(4, '0')}`;
}

/**
 * Valida un producto
 */
function validateProduct(product, lineNumber) {
  const errors = [];
  
  if (!product.name || product.name.trim() === '') {
    errors.push(`Línea ${lineNumber}: 'name' es requerido`);
  }
  
  if (!product.price || isNaN(Number(product.price))) {
    errors.push(`Línea ${lineNumber}: 'price' debe ser un número`);
  }
  
  if (product.stock !== undefined && isNaN(Number(product.stock))) {
    errors.push(`Línea ${lineNumber}: 'stock' debe ser un número`);
  }
  
  return errors;
}

/**
 * Convierte un producto al formato de BD
 */
function normalizeProduct(product, index) {
  return {
    id: product.id || generateProductId(index),
    name: product.name.trim(),
    description: product.description?.trim() || '',
    price: Math.round(Number(product.price) * 100), // Convertir a centavos
    stock: Number(product.stock) || 0
  };
}

/**
 * Importa productos desde JSON
 */
async function importFromJSON(filePath) {
  console.log(`📂 Leyendo archivo JSON: ${filePath}`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const products = Array.isArray(data) ? data : data.products;
  
  if (!Array.isArray(products)) {
    throw new Error('El archivo JSON debe contener un array de productos');
  }
  
  return products;
}

/**
 * Importa productos desde CSV
 */
async function importFromCSV(filePath) {
  console.log(`📂 Leyendo archivo CSV: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('El archivo CSV debe tener al menos un header y una fila de datos');
  }
  
  // Parsear header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Parsear productos
  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const product = {};
    
    headers.forEach((header, index) => {
      product[header] = values[index] || '';
    });
    
    products.push(product);
  }
  
  return products;
}

/**
 * Genera SQL para insertar productos
 */
function generateInsertSQL(products) {
  const statements = products.map(p => {
    const name = p.name.replace(/'/g, "''");
    const desc = (p.description || '').replace(/'/g, "''");
    
    return `INSERT INTO products (id, name, description, price, stock) VALUES ('${p.id}', '${name}', '${desc}', ${p.price}, ${p.stock});`;
  });
  
  return statements.join('\n');
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error(`
❌ Uso: node import-products.js <archivo>

Ejemplos:
  node scripts/import-products.js products.json
  node scripts/import-products.js products.csv

Formato esperado:
  JSON: [{ "name": "...", "description": "...", "price": 100, "stock": 10 }]
  CSV:  name,description,price,stock
        Producto 1,Desc...,100,10
    `);
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }
  
  try {
    console.log('🚀 Iniciando importación de productos...\n');
    
    // Leer archivo según extensión
    const ext = path.extname(filePath).toLowerCase();
    let products;
    
    if (ext === '.json') {
      products = await importFromJSON(filePath);
    } else if (ext === '.csv') {
      products = await importFromCSV(filePath);
    } else {
      throw new Error(`Formato no soportado: ${ext}. Use .json o .csv`);
    }
    
    console.log(`✅ ${products.length} productos leídos\n`);
    
    // Validar productos
    console.log('🔍 Validando productos...');
    const allErrors = [];
    
    products.forEach((product, index) => {
      const errors = validateProduct(product, index + 2); // +2 por header
      allErrors.push(...errors);
    });
    
    if (allErrors.length > 0) {
      console.error('\n❌ Errores de validación:');
      allErrors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
    
    console.log('✅ Todos los productos son válidos\n');
    
    // Normalizar productos
    const normalizedProducts = products.map((p, i) => normalizeProduct(p, i + 1));
    
    // Generar SQL
    const sql = generateInsertSQL(normalizedProducts);
    const outputFile = 'import-products.sql';
    fs.writeFileSync(outputFile, sql);
    
    console.log(`✅ SQL generado: ${outputFile}\n`);
    console.log('📊 Resumen:');
    console.log(`  - Total productos: ${normalizedProducts.length}`);
    console.log(`  - Stock total: ${normalizedProducts.reduce((sum, p) => sum + p.stock, 0)}`);
    console.log(`  - Valor total: $${(normalizedProducts.reduce((sum, p) => sum + (p.price * p.stock), 0) / 100).toFixed(2)}\n`);
    
    console.log('🚀 Para importar a D1, ejecuta:');
    console.log(`   wrangler d1 execute ${WRANGLER_DB} --file=${outputFile}\n`);
    
    // Mostrar primeros 3 productos
    console.log('📦 Primeros 3 productos:');
    normalizedProducts.slice(0, 3).forEach(p => {
      console.log(`  - ${p.id}: ${p.name} ($${(p.price / 100).toFixed(2)}) x${p.stock}`);
    });
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
