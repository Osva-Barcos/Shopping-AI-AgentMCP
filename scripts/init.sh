#!/bin/bash

# 🚀 Script de Inicialización Completa
# Ejecutar: chmod +x init.sh && ./init.sh

echo "📦 Instalando dependencias..."
npm install

echo ""
echo "🗄️ Creando base de datos D1..."
echo "⚠️ IMPORTANTE: Copia el 'database_id' que se muestra y pégalo en wrangler.toml"
npm run db:create

echo ""
echo "⏸️ Presiona Enter después de copiar el database_id en wrangler.toml..."
read

echo ""
echo "🔄 Ejecutando migraciones..."
npm run db:migrate

echo ""
echo "📊 ¿Deseas cargar datos de ejemplo? (s/n)"
read -r loadSeed

if [ "$loadSeed" = "s" ] || [ "$loadSeed" = "S" ]; then
    echo "Cargando datos de ejemplo..."
    wrangler d1 execute ai-shop-db --file=./src/db/seed.sql
fi

echo ""
echo "✅ Todo listo! Iniciando servidor de desarrollo..."
echo "El servidor estará disponible en: http://localhost:8787"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""
npm run dev
