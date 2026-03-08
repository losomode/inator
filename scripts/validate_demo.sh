#!/bin/bash
# Demo Database Validation Script
# Verifies that demo data is correctly seeded and RBAC filtering works

echo "=== Demo Database Validation ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counters
PASS=0
FAIL=0

test_count() {
    local service=$1
    local table=$2
    local expected=$3
    local db=$4
    
    actual=$(sqlite3 "$db" "SELECT COUNT(*) FROM $table;")
    if [ "$actual" -eq "$expected" ]; then
        echo -e "${GREEN}✓${NC} $service: $table = $expected"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $service: $table = $actual (expected $expected)"
        ((FAIL++))
    fi
}

echo "--- Global Counts (Admin View) ---"
test_count "Authinator" "users_user" 12 "Authinator/backend/db.sqlite3"
test_count "USERinator" "companies_company" 4 "Userinator/backend/db.sqlite3"
test_count "USERinator" "users_userprofile" 12 "Userinator/backend/db.sqlite3"
test_count "USERinator" "roles_role" 3 "Userinator/backend/db.sqlite3"
test_count "FULFILinator" "purchase_orders_purchaseorder" 4 "Fulfilinator/backend/db.sqlite3"
test_count "FULFILinator" "orders_order" 5 "Fulfilinator/backend/db.sqlite3"
test_count "FULFILinator" "deliveries_delivery" 5 "Fulfilinator/backend/db.sqlite3"
test_count "RMAinator" "rma_rma" 8 "RMAinator/backend/db.sqlite3"

echo ""
echo "--- Company-Specific Data (RBAC) ---"

# Test Acme (company_id=1)
acme_pos=$(sqlite3 "Fulfilinator/backend/db.sqlite3" "SELECT COUNT(*) FROM purchase_orders_purchaseorder WHERE customer_id='1';")
acme_orders=$(sqlite3 "Fulfilinator/backend/db.sqlite3" "SELECT COUNT(*) FROM orders_order WHERE customer_id='1';")
acme_deliveries=$(sqlite3 "Fulfilinator/backend/db.sqlite3" "SELECT COUNT(*) FROM deliveries_delivery WHERE customer_id='1';")
acme_rmas=$(sqlite3 "RMAinator/backend/db.sqlite3" "SELECT COUNT(*) FROM rma_rma WHERE company_id=1;")

echo "Acme Corporation (bob.manager should see):"
[ "$acme_pos" -eq 1 ] && echo -e "  ${GREEN}✓${NC} 1 PO" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $acme_pos POs" && ((FAIL++)))
[ "$acme_orders" -eq 2 ] && echo -e "  ${GREEN}✓${NC} 2 Orders" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $acme_orders Orders" && ((FAIL++)))
[ "$acme_deliveries" -eq 2 ] && echo -e "  ${GREEN}✓${NC} 2 Deliveries" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $acme_deliveries Deliveries" && ((FAIL++)))
[ "$acme_rmas" -eq 2 ] && echo -e "  ${GREEN}✓${NC} 2 RMAs" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $acme_rmas RMAs" && ((FAIL++)))

# Test Globex (company_id=2)
globex_pos=$(sqlite3 "Fulfilinator/backend/db.sqlite3" "SELECT COUNT(*) FROM purchase_orders_purchaseorder WHERE customer_id='2';")
globex_orders=$(sqlite3 "Fulfilinator/backend/db.sqlite3" "SELECT COUNT(*) FROM orders_order WHERE customer_id='2';")
globex_rmas=$(sqlite3 "RMAinator/backend/db.sqlite3" "SELECT COUNT(*) FROM rma_rma WHERE company_id=2;")

echo "Globex Industries (frank.manager should see):"
[ "$globex_pos" -eq 1 ] && echo -e "  ${GREEN}✓${NC} 1 PO" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $globex_pos POs" && ((FAIL++)))
[ "$globex_orders" -eq 1 ] && echo -e "  ${GREEN}✓${NC} 1 Order" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $globex_orders Orders" && ((FAIL++)))
[ "$globex_rmas" -eq 2 ] && echo -e "  ${GREEN}✓${NC} 2 RMAs" && ((PASS++)) || (echo -e "  ${RED}✗${NC} $globex_rmas RMAs" && ((FAIL++)))

echo ""
echo "==================================="
echo -e "${GREEN}PASSED: $PASS${NC}"
echo -e "${RED}FAILED: $FAIL${NC}"
echo "==================================="

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All validation tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some validation tests failed${NC}"
    exit 1
fi
