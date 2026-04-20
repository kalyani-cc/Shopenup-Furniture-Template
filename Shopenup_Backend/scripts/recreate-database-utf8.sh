#!/bin/bash

# Script to recreate PostgreSQL database with UTF-8 encoding
# This fixes the error: "character with byte sequence 0xe2 0xae 0x91 in encoding UTF8 has no equivalent in encoding WIN1252"

echo "⚠️  WARNING: This will DELETE all database data!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "🛑 Stopping containers..."
docker-compose down

echo "🗑️  Removing PostgreSQL volume..."
docker volume rm shopenup_stage_shopenup-postgres-data 2>/dev/null || docker volume rm shopenup-postgres-data 2>/dev/null || echo "Volume not found or already removed"

echo "🚀 Starting PostgreSQL with UTF-8 encoding..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "✅ Database recreated with UTF-8 encoding!"
echo "📝 Next steps:"
echo "   1. Run migrations: npm run build && npx shopenup migrations run"
echo "   2. Restart backend: npm run dev"

