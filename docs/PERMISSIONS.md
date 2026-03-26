# Inator Platform - Role-Based Access Control (RBAC)

**Centralized Permission System managed by USERinator**

All inators use USERinator's `/api/users/{user_id}/context/` endpoint to get role/company context and apply consistent authorization rules.

## Role Levels

Roles are divided into two tiers: **Platform roles** (no company affiliation, cross-company visibility) and **Company roles** (scoped to a single company).

### Platform Roles — no company association

| Role | Level | Technical Name | Description |
|------|-------|----------------|-------------|
| **Platform Admin** | 100 | `PLATFORM_ADMIN` | Full read/write access across all companies. Can create companies, manage all users, delete records. |
| **Platform Manager** | 75 | `PLATFORM_MANAGER` | Cross-company read access. Can view all data but limited write permissions (scoped by lack of company). |
| **Platform Member** | 60 | `PLATFORM_MEMBER` | Cross-company read-only access. Observer role with no write capabilities. |

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
- `create_default_roles` seeds all six system roles. Custom roles may be added at any level 1–100 by Platform Admin.

## Permission Matrix

> **Column abbreviations used in tables below:**
> P.Admin = Platform Admin (100) • P.Manager = Platform Manager (75) • P.Member = Platform Member (60)
> C.Admin = Company Admin (50) • C.Manager = Company Manager (30) • C.Member = Company Member (10)
>
> “All” = all companies • “Own” = own company only • ❌ = not permitted

---

### USERinator — Company Management

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View company info | All | All (read) | All (read) | Own | Own | Own |
| Edit company info | All | ❌ | ❌ | Own | Own | ❌ |
| Create company | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete/archive company | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Rules:**
- Only Platform Admin can create companies.
- Platform roles see all companies (read-only for P.Manager and P.Member).
- Company-scoped roles (C.Admin, C.Manager) can edit their own company’s info.
- C.Member has read-only access to their own company.

---

### USERinator — User Management

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View user profiles | All | All (read) | All (read) | Own | Own | Own |
| Edit user profiles | All | ❌\u00b9 | ❌ | Own (< 50) | Own (< 30) | ❌ |
| Create users (C.Member) | ✓ | ❌ | ❌ | ✓ | ✓ | ❌ |
| Create users (C.Manager) | ✓ | ❌ | ❌ | ✓ | ❌ | ❌ |
| Create users (C.Admin) | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create platform users | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change user role | ✓ | ❌ | ❌ | Own (< 50) | Own (< 30) | ❌ |
| Deactivate user | ✓ | ❌ | ❌ | Own (< 50) | Own (< 30) | ❌ |
| Mark for deletion | ✓ | ❌ | ❌ | Own (< 50) | Own (< 30) | ❌ |
| Permanently delete user | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change user credentials | ✓ | ❌ | ❌ | Own (< 50) | Own (< 30) | ❌ |
| Approve/reject invitations | All | ❌ | ❌ | Own | Own | ❌ |

¹ P.Manager can edit only their own profile, not others’.

**Rules:**
- Users can only be assigned roles up to (and not exceeding) the acting user’s own level.
- Platform Admin is the only role that can create other Platform Admin accounts.
- Company Admin and Company Manager can only edit, deactivate, or change credentials for users with a *lower* role level than their own within the same company.
- Deactivation revokes AUTHinator login immediately and soft-deletes the USERinator profile.
- “Mark for deletion” flags a deactivated user for Platform Admin review. Permanent deletion removes all records.
- Invitation approval (review queue) is scoped to the approver’s company for C.Admin/C.Manager.

---

### USERinator — Own Profile & Preferences

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Change own password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Change own username | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View/edit preferences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Rules:**
- All roles can manage their own profile and preferences.
- Safe fields only for self-edit: display\_name, avatar, phone, bio, job\_title, department, location.
- Password/username self-changes require the user’s current password for verification.

---

### RMAinator — RMA Management

> Company Admin behaves identically to Company Manager in RMAinator.

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View RMAs | All | All (read) | All (read) | Own | Own | Own |
| Create RMAs | ✓ | ❌ | ❌ | ✓ | ✓ | ✓ |
| Edit RMAs | All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete RMAs | All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve/reject RMAs | All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create RMA Groups | ✓ | ❌ | ❌ | ✓ | ✓ | ✓ |

**Rules:**
- All company-scoped roles can create RMAs for their company.
- RMA approval/edit/delete is Platform Admin only.
- Platform Manager/Member have read-only visibility across all companies.

---

### RMAinator — Item Management

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View Items | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create/Edit/Delete Items | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Rules:**
- Items (catalog/SKU management) are Platform Admin only.
- Items are platform-wide and not company-scoped.

---

### FULFILinator — Purchase Orders

> Company Admin behaves identically to Company Manager in FULFILinator.

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View POs | All | All (read) | All (read) | Own | Own | Own |
| Create POs | ✓ | ❌ | ❌ | Own | Own | Own |
| Edit POs | All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete POs | All | ❌ | ❌ | ❌ | ❌ | ❌ |

**Rules:**
- All company-scoped roles can create POs for their company.
- Only Platform Admin can edit or delete POs after creation.

---

### FULFILinator — Orders

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View Orders | All | All (read) | All (read) | Own | Own | Own |
| Create Orders | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Orders | All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Orders | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Rules:**
- Order creation is fulfillment workflow (Platform Admin only).
- Orders cannot be deleted by anyone (permanent audit trail).

---

### FULFILinator — Deliveries

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View Deliveries | All | All (read) | All (read) | Own | Own | Own |
| Create Deliveries | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit Deliveries | All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete Deliveries | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Rules:**
- Delivery creation is fulfillment workflow (Platform Admin only).
- Deliveries cannot be deleted by anyone (permanent audit trail).

---

### AUTHinator — Service Registry

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View services | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Register service | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Unregister service | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Rules:**
- Service registry is Platform Admin only.
- Used for managing microservice registration at the platform level.

---

### System — Audit Logs (if implemented)

| Action | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|--------|---------|-----------|----------|---------|-----------|----------|
| View audit logs | All | All (read) | ❌ | Own | Own | ❌ |

**Rules:**
- Platform Admin sees all audit logs across the platform.
- Platform Manager has cross-company read access to audit logs.
- Company Admin and Manager see logs for their company only.
- Company Member cannot access audit logs.

---

## Implementation Guidelines

### Permission Checks

All inators implement permissions using USERinator’s role context:

```python
# Get user context from USERinator
context = userinator_client.get_user_context(user_id)
role_level = context['role_level']
company_id = context['company_id']  # None for platform roles

# Role-level checks
is_platform_admin   = role_level >= 100  # PLATFORM_ADMIN
is_platform_user    = role_level >= 60 and company_id is None  # any platform role
is_company_admin    = role_level >= 50 and company_id is not None  # C.Admin+
is_company_manager  = role_level >= 30 and company_id is not None  # C.Manager+
is_member           = role_level >= 10
```

### Company Scoping

All resources must be filtered by company. Platform roles bypass this filter:

```python
# Platform Admin or any platform role (60+, no company) → see everything
if role_level >= 100 or (role_level >= 60 and company_id is None):
    queryset = Model.objects.all()

# Company-scoped roles → own company only
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
    # Company-scoped: must be same company and higher level
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
```

---

## Role Comparison Summary

| Capability | P.Admin | P.Manager | P.Member | C.Admin | C.Manager | C.Member |
|------------|---------|-----------|----------|---------|-----------|----------|
| Cross-company view | ✓ | ✓ | ✓ | ❌ | ❌ | ❌ |
| Company-scoped view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit company data | ✓ | ❌ | ❌ | ✓ | ✓ | ❌ |
| Create companies | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage users (lower level) | ✓ | ❌ | ❌ | ✓ | ✓ | ❌ |
| Deactivate users | ✓ | ❌ | ❌ | ✓ | ✓ (mbr only) | ❌ |
| Mark/delete users | ✓ | ❌ | ❌ | ✓ | ✓ (mbr only) | ❌ |
| Approve invitations | ✓ | ❌ | ❌ | ✓ | ✓ | ❌ |
| Change others’ credentials | ✓ | ❌ | ❌ | ✓ (< 50) | ✓ (< 30) | ❌ |
| Create RMAs/POs | ✓ | ❌ | ❌ | ✓ | ✓ | ✓ |
| Edit/delete RMAs/POs | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Service registry | ✓ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Security Principles

1. **Deny by default** — If permission is unclear, deny access.
2. **Company scoping** — Company roles always filter by their company. Platform roles may observe all companies but only Platform Admin can modify cross-company.
3. **No privilege escalation** — Users cannot assign or manage roles equal to or higher than their own.
4. **Role hierarchy enforcement** — Company Admin cannot manage other Company Admins. Company Manager cannot manage Company Admins or other Managers.
5. **Immutability for audit** — Critical records (Orders, Deliveries) cannot be deleted by anyone.
6. **Two-step deletion** — Users are first deactivated (by managers), then marked for deletion, then permanently deleted (Platform Admin only).
7. **Minimal permissions** — Company Member has read-only access to their company’s data.
8. **Single source of truth** — USERinator owns all role and permission data. AUTHinator defers to USERinator for fine-grained roles.
9. **Credential security** — Self-service credential changes require current password verification. Admin-initiated changes require appropriate role hierarchy.

## Testing

Each permission rule should have:
1. Unit test for Platform Admin access (full)
2. Unit test for Platform Manager/Member access (read-only cross-company)
3. Unit test for Company Admin access (own company, can manage managers)
4. Unit test for Company Manager access (own company, members only)
5. Unit test for Company Member access (own company, view-only)
6. Unit test for cross-company denial (company role accessing other company)
7. Unit test for peer-management denial (manager cannot edit another manager)
