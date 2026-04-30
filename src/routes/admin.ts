// Rutas de administración
// GET /admin - Panel HTML para ver productos
// GET /admin/products - API para listar productos

import { ProductService } from '../services/product.service.js';
import { successResponse, handleError } from '../utils/errors.js';

export class AdminRoutes {
  constructor(private productService: ProductService) {}

  /**
   * GET /admin
   * Panel HTML para visualizar productos
   */
  async getAdminPanel(): Promise<Response> {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Productos | AI Shop</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      flex: 1;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
    }
    .stat-card h3 {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
    }
    .search-bar {
      margin: 20px 0;
    }
    .search-bar input {
      width: 100%;
      padding: 12px 20px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
    }
    .search-bar input:focus {
      outline: none;
      border-color: #667eea;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .price {
      font-weight: 600;
      color: #28a745;
    }
    .stock {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .stock.high { background: #d4edda; color: #155724; }
    .stock.medium { background: #fff3cd; color: #856404; }
    .stock.low { background: #f8d7da; color: #721c24; }
    .stock.out { background: #343a40; color: #fff; }
    .row-disabled {
      opacity: 0.6;
      background: #f8f9fa;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🛍️ Panel de Productos</h1>
    <p style="color: #666; margin-bottom: 20px;">AI Shopping Agent - Admin</p>
    
    <div class="stats">
      <div class="stat-card">
        <h3>Total Productos</h3>
        <div class="value" id="totalProducts">-</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
        <h3>Stock Total</h3>
        <div class="value" id="totalStock">-</div>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
        <h3>Valor Inventario</h3>
        <div class="value" id="totalValue">-</div>
      </div>
    </div>

    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="🔍 Buscar productos por nombre, color, talla...">
    </div>

    <div id="tableContainer">
      <div class="loading">Cargando productos...</div>
    </div>
  </div>

  <script>
    let allProducts = [];

    async function loadProducts() {
      try {
        const response = await fetch('/products');
        const data = await response.json();
        
        if (data.success) {
          allProducts = data.data;
          updateStats();
          renderTable(allProducts);
        }
      } catch (error) {
        document.getElementById('tableContainer').innerHTML = 
          '<div class="loading" style="color: red;">Error al cargar productos</div>';
      }
    }

    function updateStats() {
      const totalStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
      const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
      
      document.getElementById('totalProducts').textContent = allProducts.length;
      document.getElementById('totalStock').textContent = totalStock.toLocaleString();
      document.getElementById('totalValue').textContent = 
        '$' + (totalValue / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderTable(products) {
      const stockClass = (stock) => {
        if (stock === 0) return 'out';
        if (stock > 300) return 'high';
        if (stock > 100) return 'medium';
        return 'low';
      };

      const html = \`
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            \${products.map(p => \`
              <tr class="\${p.stock === 0 ? 'row-disabled' : ''}">
                <td><code>\${p.id}</code></td>
                <td><strong>\${p.name}</strong></td>
                <td style="max-width: 400px; font-size: 13px; color: #666;">
                  \${p.description ? p.description.substring(0, 100) + '...' : '-'}
                </td>
                <td class="price">$\${(p.price / 100).toFixed(2)}</td>
                <td>
                  <span class="stock \${stockClass(p.stock)}">\${p.stock}</span>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;
      
      document.getElementById('tableContainer').innerHTML = html;
    }

    // Búsqueda en tiempo real
    document.getElementById('searchInput').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      
      if (!query) {
        renderTable(allProducts);
        return;
      }

      const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
      
      renderTable(filtered);
    });

    // Cargar al iniciar
    loadProducts();
  </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  /**
   * Router para /admin/*
   */
  async handleRequest(request: Request, pathParts: string[]): Promise<Response> {
    // GET /admin
    if (pathParts.length === 0 && request.method === 'GET') {
      return this.getAdminPanel();
    }

    return new Response('Not Found', { status: 404 });
  }
}
