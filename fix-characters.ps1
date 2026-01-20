# Script para arreglar caracteres mal codificados en el CSV

Write-Host "Arreglando caracteres en el CSV..." -ForegroundColor Cyan

$inputFile = "products(Sheet1).csv"
$content = Get-Content $inputFile -Raw -Encoding UTF8

# Reemplazar caracteres mal codificados específicos
$content = $content -replace 'Pantal�n', 'Pantalón'
$content = $content -replace 'S�', 'Sí'
$content = $content -replace 'c�moda', 'cómoda'
$content = $content -replace 'Dise�o', 'Diseño'
$content = $content -replace 'CATEGOR�A', 'CATEGORÍA'
$content = $content -replace 'DESCRIPCI�N', 'DESCRIPCIÓN'
$content = $content -replace '�', 'ó' # Otros casos de ó mal codificada

Write-Host "✅ Caracteres corregidos" -ForegroundColor Green

# Guardar el archivo corregido
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($inputFile, $content, $utf8NoBom)

Write-Host "✅ Archivo actualizado: $inputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora ejecuta:" -ForegroundColor Yellow
Write-Host "  node scripts/convert-csv-to-sql.js" -ForegroundColor White
Write-Host "  npx wrangler d1 execute laburen-ai-db --command ""DELETE FROM products""" -ForegroundColor White
Write-Host "  npx wrangler d1 execute laburen-ai-db --file=import-products.sql" -ForegroundColor White
