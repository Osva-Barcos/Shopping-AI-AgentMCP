# Script de Inicializacion Completa
# Ejecutar estos comandos en orden

# 1. Instalar dependencias
Write-Host "`nInstalando dependencias..." -ForegroundColor Cyan
npm install

# 2. Crear base de datos D1
Write-Host "`nCreando base de datos D1..." -ForegroundColor Cyan
Write-Host "IMPORTANTE: Copia el 'database_id' que se muestra y pegalo en wrangler.toml" -ForegroundColor Yellow
npm run db:create

# Esperar a que el usuario copie el ID
Write-Host "`nPresiona Enter despues de copiar el database_id en wrangler.toml..." -ForegroundColor Green
Read-Host

# 3. Ejecutar migraciones
Write-Host "`nEjecutando migraciones..." -ForegroundColor Cyan
npm run db:migrate

# 4. Cargar datos de ejemplo
Write-Host "`nDeseas cargar datos de ejemplo? (S/N)" -ForegroundColor Yellow
$loadSeed = Read-Host

if ($loadSeed -eq 'S' -or $loadSeed -eq 's') {
    Write-Host "Cargando datos de ejemplo..." -ForegroundColor Cyan
    wrangler d1 execute ai-shop-db --file=./src/db/seed.sql
}

# 5. Iniciar desarrollo local
Write-Host "`nTodo listo! Iniciando servidor de desarrollo..." -ForegroundColor Green
Write-Host "El servidor estara disponible en: http://localhost:8787" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
Write-Host ""
npm run dev
