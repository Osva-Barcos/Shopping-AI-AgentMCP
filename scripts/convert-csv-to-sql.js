/**
 * Script de conversión CSV de productos de ropa a SQL
 * Formato CSV: ID;TIPO_PRENDA;TALLA;COLOR;CANTIDAD_DISPONIBLE;PRECIO_50_U;PRECIO_100_U;PRECIO_200_U;DISPONIBLE;CATEGORÍA;DESCRIPCIÓN
 * 
 * Convierte a estructura simple: id, name, description, price, stock
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Función para limpiar caracteres mal codificados
function fixEncoding(text) {
  // Reemplazar caracteres mal codificados comunes
  return text
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã³/g, 'ó')
    .replace(/Ã©/g, 'é')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã­/g, 'í')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã/g, 'Ñ')
    .replace(/Â¿/g, '¿')
    .replace(/Â¡/g, '¡')
    .replace(/Ã"/g, 'Ó')
    .replace(/Â/g, '');
}

// Leer el CSV
const csvPath = join(__dirname, '../data/products-utf8.csv');
console.log('📂 Leyendo CSV...\n');

let content = fs.readFileSync(csvPath, 'utf-8');
content = fixEncoding(content); // Aplicar corrección de codificación
const lines = content.split('\n').filter(line => line.trim());

// Parsear CSV (separado por ;)
const products = [];
for (let i = 1; i < lines.length; i++) { // Saltar header
  const parts = lines[i].split(';');
  
  if (parts.length < 11) continue;
  
  const [id, tipo_prenda, talla, color, cantidad, precio_50, precio_100, precio_200, disponible, categoria, descripcion] = parts;
  
  // Construir el nombre del producto (combina tipo + color + talla)
  const name = `${tipo_prenda} ${color} Talla ${talla}`;
  
  // Construir descripción completa (combina categoría + descripción + precios por volumen)
  const desc = `${descripcion.trim()} - Categoría: ${categoria}. Precios: 50u=$${precio_50}, 100u=$${precio_100}, 200u=$${precio_200}`;
  
  // Usar el precio más común (precio_50_u) como precio base
  // Los precios en el CSV ya están en pesos enteros (ej: 1058 = $1,058)
  const price = Number(precio_50);
  const stock = Number(cantidad);
  
  products.push({
    id: id.padStart(4, '0'),
    name,
    description: desc,
    price,
    stock,
    available: disponible.trim() === 'Sí' ? 'Yes' : 'No' // Convert to English
  });
}

console.log(`✅ ${products.length} productos parseados\n`);

// Generar SQL con manejo de caracteres especiales
const sqlStatements = products.map(p => {
  // Escapar comillas simples
  const name = p.name.replace(/'/g, "''");
  const desc = p.description.replace(/'/g, "''");
  
  return `INSERT INTO products (id, name, description, price, stock, available) VALUES ('${p.id}', '${name}', '${desc}', ${p.price}, ${p.stock}, '${p.available}');`;
});

const sql = sqlStatements.join('\n');

// Guardar SQL
const outputPath = join(__dirname, '../data/import-products.sql');
fs.writeFileSync(outputPath, sql);

console.log('✅ SQL generado: import-products.sql\n');

// Estadísticas
const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
const valorTotal = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

console.log('📊 Estadísticas:');
console.log(`  Total productos: ${products.length}`);
console.log(`  Stock total: ${totalStock} unidades`);
console.log(`  Valor inventario: $${valorTotal.toLocaleString('es-CL')}`);

console.log('\n📦 Primeros 5 productos:');
products.slice(0, 5).forEach(p => {
  console.log(`  ${p.id}: ${p.name}`);
  console.log(`       Stock: ${p.stock} - Precio: $${p.price.toLocaleString('es-CL')}`);
});

console.log('\n🚀 Para importar a D1, ejecuta:');
console.log('   wrangler d1 execute ai-shop-db --file=import-products.sql');
console.log('\n   O en local para testing:');
console.log('   wrangler d1 execute laburen-ai-db --local --file=import-products.sql\n');
