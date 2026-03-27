# Inator Platform - Role-Based Access Control (RBAC)

**Centralized Permission System managed by USERinator**

All inators use USERinator's `/api/users/{user_id}/context/` endpoint to get role/company context and apply consistent authorization rules.

## Role Levels

Roles are divided into two tiers: **Platform roles** (no company affiliation, cross-company visibility) and **Company roles** (scoped to a single company).

### Platform Roles — no company association

| Role | Level | Technical Name | Description |
|------|-------|----------------|-------------|
| **Platform Admin** | 100 | `PLATFORM_ADMIN` | Full read/write access across all companies. Can create companies, manage all users, delete records. |
| **Platform Manager** | 75 | `PLATFORM_MANAGER` | Cross-company read access. Can view all data; write access is effectively blocked by having no company affiliation. |

### Company Roles — scoped to a single company

| Role | Level | Technical Name | Description |
|------|-------|----------------|-------------|
| **Company Admin** | 50 | `COMPANY_ADMIN` | Elevated company administrator. Can manage managers and members within their company, approve invitations, deactivate users up to manager level. |
| **Company Manager** | 30 | `COMPANY_MANAGER` | Company team manager. Can manage members within their company, approve invitations, deactivate members. |
| **Company Member** | 10 | `COMPANY_MEMBER` | Standard company user with read-only access to company data. |

### Key Distinctions

- **Platform roles** are assigned to internal (Sighthound) staff. They have no company and can view across all companies. Only Platform Admin has write access.
- **Company roles** are assigned to customer-facing users. They can only see and act within their own company.
- **Company Admin** has the same privileges as Company Manager in all services *except* USERinator, where it can additionally manage manager-level users and set credentials for them.
- A user cannot be assigned a role higher than the assigning user's own role level.
- `create_default_roles` seeds all five system roles. Custom roles may be added at any level 1-100 by Platform Admin.
- The platform role threshold is **75** (PLATFORM_MANAGER). Any role >= 75 with no company association is treated as a platform user.

## Permission Matrix

> **Column abbreviations:** P.Admin = Platform Admin (100) · P.Manager = Platform Manager (75)
> C.Admin = Company Admin (50) · C.Manager = Company Manager (30) · C.Member = Company Member (10)
>
> "All" = all companies · "Own" = own company only · X = not permitted

---

### USERinator — Company Management

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View company info | All | All (read) | Own | Own | Own |
| Edit company info | All | X | Own | Own | X |
| Create company | Yes | X | X | X | X |
| Delete/archive company | Yes | X | X | X | X |

**Rules:**
- Only Platform Admin can create companies.
- Platform Manager can view all companies but cannot edit any (no company affiliation).
- Company-scoped roles (C.Admin, C.Manager) can edit their own company's info.
- C.Member has read-only access to their own company.

---

### USERinator — User Management

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View user profiles | All | All (read) | Own | Own | Own |
| Edit user profiles | All | Own only (1) | Own (< 50) | Own (< 30) | X |
| Create users (C.Member) | Yes | X | Yes | Yes | X |
| Create users (C.Manager) | Yes | X | Yes | X | X |
| Create users (C.Admin) | Yes | X | X | X | X |
| Create platform users | Yes | X | X | X | X |
| Change user role | Yes | X | Own (< 50) | Own (< 30) | X |
| Deactivate user | Yes | X | Own (< 50) | Own (< 30) | X |
| Mark for deletion | Yes | X | Own (< 50) | Own (< 30) | X |
| Permanently delete user | Yes | X | X | X | X |
| Change user credentials | Yes | X | Own (< 50) | Own (< 30) | X |
| Approve/reject invitations | All | X | Own | Own | X |

(1) P.Manager can only edit their own profile, not other users'.

**Rules:**
- Users can only be assigned roles up to (and not exceeding) the acting user's own level.
- Platform Admin is the only role that can create other Platform Admin or Platform Manager accounts.
- Company Admin and Company Manager can only edit, deactivate, or change credentials for users with a *lower* role level than their own within the same company.
- Deactivation revokes AUTHinator login immediately and soft-deletes the USERinator profile.
- "Mark for deletion" flags a deactivated user for Platform Admin review. Permanent deletion removes all records.
- Invitation approval (review queue) is scoped to the approver's company for C.Admin/C.Manager.

---

### USERinator — Own Profile and Preferences

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View own profile | Yes | Yes | Yes | Yes | Yes |
| Edit own profile | Yes | Yes | Yes | Yes | Yes |
| Change own password | Yes | Yes | Yes | Yes | Yes |
| Change own username | Yes | Yes | Yes | Yes | Yes |
| View/edit preferences | Yes | Yes | Yes | Yes | Yes |

**Rules:**
- All roles can manage their own profile and preferences.
- Safe fields only for self-edit: display_name, avatar, phone, bio, job_title, department, location.
- Password/username self-changes require the user's current password for verification.

---

### RMAinator — RMA Management

> Company Admin behaves identically to Company Manager in RMAinator.

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View RMAs | All | All (read) | Own | Own | Own |
| Create RMAs | Yes | X | Yes | Yes | Yes |
| Edit RMAs | All | X | X | X | X |
| Delete RMAs | All | X | X | X | X |
| Approve/reject RMAs | All | X | X | X | X |
| Create RMA Groups | Yes | X | Yes | Yes | Yes |

**Rules:**
- All company-scoped roles can create RMAs for their company.
- RMA approval/edit/delete is Platform Admin only.
- Platform Manager has read-only visibility across all companies.

---

### RMAinator — Item Management

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View Items | Yes | X | X | X | X |
| Create/Edit/Delete Items | Yes | X | X | X | X |

**Rules:**
- Items (catalog/SKU management) are Platform Admin only.
- Items are platform-wide and not company-scoped.

---

### FULFILinator — Purchase Orders

> Company Admin behaves identically to Company Manager in FULFILinator.

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View POs | All | All (read) | Own | Own | Own |
| Create POs | Yes | X | Own | Own | Own |
| Edit POs | All | X | X | X | X |
| Delete POs | All | X | X | X | X |

**Rules:**
- All company-scoped roles can create POs for their company.
- Only Platform Admin can edit or delete POs after creation.

---

### FULFILinator — Orders

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View Orders | All | All (read) | Own | Own | Own |
| Create Orders | Yes | X | X | X | X |
| Edit Orders | All | X | X | X | X |
| Delete Orders | X | X | X | X | X |

**Rules:**
- Order creation is fulfillment workflow (Platform Admin only).
- Orders cannot be deleted by anyone (permanent audit trail).

---

### FULFILinator — Deliveries

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View Deliveries | All | All (read) | Own | Own | Own |
| Create Deliveries | Yes | X | X | X | X |
| Edit Deliveries | All | X | X | X | X |
| Delete Deliveries | X | X | X | X | X |

**Rules:**
- Delivery creation is fulfillment workflow (Platform Admin only).
- Deliveries cannot be deleted by anyone (permanent audit trail).

---

### AUTHinator — Service Registry

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View services | Yes | X | X | X | X |
| Register service | Yes | X | X | X | X |
| Unregister service | Yes | X | X | X | X |

**Rules:**
- Service registry is Platform Admin only.
- Used for managing microservice registration at the platform level.

---

### System — Audit Logs (if implemented)

| Action | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|---------|-----------|----------|
| View audit logs | All | All (read) | Own | Own | X |

**Rules:**
- Platform Admin sees all audit logs across the platform.
- Platform Manager has cross-company read access to audit logs.
- Company Admin and Manager see logs for their company only.
- Company Member cannot access audit logs.

---

## Implementation Guidelines

### Permission Checks

All inators implement permissions using USERinator's role context:

```python
# Get user context from USERinator
context = userinator_client.get_user_context(user_id)
role_level = context['role_level']
company_id = context['company_id']  # None for platform roles

# Role-level checks
PLATFORM_ROLE_THRESHOLD = 75  # PLATFORM_MANAGER is the lowest platform role

is_platform_admin   = role_level >= 100
is_platform_user    = role_level >= PLATFORM_ROLE_THRESHOLD and company_id is None
is_company_admin    = role_level >= 50 and company_id is not None
is_company_manager  = role_level >= 30 and company_id is not None
is_member           = role_level >= 10
```

### Company Scoping

All resources must be filtered by company. Platform roles bypass this filter:

```python
# Platform Admin or any platform role (>= 75, no company) -> see everything
if role_level >= 100 or (role_level >= 75 and company_id is None):
    queryset = Model.objects.all()

# Company-scoped roles -> own company only
else:
    queryset = Model.objects.filter(company_id=company_id)
```

### Object-Level Permissions

```python
# Check if acting user can edit/deactivate the target user
def can_manage_user(acting_level, acting_company, target_level, target_company):
    # Platform Admin can manage anyone
    if acting_level >= 100:
        return True
    # Company-scoped: must be same company and strictly higher level
    if acting_level >= 30 and acting_company == target_company:
        return target_level < acting_level  # cannot manage peers or superiors
    return False
```

### Privilege Escalation Prevention

```python
# User cannot assign a role higher than their own
def can_assign_role(acting_level, target_role_level):
    return target_role_level <= acting_level

# Company Admin (50) cannot create other Company Admins
# Company Manager (30) can only create Company Members (10)
# Platform roles can only be assigned by Platform Admin (100)
```

---

## Role Comparison Summary

| Capability | P.Admin | P.Manager | C.Admin | C.Manager | C.Member |
|------------|---------|-----------|---------|-----------|----------|
| Cross-company view | Yes | Yes | No | No | No |
| Company-scoped view | Yes | Yes | Yes | Yes | Yes |
| Edit company data | Yes | No | Yes | Yes | No |
| Create companies | Yes | No | No | No | No |
| Manage users (lower level) | Yes | No | Yes | Yes | No |
| Deactivate users | Yes | No | Yes | Yes (mbr only) | No |
| Mark/delete users | Yes | No | Yes | Yes (mbr only) | No |
| Approve invitations | Yes | No | Yes | Yes | No |
| Change others' credentials | Yes | No | Yes (< 50) | Yes (< 30) | No |
| Create RMAs/POs | Yes | No | Yes | Yes | Yes |
| Edit/delete RMAs/POs | Yes | No | No | No | No |
| Service registry | Yes | No | No | No | No |

---

## Security Principles

1. **Deny by default** — If permission is unclear, deny access.
2. **Company scoping** — Company roles always filter by their company. Platform Manager can observe all companies but cannot write.
3. **No privilege escalation** — Users cannot assign or manage roles equal to or higher than their own.
4. **Role hierarchy enforcement** — Company Admin cannot manage other Company Admins. Company Manager cannot manage Company Admins or other Managers.
5. **Immutability for audit** — Critical records (Orders, Deliveries) cannot be deleted by anyone.
6. **Two-step deletion** — Users are first deactivated (by managers), then marked for deletion, then permanently deleted (Platform Admin only).
7. **Minimal permissions** — Company Member has read-only access to their company's data.
8. **Single source of truth** — USERinator owns all role and permission data. AUTHinator defers to USERinator for fine-grained roles.
9. **Credential security** — Self-service credential changes require current password verification. Admin-initiated changes require appropriate role hierarchy.

## Testing

Each permission rule should have:
1. Unit test for Platform Admin access (full)
2. Unit test for Platform Manager access (read-only cross-company, no writes)
3. Unit test for Company Admin access (own company, can manage managers)
4. Unit test for Company Manager access (own company, members only)
5. Unit test for Company Member access (own company, view-only)
6. Unit test for cross-company denial (company role accessing other company)
7. Unit test for peer-management denial (manager cannot edit another manager)
