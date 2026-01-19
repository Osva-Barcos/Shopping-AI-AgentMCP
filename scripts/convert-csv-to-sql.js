/**
 * Script de conversión CSV de productos de ropa a SQL
 * Formato CSV: ID;TIPO_PRENDA;TALLA;COLOR;CANTIDAD_DISPONIBLE;PRECIO_50_U;PRECIO_100_U;PRECIO_200_U;DISPONIBLE;CATEGORÍA;DESCRIPCIÓN
 * 
 * Convierte a estructura simple: id, name, description, price, stock
 */

const fs = require('fs');

// Leer el CSV
const csvPath = 'products(Sheet1).csv';
console.log('📂 Leyendo CSV...\n');

const content = fs.readFileSync(csvPath, 'utf-8');
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
  const desc = `${descripcion.trim()} - Categoría: ${categoria}. Precios: 50u=$${precio_50}, 100u=$${precio_100}, 200u=$${precio_200}. ${disponible === 'Sí' || disponible === 'S�' ? 'Disponible' : 'No disponible'}`;
  
  // Usar el precio más común (precio_50_u) como precio base
  const price = Math.round(Number(precio_50) * 100); // Convertir a centavos
  const stock = Number(cantidad);
  
  products.push({
    id: id.padStart(4, '0'),
    name,
    description: desc,
    price,
    stock
  });
}

console.log(`✅ ${products.length} productos parseados\n`);

// Generar SQL con manejo de caracteres especiales
const sqlStatements = products.map(p => {
  // Escapar comillas simples
  const name = p.name.replace(/'/g, "''");
  const desc = p.description.replace(/'/g, "''");
  
  return `INSERT INTO products (id, name, description, price, stock) VALUES ('${p.id}', '${name}', '${desc}', ${p.price}, ${p.stock});`;
});

const sql = sqlStatements.join('\n');

// Guardar SQL
fs.writeFileSync('import-products.sql', sql);

console.log('✅ SQL generado: import-products.sql\n');

// Estadísticas
const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
const valorTotal = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

console.log('📊 Estadísticas:');
console.log(`  Total productos: ${products.length}`);
console.log(`  Stock total: ${totalStock} unidades`);
console.log(`  Valor inventario: $${(valorTotal / 100).toLocaleString('es-CL')}`);

console.log('\n📦 Primeros 5 productos:');
products.slice(0, 5).forEach(p => {
  console.log(`  ${p.id}: ${p.name}`);
  console.log(`       Stock: ${p.stock} - Precio: $${(p.price / 100).toFixed(2)}`);
});

console.log('\n🚀 Para importar a D1, ejecuta:');
console.log('   wrangler d1 execute laburen-ai-db --file=import-products.sql');
console.log('\n   O en local para testing:');
console.log('   wrangler d1 execute laburen-ai-db --local --file=import-products.sql\n');
