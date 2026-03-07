#!/bin/bash
# Seed all services with comprehensive demo data

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🌱 Seeding demo data across all services..."
echo ""

# Seed AUTHinator (authentication/credentials)
echo "Step 1/4: AUTHinator"
cd "$PROJECT_ROOT/Authinator/backend" && python manage.py seed_demo
echo ""

# Seed USERinator (companies and user profiles)
echo "Step 2/4: USERinator"
cd "$PROJECT_ROOT/Userinator/backend" && python manage.py seed_demo
echo ""

# Seed FULFILinator (items, POs, orders, deliveries)
echo "Step 3/4: FULFILinator"
if [ -f "$PROJECT_ROOT/FULFILinator/backend/manage.py" ]; then
    cd "$PROJECT_ROOT/FULFILinator/backend"
    if python manage.py help seed_demo >/dev/null 2>&1; then
        python manage.py seed_demo
    else
        echo "⚠️  FULFILinator seed_demo command not yet implemented"
        echo "   Creating minimal demo data via Django shell..."
        python manage.py shell <<EOF
from items.models import Item
from decimal import Decimal

# Create items if they don't exist
items_data = [
    {'name': 'Security Camera HD', 'version': 'v2.0', 'msrp': Decimal('299.99'), 'min_price': Decimal('249.99'), 'description': 'High definition security camera'},
    {'name': 'Security Camera 4K', 'version': 'v3.0', 'msrp': Decimal('499.99'), 'min_price': Decimal('399.99'), 'description': '4K ultra HD security camera'},
    {'name': 'Motion Sensor', 'version': 'v1.5', 'msrp': Decimal('79.99'), 'min_price': Decimal('59.99'), 'description': 'Wireless motion sensor'},
    {'name': 'Door Lock Smart', 'version': 'v2.2', 'msrp': Decimal('199.99'), 'min_price': Decimal('159.99'), 'description': 'Smart electronic door lock'},
    {'name': 'Alarm System Pro', 'version': 'v4.0', 'msrp': Decimal('899.99'), 'min_price': Decimal('749.99'), 'description': 'Professional alarm system'},
    {'name': 'NVR 8-Channel', 'version': 'v5.0', 'msrp': Decimal('1299.99'), 'min_price': Decimal('999.99'), 'description': '8-channel network video recorder'},
]

for item_data in items_data:
    item, created = Item.objects.get_or_create(
        name=item_data['name'],
        defaults=item_data
    )
    if created:
        print(f"  ✓ Created item: {item.name}")
    else:
        print(f"  ✓ Item exists: {item.name}")

print("✅ FULFILinator: 6 items seeded")
print("   Note: POs, Orders, Deliveries require full seed_demo command")
EOF
    fi
else
    echo "⚠️  FULFILinator not found"
fi
echo ""

# Seed RMAinator (RMAs)
echo "Step 4/4: RMAinator"
if [ -f "$PROJECT_ROOT/RMAinator/backend/manage.py" ]; then
    cd "$PROJECT_ROOT/RMAinator/backend"
    if python manage.py help seed_demo >/dev/null 2>&1; then
        python manage.py seed_demo
    else
        echo "⚠️  RMAinator seed_demo command not yet implemented"
        echo "   Skipping RMA data seeding for now"
    fi
else
    echo "⚠️  RMAinator not found"
fi
echo ""

echo "✅ Demo data seeding complete!"
echo ""
echo "📋 Demo Accounts:"
echo "   Platform Admins:"
echo "     - admin / admin"
echo "     - alice.admin / admin"
echo ""
echo "   Acme Corporation:"
echo "     - bob.manager / manager (MANAGER)"
echo "     - carol.member / member (MEMBER)"
echo "     - dave.member / member (MEMBER)"
echo ""
echo "   Globex Industries:"
echo "     - frank.manager / manager (MANAGER)"
echo "     - grace.member / member (MEMBER)"
echo ""
echo "   Initech LLC:"
echo "     - henry.manager / manager (MANAGER)"
echo "     - iris.member / member (MEMBER)"
echo ""
echo "   Wayne Enterprises:"
echo "     - jack.manager / manager (MANAGER)"
echo "     - kate.member / member (MEMBER)"
echo "     - leo.member / member (MEMBER)"
echo ""
echo "🔗 Access at: http://localhost:8080"
