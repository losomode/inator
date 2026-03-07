#!/usr/bin/env python3
"""
RBAC API Testing Script

Tests permission enforcement across different user roles:
- ADMIN (100): Full access
- MANAGER (30): Company management, create MEMBER users
- MEMBER (10): Read-only access

Usage: python test_rbac.py
"""

import requests
import json
from typing import Dict, Optional

BASE_URL = "http://localhost:8004/api"

# Test credentials (update if needed)
USERS = {
    "admin": {"username": "admin", "password": "admin123"},
    "manager": {"username": "bob.manager", "password": "password123"},
    "member": {"username": "alice.member", "password": "password123"},
}


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")


def print_test(name: str, expected: str, result: bool):
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if result else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"{status} | {name:<50} | Expected: {expected}")


def login(username: str, password: str) -> Optional[str]:
    """Login and return access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login/",
            json={"username": username, "password": password},
            timeout=5
        )
        if response.status_code == 200:
            return response.json()["access"]
        print(f"{Colors.RED}Login failed for {username}: {response.status_code}{Colors.END}")
        return None
    except Exception as e:
        print(f"{Colors.RED}Login error for {username}: {e}{Colors.END}")
        return None


def get_context(token: str, user_id: int) -> Optional[Dict]:
    """Get user context including permissions"""
    try:
        response = requests.get(
            f"{BASE_URL}/users/{user_id}/context/",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f"{Colors.RED}Context fetch error: {e}{Colors.END}")
        return None


def test_company_endpoints(token: str, role: str):
    """Test company management endpoints"""
    print(f"\n{Colors.YELLOW}Testing Company Endpoints ({role}):{Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # List companies (ADMIN only)
    resp = requests.get(f"{BASE_URL}/companies/", headers=headers)
    print_test(
        "List all companies",
        "ADMIN only (200) | Others (403)",
        (resp.status_code == 200 and role == "ADMIN") or (resp.status_code == 403 and role != "ADMIN")
    )
    
    # View own company (All roles)
    resp = requests.get(f"{BASE_URL}/companies/my/", headers=headers)
    print_test("View own company", "200 for all roles", resp.status_code == 200)
    
    # Edit own company (MANAGER+)
    if resp.status_code == 200:
        company = resp.json()
        company_id = company["id"]
        resp = requests.patch(
            f"{BASE_URL}/companies/{company_id}/",
            json={"name": company["name"]},
            headers=headers
        )
        expected_status = 200 if role in ["ADMIN", "MANAGER"] else 403
        print_test(
            "Edit own company",
            f"MANAGER+: 200 | MEMBER: 403",
            resp.status_code == expected_status
        )


def test_user_endpoints(token: str, role: str, company_id: int):
    """Test user management endpoints"""
    print(f"\n{Colors.YELLOW}Testing User Endpoints ({role}):{Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # List users (All can list own company)
    resp = requests.get(f"{BASE_URL}/users/", headers=headers)
    print_test("List users", "200 for all roles", resp.status_code == 200)
    
    # Create MEMBER user (MANAGER+)
    test_user = {
        "user_id": 999,
        "username": f"test.member.{role.lower()}",
        "email": f"test.{role.lower()}@example.com",
        "company": company_id,
        "display_name": f"Test Member ({role})",
        "role_name": "MEMBER",
        "role_level": 10
    }
    resp = requests.post(f"{BASE_URL}/users/", json=test_user, headers=headers)
    expected_status = 201 if role in ["ADMIN", "MANAGER"] else 403
    print_test(
        "Create MEMBER user",
        "MANAGER+: 201 | MEMBER: 403",
        resp.status_code == expected_status
    )
    
    # Create ADMIN user (ADMIN only)
    test_admin = {
        "user_id": 998,
        "username": f"test.admin.{role.lower()}",
        "email": f"testadmin.{role.lower()}@example.com",
        "company": company_id,
        "display_name": f"Test Admin ({role})",
        "role_name": "ADMIN",
        "role_level": 100
    }
    resp = requests.post(f"{BASE_URL}/users/", json=test_admin, headers=headers)
    print_test(
        "Create ADMIN user",
        "ADMIN: 201 | Others: 403/400",
        (resp.status_code == 201 and role == "ADMIN") or (resp.status_code in [403, 400] and role != "ADMIN")
    )


def test_invitation_endpoints(token: str, role: str):
    """Test invitation management endpoints"""
    print(f"\n{Colors.YELLOW}Testing Invitation Endpoints ({role}):{Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # List invitations (MANAGER+ only)
    resp = requests.get(f"{BASE_URL}/invitations/", headers=headers)
    expected_status = 200 if role in ["ADMIN", "MANAGER"] else 403
    print_test(
        "List invitations",
        "MANAGER+: 200 | MEMBER: 403",
        resp.status_code == expected_status
    )


def test_permissions_in_context(token: str, user_id: int, role: str):
    """Test that context endpoint returns correct permissions"""
    print(f"\n{Colors.YELLOW}Testing Context Permissions ({role}):{Colors.END}")
    
    context = get_context(token, user_id)
    if not context:
        print(f"{Colors.RED}Failed to fetch context{Colors.END}")
        return
    
    perms = context.get("permissions", {})
    
    # Check ADMIN permissions
    if role == "ADMIN":
        print_test("can_edit_company", "True", perms.get("can_edit_company") == True)
        print_test("can_create_admin", "True", perms.get("can_create_admin") == True)
        print_test("can_edit_rma", "True", perms.get("can_edit_rma") == True)
        print_test("can_view_items", "True", perms.get("can_view_items") == True)
    
    # Check MANAGER permissions
    elif role == "MANAGER":
        print_test("can_edit_company", "True", perms.get("can_edit_company") == True)
        print_test("can_create_member", "True", perms.get("can_create_member") == True)
        print_test("can_create_admin", "False", perms.get("can_create_admin") == False)
        print_test("can_edit_rma", "False", perms.get("can_edit_rma") == False)
        print_test("can_view_items", "False", perms.get("can_view_items") == False)
    
    # Check MEMBER permissions
    elif role == "MEMBER":
        print_test("can_edit_company", "False", perms.get("can_edit_company") == False)
        print_test("can_create_member", "False", perms.get("can_create_member") == False)
        print_test("can_create_rma", "True", perms.get("can_create_rma") == True)
        print_test("can_view_rmas", "True", perms.get("can_view_rmas") == True)


def run_tests():
    """Run all RBAC tests"""
    print_header("RBAC API Permission Testing")
    
    # Login as each role and run tests
    for role_name, creds in USERS.items():
        print_header(f"Testing as {role_name.upper()}")
        
        token = login(creds["username"], creds["password"])
        if not token:
            print(f"{Colors.RED}Skipping tests for {role_name} - login failed{Colors.END}\n")
            continue
        
        # Get user context
        resp = requests.get(
            f"{BASE_URL}/users/me/",
            headers={"Authorization": f"Bearer {token}"}
        )
        if resp.status_code != 200:
            print(f"{Colors.RED}Failed to get user info{Colors.END}\n")
            continue
        
        user_info = resp.json()
        user_id = user_info["id"]
        company_id = user_info.get("company_id")
        
        # Run test suites
        test_permissions_in_context(token, user_id, role_name.upper())
        test_company_endpoints(token, role_name.upper())
        if company_id:
            test_user_endpoints(token, role_name.upper(), company_id)
        test_invitation_endpoints(token, role_name.upper())
    
    print_header("Testing Complete")
    print(f"\n{Colors.BOLD}Review results above for any failures.{Colors.END}\n")


if __name__ == "__main__":
    run_tests()
