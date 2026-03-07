# RBAC Implementation Summary

**Status**: Phases 1-5 Complete ✅ | Phase 6 (Testing) Pending

## Overview

Implemented a comprehensive Role-Based Access Control (RBAC) system across the Inator Platform microservices. The system uses role levels from USERinator as the single source of truth for authorization decisions across all services.

## Architecture

### Role Levels
- **ADMIN** (100): Platform super-administrator with full access across all companies
- **MANAGER** (30): Company manager with team management and elevated access within their company
- **MEMBER** (10): Standard company member with read-only access to company data

### Centralized Permission System
All inators use USERinator's `/api/users/{user_id}/context/` endpoint to get:
- `role_level`: Numeric role level for permission checks
- `role_name`: Human-readable role name
- `company_id`: User's company for data scoping
- `permissions`: Full permission dictionary for frontend consumption

Response is cached for 5 minutes to minimize database queries.

## Implementation by Service

### Phase 1: USERinator (Complete ✅)

#### Backend (`Userinator/backend/`)

**1. Permissions Framework**
- Created `permissions/checker.py` with PermissionChecker class (262 lines)
- Provides role-level and permission-specific checks
- Methods: `can_view_company()`, `can_edit_user()`, `can_create_user(role_level)`, etc.
- Returns full permissions dictionary via `get_permissions_dict()`

**2. Permission Classes** (`core/permissions.py`)
- `AdminOnly(BasePermission)`: Requires role_level >= 100
- `ManagerOrHigher(BasePermission)`: Requires role_level >= 30
- `CanViewCompanyScopedResource(BasePermission)`: Authenticated users with queryset filtering

**3. View Updates**
- **Companies**: Only ADMIN can create/list all, MANAGER can edit own company, all can view own company
- **Users**: ADMIN can create any role, MANAGER can create MEMBER only, ADMIN can delete, MANAGER can deactivate MEMBER/MANAGER in own company
- **Invitations**: MANAGER+ can review/approve for own company

**4. Serializer Validation**
- UserProfileCreateSerializer: Validates MANAGER can only create MEMBER (role_level=10)
- UserProfileCreateSerializer: Validates users can only create for own company
- UserProfileAdminUpdateSerializer: Prevents privilege escalation

**5. Context Endpoint**
- Updated `/api/users/{user_id}/context/` to include permissions dictionary
- Cached for 5 minutes (300 seconds)
- Used by all services for authorization

#### Frontend (`Userinator/frontend/src/`)

**1. Permission Types** (`shared/permissions/types.ts`)
- Comprehensive Permissions interface with all permission flags
- RoleLevel enum (MEMBER=10, MANAGER=30, ADMIN=100)
- RoleName type ('MEMBER' | 'MANAGER' | 'ADMIN')

**2. usePermissions Hook** (`shared/permissions/usePermissions.ts`)
- Returns full permissions object from user context
- Provides convenience role checks: `isAdmin`, `isManager`, `isMember`
- Safe defaults (no permissions) if user not loaded

**3. Guard Components**
- **PermissionGuard**: Conditional rendering based on specific permission
  ```tsx
  <PermissionGuard permission="can_edit_company">
    <EditButton />
  </PermissionGuard>
  ```
- **RoleGuard**: Conditional rendering based on role level
  ```tsx
  <RoleGuard minRole="MANAGER">
    <AdminPanel />
  </RoleGuard>
  ```

**4. AuthProvider Updates**
- Fetches user context including permissions on login
- Makes permissions available throughout app
- Updated User interface to include optional `permissions` field

**5. UI Updates**
- CompanyPage: Edit button only shows with `can_edit_company` permission
- CompanyEditPage: Wrapped in PermissionGuard, shows fallback for unauthorized users
- InvitationReviewPage: Wrapped in RoleGuard requiring MANAGER+

### Phase 2: RMAinator (Complete ✅)

#### Backend (`RMAinator/backend/`)

**1. Permission Classes** (`core/permissions.py`)
- Updated `IsAdmin` to use `role_level >= 100` instead of `is_admin`
- Added `AdminOnly` permission class (alias for IsAdmin)

**2. View Updates** (`rma/views.py`)
- **RMA List/Detail**: ADMIN sees all RMAs, others see only their company's RMAs
- **RMA Edit/Delete**: Only ADMIN can edit or delete (enforced via `check_permissions()`)
- **RMA State Updates**: ADMIN-only (already used IsAdmin permission)
- **Attachments**: Company-scoped (ADMIN can upload to any, others only own company)
- **Audit Logs**: Company-scoped visibility

**Key Changes**:
- Replaced `user.is_admin` checks with `role_level >= 100`
- Replaced `owner` filtering with `company_id` filtering for company scoping
- ADMIN sees all companies, MANAGER/MEMBER see only own company

### Phase 3: FULFILinator (Complete ✅)

#### Backend (`FULFILinator/backend/`)

**1. Permission Classes** (`core/permissions.py`)
- Updated `IsAdmin` to use `role_level >= 100`
- Added `AdminOnly` permission class
- Updated `CustomerDataIsolation` to use `role_level` and `company_id_remote`
- Added legacy support for `customer_id` (maps to `company_id`)

**Key Changes**:
- Views already had proper company-scoped logic using `customer_id`
- Permission classes now check `role_level` instead of `is_admin`
- Legacy `customer_id` field supported during migration (maps to `company_id_remote`)

**Permission Matrix**:
- **Purchase Orders**: All can create for own company, only ADMIN can edit/delete
- **Orders**: Only ADMIN can create/edit, cannot delete (audit trail)
- **Deliveries**: Only ADMIN can create/edit, cannot delete (audit trail)

## Permission Matrix Reference

See `/Users/ryan/opt/sighthound/inator/docs/PERMISSIONS.md` for complete permission matrix.

### Key Rules Summary

**USERinator**:
- ADMIN: Full access across all companies
- MANAGER: Can manage own company, create MEMBER users, approve invitations
- MEMBER: Read-only access to own company data

**RMAinator**:
- All users can create RMAs for their company
- Only ADMIN can edit/delete/approve/reject RMAs
- Items (catalog/SKU): ADMIN-only

**FULFILinator**:
- All users can create POs for their company
- Only ADMIN can create/edit Orders and Deliveries
- Orders and Deliveries cannot be deleted (audit trail)

## Git Commits

1. **062eaf0**: feat(rbac): implement comprehensive permission system (USERinator backend)
2. **2b95833**: feat(rbac): enforce permissions in USERinator views
3. **b02dc80**: feat(rbac): enforce permissions in RMAinator views
4. **7cf661a**: feat(rbac): update permission classes to use role_level (FULFILinator)
5. **bb9c977**: feat(rbac): add frontend permission infrastructure (USERinator)
6. **fcd877a**: feat(rbac): add permission guards to USERinator frontend pages

## Migration Notes

### Backend Migration
1. Update authentication middleware to attach `role_level` and `company_id_remote` from USERinator context
2. Replace `is_admin` checks with `role_level >= 100`
3. Replace `customer_id` with `company_id` where applicable
4. Update demo/seed data to use role_level instead of is_admin

### Frontend Migration
1. Update API client to fetch `/users/{user_id}/context/` on login
2. Replace manual role checks (`isAdmin`, `isCompanyAdmin`) with `usePermissions()` hook
3. Wrap protected UI elements in `<PermissionGuard>` or `<RoleGuard>`
4. Update navigation/routing to hide unauthorized pages

## Testing (Phase 6 - Pending)

### Backend Tests Needed
- [ ] Permission checker unit tests for all methods
- [ ] View permission enforcement tests (ADMIN, MANAGER, MEMBER)
- [ ] Company-scoped queryset filtering tests
- [ ] Serializer validation tests (role creation, company scoping)
- [ ] Integration tests across services

### Frontend Tests Needed
- [ ] usePermissions hook tests
- [ ] PermissionGuard rendering tests
- [ ] RoleGuard rendering tests
- [ ] Context endpoint integration tests
- [ ] E2E tests for permission-protected pages

### Manual Testing Checklist
- [ ] ADMIN can access all features across all companies
- [ ] MANAGER can manage own company and create MEMBER users
- [ ] MEMBER has read-only access and can create RMAs/POs
- [ ] Permission-protected buttons/pages hide for unauthorized users
- [ ] API returns 403 for unauthorized actions

## Future Enhancements

1. **Fine-grained Permissions**: System is designed to support custom permissions per role if needed
2. **Permission Groups**: Add permission groups for easier management
3. **Audit Logging**: Log all permission checks and denials
4. **Permission UI**: Admin interface for viewing/managing permissions
5. **Multi-tenancy**: Already supports company isolation, can extend for multi-tenant scenarios

## Documentation

- **Permission Specification**: `/Users/ryan/opt/sighthound/inator/docs/PERMISSIONS.md`
- **This Summary**: `/Users/ryan/opt/sighthound/inator/docs/RBAC_IMPLEMENTATION.md`

## Contact

For questions about RBAC implementation, refer to:
- PermissionChecker class: `Userinator/backend/permissions/checker.py`
- usePermissions hook: `Userinator/frontend/src/shared/permissions/usePermissions.ts`
- Permission matrix: `docs/PERMISSIONS.md`
