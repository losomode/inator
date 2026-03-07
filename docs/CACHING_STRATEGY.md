# Caching Strategy for Inator Platform

## Critical Security Issue Resolved

**Date:** March 7, 2026  
**Severity:** CRITICAL  
**Issue:** Dangerous token-based caching causing permission bleed between users

### The Problem

The platform had multiple caching layers that were causing serious RBAC (Role-Based Access Control) issues:

1. **Token-Based Cache Key Vulnerability (CRITICAL)**
   - `authinator_client.py` in both FULFILinator and RMAinator used `token[:20]` as cache key
   - Different users could share cached data if tokens had similar prefixes
   - **Observed behavior:** bob.manager's permissions persisted after logging out and admin logging in, even in incognito mode

2. **Long-lived Permission Caches**
   - User context cached for 5 minutes across all services
   - User profile data cached for 5 minutes
   - No cache invalidation on role/permission changes
   - No cache invalidation on logout (server-side)

3. **Multiple Cache Layers**
   - authinator_client: Token validation & user data (5 min)
   - userinator_client: User context & profile (5 min)
   - USERinator backend: User context endpoint (5 min)
   - Browser: HTTP responses (partially mitigated with no-cache headers)

## Current Caching Strategy (Post-Fix)

### Authentication & Authorization (ZERO CACHING)

**Files Modified:**
- `FULFILinator/backend/core/authinator_client.py`
- `FULFILinator/backend/core/userinator_client.py`
- `RMAinator/backend/core/authinator_client.py`
- `RMAinator/backend/core/userinator_client.py`

**Methods with NO caching:**
- `get_user_from_token()` - Validates JWT and fetches user data
- `get_user_context()` - Fetches role_level, company_id, permissions
- `get_user_profile()` - Fetches user profile data

**Rationale:**
- Permission/role data must NEVER be stale
- Security takes absolute precedence over performance
- AUTHinator `/me/` endpoint is fast enough (~10-50ms)
- USERinator `/context/` endpoint has its own caching (10s TTL)

### USERinator Server-Side Context Cache (MINIMAL)

**File:** `Userinator/backend/users/views.py` - `UserContextView.get()`

**Cache TTL:** 10 seconds (reduced from 5 minutes)

**Rationale:**
- Provides minimal performance benefit for rapid successive requests
- 10 seconds is short enough that stale data is rarely an issue
- Single source of truth for all services
- Can be further reduced or eliminated if needed

**Cache Key:** `user_context_{user_id}` (user-specific, safe)

### Company Data (LONG-LIVED, SAFE)

**File:** `FULFILinator/backend/core/userinator_client.py` - `get_company()`

**Cache TTL:** 1 hour (3600 seconds)

**Rationale:**
- Company names/data change infrequently
- Not security-sensitive (doesn't affect permissions)
- Performance benefit for displaying company names

**Cache Key:** `userinator_company_{company_id}` (company-specific, safe)

### Customer Data (LEGACY, SAFE)

**File:** `FULFILinator/backend/core/authinator_client.py` - `get_customer()`

**Cache TTL:** 1 hour (3600 seconds)

**Rationale:**
- Legacy AUTHinator customer data
- Similar to company data - infrequent changes
- Not security-sensitive

**Cache Key:** `authinator_customer_{customer_id}` (customer-specific, safe)

### Browser/HTTP Cache (NO-CACHE)

**Files:** 
- `Userinator/backend/users/views.py` - All user-related endpoints
- `Authinator/backend/auth_core/views.py` - `/me/` endpoint
- `frontend/src/shared/auth/AuthProvider.tsx` - Logout function

**Headers:**
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**localStorage/sessionStorage:** Cleared on logout

## Cache Invalidation Strategy

### When User Logs Out
1. **Frontend:**
   - `localStorage.clear()`
   - `sessionStorage.clear()`
   - Redirect to `/login` with full page reload

2. **Backend:**
   - No explicit cache clearing (TTLs handle expiration)
   - New login gets fresh token, new requests to USERinator

### When User Role/Permissions Change
1. **No caching on client services** - changes are immediately visible
2. **USERinator 10s cache** - changes visible within 10 seconds max
3. **Recommendation:** For immediate effect, consider adding cache invalidation API

### When Company Data Changes
1. **1-hour TTL** - changes visible within 1 hour
2. **Low priority** - company names rarely change
3. **Can manually clear:** `cache.delete(f"userinator_company_{company_id}")`

## Implementation Checklist

- [x] Remove token-based caching from authinator_client
- [x] Remove user context caching from userinator_client (both services)
- [x] Remove user profile caching from userinator_client (both services)
- [x] Reduce USERinator server-side cache from 5 minutes to 10 seconds
- [x] Verify no-cache headers on all user-related endpoints
- [x] Document caching strategy
- [x] Test permission changes across user switches

## Testing Recommendations

### Critical Test Cases
1. **User Switch Test**
   - Log in as bob.manager (MANAGER role)
   - Verify limited permissions
   - Log out
   - Log in as admin (ADMIN role)
   - **VERIFY:** admin has full permissions, no bob.manager data visible

2. **Incognito Mode Test**
   - Open incognito window
   - Log in as user A
   - Log out
   - Log in as user B
   - **VERIFY:** user B's permissions, no cross-contamination

3. **Permission Change Test**
   - While logged in, have admin change user's role
   - Wait 10 seconds (USERinator cache TTL)
   - Refresh page
   - **VERIFY:** New permissions take effect

## Performance Considerations

### Without Caching
- **AUTHinator `/me/` call:** ~10-50ms per request
- **USERinator `/context/` call:** ~20-100ms per request (with DB query)
- **Total auth overhead per API request:** ~50-150ms

### Acceptable for Most Use Cases
- Modern APIs handle this latency easily
- User-facing operations (< 200ms response time) still feel instant
- Background jobs not affected (no per-request auth)

### If Performance Becomes an Issue
Consider these alternatives (in order of preference):
1. **Database optimization:** Add indexes, optimize queries
2. **USERinator response time:** Profile and optimize the context endpoint
3. **Short-lived request-scoped cache:** Cache for duration of single request only
4. **Redis/Memcached:** Replace Django's default cache with faster backend
5. **Last resort:** Re-introduce caching with proper invalidation hooks

## Related Documentation

- `docs/RBAC_IMPLEMENTATION.md` - Role-Based Access Control system
- `docs/PERMISSIONS.md` - Permission matrix and requirements
- `docs/RBAC_TESTING_RESULTS.md` - Test results for RBAC implementation

## Commits

**FULFILinator:** `c0d4d11` - "CRITICAL FIX: Remove dangerous token-based user caching"  
**RMAinator:** `c60abf6` - "CRITICAL FIX: Remove dangerous token-based user caching"  
**Userinator:** `61910c9` - "Reduce server-side user context cache from 5 minutes to 10 seconds"
