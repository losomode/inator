#!/bin/bash
# Purge all SQLite databases and recreate fresh schemas

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🗑️  Purging all databases..."

# Remove SQLite database files
echo "  Removing database files..."
rm -f "$PROJECT_ROOT/Authinator/backend/db.sqlite3"
rm -f "$PROJECT_ROOT/Userinator/backend/db.sqlite3"
rm -f "$PROJECT_ROOT/FULFILinator/backend/db.sqlite3"
rm -f "$PROJECT_ROOT/RMAinator/backend/db.sqlite3"

echo "✓ Databases purged"
echo ""
echo "🔧 Running migrations to recreate schemas..."

# Run migrations for each service
echo "  AUTHinator..."
cd "$PROJECT_ROOT/Authinator/backend" && python manage.py migrate --noinput

echo "  USERinator..."
cd "$PROJECT_ROOT/Userinator/backend" && python manage.py migrate --noinput

echo "  FULFILinator..."
cd "$PROJECT_ROOT/FULFILinator/backend" && python manage.py migrate --noinput

echo "  RMAinator..."
cd "$PROJECT_ROOT/RMAinator/backend" && python manage.py migrate --noinput

echo ""
echo "✅ All databases purged and schemas recreated"
echo "   Run 'task demo:seed' to populate with demo data"
