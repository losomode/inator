# Inator Platform - Role-Based Access Control (RBAC)

**Centralized Permission System managed by USERinator**

All inators use USERinator's `/api/users/{user_id}/context/` endpoint to get role/company context and apply consistent authorization rules.

## Role Levels

| Role | Level | Description |
|------|-------|-------------|
| **ADMIN** | 100 | Platform super-administrator with full access across all companies |
| **MANAGER** | 30 | Company manager with team management and elevated access within their company |
| **MEMBER** | 10 | Standard company member with read-only access to company data |

## Permission Matrix

### USERinator - Company Management

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View company info | All companies | Own company | Own company |
| Edit company info | All companies | Own company | ❌ |
| Create company | ✓ | ❌ | ❌ |
| Delete company | ✓ | ❌ | ❌ |

**Rules:**
- Platform scoping: ADMIN sees all companies, MANAGER/MEMBER only see their own
- Only ADMIN can create new companies
- Company edits are scoped to own company for MANAGER

### USERinator - User Management

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View user profiles | All | Own company | Own company |
| Edit user profiles | All | Own company | ❌ |
| Create users (MEMBER) | ✓ | ✓ | ❌ |
| Create users (MANAGER) | ✓ | ✓ | ❌ |
| Create users (ADMIN) | ✓ | ❌ | ❌ |
| Change user role | ✓ | ❌ | ❌ |
| Delete user | ✓ | ❌ | ❌ |
| Deactivate user | ✓ | Own company (MEMBER/MANAGER) | ❌ |
| Approve invitations | All companies | Own company | ❌ |
| Reject invitations | All companies | Own company | ❌ |

**Rules:**
- ADMIN can create users of any role (including other ADMINs)
- MANAGER can create MEMBER-level users only
- Only ADMIN can change roles or delete users permanently
- MANAGER can deactivate (not delete) MEMBER or other MANAGER users in their company
- MANAGER cannot deactivate ADMIN users

### USERinator - Profile

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View own profile | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ |
| View preferences | ✓ | ✓ | ✓ |
| Edit preferences | ✓ | ✓ | ✓ |

**Rules:**
- All users can view and edit their own profile
- Profile edits are limited to safe fields (display_name, avatar, bio, etc.)
- Role changes require ADMIN and must go through user management endpoints

### RMAinator - RMA Management

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View RMAs | All companies | Own company | Own company |
| Create RMAs | ✓ | ✓ | ✓ |
| Edit RMAs | All companies | ❌ | ❌ |
| Delete RMAs | All companies | ❌ | ❌ |
| Approve RMAs | All companies | ❌ | ❌ |
| Reject RMAs | All companies | ❌ | ❌ |
| Create RMA Groups | ✓ | ✓ | ✓ |

**Rules:**
- All users can create RMAs for their company
- RMA Groups are created alongside RMAs, no special permissions
- Once created, only ADMIN can edit or delete RMAs
- Users cannot edit their own RMAs after creation (ADMIN only)
- RMA approval workflow is ADMIN-only

### RMAinator - Item Management

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View Items | ✓ | ❌ | ❌ |
| Create Items | ✓ | ❌ | ❌ |
| Edit Items | ✓ | ❌ | ❌ |
| Delete Items | ✓ | ❌ | ❌ |

**Rules:**
- Items are ADMIN-only (catalog/SKU management)
- MANAGER and MEMBER cannot view items at all
- Items are platform-wide, not company-scoped

### FULFILinator - Purchase Orders

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View POs | All companies | Own company | Own company |
| Create POs | ✓ | Own company | Own company |
| Edit POs | All companies | ❌ | ❌ |
| Delete POs | All companies | ❌ | ❌ |

**Rules:**
- All users can create POs for their company
- Once created, only ADMIN can edit or delete POs
- Users cannot edit their own POs after creation

### FULFILinator - Orders

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View Orders | All companies | Own company | Own company |
| Create Orders | ✓ | ❌ | ❌ |
| Edit Orders | All companies | ❌ | ❌ |
| Delete Orders | ❌ | ❌ | ❌ |

**Rules:**
- Only ADMIN can create orders (fulfillment workflow)
- Orders cannot be deleted by anyone (audit trail)
- Only ADMIN can edit orders

### FULFILinator - Deliveries

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View Deliveries | All companies | Own company | Own company |
| Create Deliveries | ✓ | ❌ | ❌ |
| Edit Deliveries | All companies | ❌ | ❌ |
| Delete Deliveries | ❌ | ❌ | ❌ |

**Rules:**
- Only ADMIN can create deliveries (fulfillment workflow)
- Deliveries cannot be deleted by anyone (audit trail)
- Only ADMIN can edit deliveries

### AUTHinator - Service Registry

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View services | ✓ | ❌ | ❌ |
| Register service | ✓ | ❌ | ❌ |
| Unregister service | ✓ | ❌ | ❌ |

**Rules:**
- Service registry is ADMIN-only
- Used for managing microservice registration

### System - Audit Logs (if implemented)

| Action | ADMIN (100) | MANAGER (30) | MEMBER (10) |
|--------|-------------|--------------|-------------|
| View audit logs | All companies | Own company | ❌ |

**Rules:**
- ADMIN sees all audit logs across platform
- MANAGER sees audit logs for their company only
- MEMBER cannot access audit logs

## Implementation Guidelines

### Permission Checks

All inators implement permissions using USERinator's role context:

```python
# Get user context from USERinator
context = userinator_client.get_user_context(user_id)
role_level = context['role_level']
company_id = context['company_id']

# Permission checks
is_admin = role_level >= 100
is_manager = role_level >= 30
is_member = role_level >= 10
```

### Company Scoping

All resources must be filtered by company:

```python
# For ADMIN: see everything
if role_level >= 100:
    queryset = Model.objects.all()

# For MANAGER/MEMBER: see own company only
else:
    queryset = Model.objects.filter(company_id=company_id)
```

### Object-Level Permissions

For editing specific resources:

```python
# Check if user can edit this resource
def can_edit_rma(user_role_level, rma_company_id, user_company_id):
    # Only ADMIN can edit
    if user_role_level >= 100:
        return True
    return False  # MANAGER/MEMBER cannot edit
```

### Create Permissions

For creating resources:

```python
# Check if user can create PO
def can_create_po(user_role_level, target_company_id, user_company_id):
    # ADMIN can create for any company
    if user_role_level >= 100:
        return True
    
    # MANAGER/MEMBER can create for own company only
    if user_role_level >= 10:
        return target_company_id == user_company_id
    
    return False
```

## Migration Notes

- Existing permission classes in USERinator remain valid
- `IsPlatformAdmin` (level >= 100) ✓
- `IsCompanyAdmin` (level >= 30) ✓
- `CompanyScopedMixin` ✓
- Add new permission classes as needed for specific actions
- All inators should query USERinator `/context/` endpoint for role data

## Testing

Each permission rule should have:
1. Unit test for ADMIN access
2. Unit test for MANAGER access (own company)
3. Unit test for MANAGER denied access (other company)
4. Unit test for MEMBER access (own company, view-only)
5. Unit test for MEMBER denied access (edit/delete)

## Security Principles

1. **Deny by default** - If permission is unclear, deny access
2. **Company scoping** - Always filter by company except for ADMIN
3. **No privilege escalation** - MANAGER cannot create ADMIN users
4. **Immutability for audit** - Critical records (Orders, Deliveries) cannot be deleted
5. **Minimal permissions** - MEMBER has read-only access by default
6. **Single source of truth** - USERinator owns all role/permission data
