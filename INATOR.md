# INATOR Platform: Microservice Development Standard

## 1. NAMING CONVENTIONS

### 1.1 Repository Names
- MUST follow pattern: `{Concept}inator` (PascalCase)
- MUST use domain-specific name (RMAinator, FULFILinator, AUTHinator)
- MUST NOT use generic names (Datainator, APIinator)

### 1.2 Python Package Names
- Backend directories MUST be named `backend/`
- Django project MUST be named `config/`
- Apps MUST use snake_case (auth_core, purchase_orders, rma)
- MUST NOT use hyphens in Python module names

### 1.3 API Paths
- MUST follow pattern: `/api/{concept}/` (lowercase)
- Authinator: `/api/auth/`, `/api/services/`
- USERinator: `/api/users/`, `/api/companies/`, `/api/roles/`, `/api/invitations/`
- RMAinator: `/api/rma/`
- FULFILinator: `/api/fulfil/`
- MUST NOT use version numbers in path (no `/api/v1/`)

### 1.4 Frontend Module Names
- MUST use lowercase for module directories (auth, rma, fulfil)
- TypeScript files MUST use camelCase (AuthProvider.tsx, apiClient.ts)
- MUST place in `frontend/src/modules/{concept}/`

## 2. DJANGO BACKEND ARCHITECTURE

### 2.1 Project Structure (REQUIRED)
```
{Inator}/
├── backend/
│   ├── config/              # Django project (MUST be named 'config')
│   │   ├── settings.py      # MUST use this structure
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── core/                # MUST exist in every inator
│   │   ├── authentication.py  # If not Authinator
│   │   ├── permissions.py
│   │   └── authinator_client.py  # If not Authinator
│   ├── {domain_app}/        # Primary business logic app
│   ├── users/               # User model (stub or full)
│   ├── requirements.txt
│   └── manage.py
└── .venv/                   # MUST be at inator root, NOT in backend/
```

### 2.2 Django Settings Configuration (settings.py)

#### 2.2.1 Required Imports
```python
from pathlib import Path
from decouple import config  # MUST use python-decouple
from datetime import timedelta
```

#### 2.2.2 Security Settings (REQUIRED)
- SECRET_KEY: MUST use `config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')`
- DEBUG: MUST use `config('DEBUG', default=True, cast=bool)`
- ALLOWED_HOSTS: MUST use decouple with list parsing:
  ```python
  ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', 
                         cast=lambda v: [s.strip() for s in v.split(',')])
  ```

#### 2.2.3 Deployment Domain Support (REQUIRED)
MUST include this exact pattern in all inators:
```python
# External domain deployment support
DEPLOY_DOMAIN = config('DEPLOY_DOMAIN', default='')
DEPLOY_SCHEME = config('DEPLOY_SCHEME', default='https' if DEPLOY_DOMAIN else 'http')

if DEPLOY_DOMAIN:
    # Add deployment domain and bare variant to ALLOWED_HOSTS
    ALLOWED_HOSTS.append(DEPLOY_DOMAIN)
    bare_domain = DEPLOY_DOMAIN.replace('www.', '')
    if bare_domain != DEPLOY_DOMAIN:
        ALLOWED_HOSTS.append(bare_domain)
```

#### 2.2.4 CORS Configuration (REQUIRED)
MUST configure CORS for unified gateway pattern:
```python
# CORS settings — all traffic flows through the Caddy gateway (:8080)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:8080',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Add deployment domain to CORS if configured
if DEPLOY_DOMAIN:
    CORS_ALLOWED_ORIGINS.append(f'{DEPLOY_SCHEME}://{DEPLOY_DOMAIN}')
    bare_domain = DEPLOY_DOMAIN.replace('www.', '')
    if bare_domain != DEPLOY_DOMAIN:
        CORS_ALLOWED_ORIGINS.append(f'{DEPLOY_SCHEME}://{bare_domain}')

CORS_ALLOW_CREDENTIALS = True
```

#### 2.2.5 CSRF Configuration (REQUIRED)
```python
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False  # Set to True in production with HTTPS
CSRF_TRUSTED_ORIGINS = ['http://localhost:8080']

# Add deployment domain to CSRF trusted origins
if DEPLOY_DOMAIN:
    CSRF_TRUSTED_ORIGINS.append(f'{DEPLOY_SCHEME}://{DEPLOY_DOMAIN}')
    bare_domain = DEPLOY_DOMAIN.replace('www.', '')
    if bare_domain != DEPLOY_DOMAIN:
        CSRF_TRUSTED_ORIGINS.append(f'{DEPLOY_SCHEME}://{bare_domain}')
```

#### 2.2.6 Session Configuration (REQUIRED)
```python
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True
```

#### 2.2.7 Installed Apps (REQUIRED ORDER)
```python
INSTALLED_APPS = [
    # Admin customization MUST come first (if used)
    'admin_interface',  # Optional
    'colorfield',       # Optional, if using admin_interface
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Required for Authinator SSO
    # Third party (REQUIRED)
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',  # OPTIONAL but recommended
    # Authinator-specific (if Authinator)
    'rest_framework_simplejwt.token_blacklist',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    # Local apps
    'core',
    'users',
    '{domain_apps}',
]
```

#### 2.2.8 Middleware (REQUIRED ORDER)
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # MUST be early
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',  # If using allauth
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

#### 2.2.9 Database Configuration
- Development MUST use SQLite: `BASE_DIR / 'db.sqlite3'`
- Production SHOULD support PostgreSQL via environment variables
- MUST NOT commit database files

#### 2.2.10 Static/Media Files
```python
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'  # If serving static files
MEDIA_URL = '/media/'  # If handling uploads
MEDIA_ROOT = BASE_DIR / 'media'
```

### 2.3 Authentication Patterns

#### 2.3.1 Authinator (Central Auth Service)
MUST implement:
- Full Django User model with custom fields
- JWT token generation with SimpleJWT
- SSO integration with django-allauth
- Service registry for other inators
- MFA (TOTP and WebAuthn) support

REST_FRAMEWORK settings:
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}
```

MUST include FRONTEND_URL for SSO redirects:
```python
# Frontend URL for SSO redirects
FRONTEND_URL = config(
    'FRONTEND_URL',
    default=f'{DEPLOY_SCHEME}://{DEPLOY_DOMAIN}' if DEPLOY_DOMAIN else 'http://localhost:8080'
)
```

#### 2.3.2 Non-Authinator Services
MUST implement remote authentication:

1. Create `core/authentication.py` with `AuthinatorJWTAuthentication` class
2. Create `core/authinator_client.py` for API calls to Authinator
3. Create stub User model for foreign key relations OR use AuthinatorUser object

Pattern A (Stub User Model - RMAinator style):
```python
# users/models.py - Minimal stub for FK relations
class User(models.Model):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField()
    
    class Meta:
        managed = False  # OPTIONAL: if syncing IDs from Authinator

# core/authentication.py
class AuthinatorJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        # Extract token from header
        # Validate with Authinator API
        # Get or create local User stub
        # Attach role/permission attributes dynamically
        return (user, token)
```

Pattern B (No User Model - FULFILinator style):
```python
# core/authentication.py
class AuthinatorUser:
    """Non-model user object from Authinator data."""
    def __init__(self, user_data):
        self.id = user_data['id']
        self.username = user_data['username']
        self.role = user_data['role']
        self.is_authenticated = True
    
    @property
    def is_admin(self):
        return self.role in ('ADMIN', 'SYSTEM_ADMIN', 'CUSTOMER_ADMIN')

class AuthinatorJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        # Extract token, validate with Authinator
        user = AuthinatorUser(user_data)
        return (user, token)
```

REST_FRAMEWORK settings for non-Authinator services:
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.authentication.AuthinatorJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,  # Can vary by service
}

AUTHINATOR_API_URL = config('AUTHINATOR_API_URL', default='http://localhost:8001/api/auth/')
AUTHINATOR_VERIFY_SSL = config('AUTHINATOR_VERIFY_SSL', default=False, cast=bool)
```

### 2.4 Service Registry (Non-Authinator Only)
MUST configure service registry for discovery:
```python
SERVICE_REGISTRY_URL = config('SERVICE_REGISTRY_URL', 
                               default='http://localhost:8001/api/services/register/')
SERVICE_REGISTRATION_KEY = config('SERVICE_REGISTRATION_KEY', 
                                   default='dev-service-key-change-in-production')
```

### 2.5 API Views and Serializers

#### 2.5.1 ViewSet/APIView Patterns
MUST use Django REST Framework class-based views:
```python
from rest_framework import generics, viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin

# List + Create
class ResourceListCreateView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ResourceSerializer
    
    def get_queryset(self):
        # Filter by user if needed
        user = self.request.user
        queryset = Resource.objects.all()
        if not user.is_admin:
            queryset = queryset.filter(owner=user)
        return queryset

# Retrieve + Update + Delete
class ResourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ResourceDetailSerializer
    
    def get_queryset(self):
        # Apply permissions
        return Resource.objects.all()

# Custom action
class ResourceActionView(views.APIView):
    permission_classes = (IsAdmin,)
    
    def post(self, request, pk):
        # Custom logic
        return Response({'status': 'success'})
```

#### 2.5.2 Serializer Patterns
MUST use ModelSerializer with explicit fields:
```python
from rest_framework import serializers

class ResourceSerializer(serializers.ModelSerializer):
    # Nested serializers for relations
    owner = UserSerializer(read_only=True)
    
    # Read-only computed fields
    computed_value = serializers.ReadOnlyField()
    
    class Meta:
        model = Resource
        fields = '__all__'  # OR explicit tuple
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        # Set owner from request
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)
    
    def to_representation(self, instance):
        """Customize output based on user role."""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Hide admin-only fields from non-admin
        if request and not request.user.is_admin:
            data.pop('sensitive_field', None)
        
        return data
```

MUST use separate serializers for different operations:
- `{Model}ListSerializer` - List views (summary fields)
- `{Model}DetailSerializer` - Detail views (all fields)
- `{Model}CreateSerializer` - Creation (user input fields only)
- `{Model}UpdateSerializer` - Updates (editable fields)

#### 2.5.3 URL Patterns
MUST use clear, RESTful URL patterns:
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# For ViewSets
router = DefaultRouter()
router.register(r'resources', ResourceViewSet, basename='resource')

urlpatterns = [
    path('api/', include(router.urls)),
    # Or explicit paths
    path('api/{concept}/', ResourceListCreateView.as_view(), name='resource-list'),
    path('api/{concept}/<int:pk>/', ResourceDetailView.as_view(), name='resource-detail'),
    path('api/{concept}/<int:pk>/action/', ResourceActionView.as_view(), name='resource-action'),
]
```

### 2.6 Permissions
MUST create `core/permissions.py`:
```python
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """Check if user is admin."""
    def has_permission(self, request, view):
        return bool(request.user and 
                   request.user.is_authenticated and 
                   request.user.is_admin)

class IsOwnerOrAdmin(BasePermission):
    """Object-level: owner or admin can access."""
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return obj.owner == request.user
```

### 2.7 Models

#### 2.7.1 Model Patterns
```python
from django.db import models
from django.conf import settings

class Resource(models.Model):
    """Model docstring."""
    
    # Use TextChoices for choice fields
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
    
    # ForeignKey to User
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # MUST use this, not direct import
        on_delete=models.CASCADE,
        related_name='resources'
    )
    
    # Fields
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Computed properties
    @property
    def computed_value(self):
        """Calculate derived value."""
        return self.field_a + self.field_b
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['owner']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.status}"
```

#### 2.7.2 Model Guidelines
- MUST use `settings.AUTH_USER_MODEL` for user ForeignKeys
- MUST use `auto_now_add=True` for created_at
- MUST use `auto_now=True` for updated_at
- SHOULD add database indexes for frequently queried fields
- SHOULD use `related_name` for all ForeignKeys
- MUST use `on_delete=models.CASCADE` or `SET_NULL` appropriately

## 3. FRONTEND ARCHITECTURE

### 3.1 Technology Stack (REQUIRED)
- React 19+
- TypeScript (strict mode)
- Vite 7+ (build tool)
- React Router 7+ (routing)
- Tailwind CSS 4+ (styling)
- Axios (API client)
- Vitest (testing)

### 3.2 Project Structure (REQUIRED)
```
frontend/
├── src/
│   ├── modules/              # Feature modules
│   │   ├── auth/
│   │   │   ├── api.ts       # API calls
│   │   │   ├── types.ts     # TypeScript types
│   │   │   └── pages/       # Module-specific pages
│   │   ├── rma/
│   │   └── fulfil/
│   ├── shared/               # Shared code
│   │   ├── api/
│   │   │   └── client.ts    # Axios instance
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── layout/
│   │   │   └── Layout.tsx
│   │   └── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 3.3 API Client Configuration (REQUIRED)
MUST create `src/shared/api/client.ts`:
```typescript
import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Shared axios instance for all API calls.
 * Base URL is relative — Caddy gateway routes by path prefix.
 */
const apiClient = axios.create({
  baseURL: '/api',  // MUST be relative, NOT absolute URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Attach Bearer token to requests
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
```

### 3.4 Module API Pattern (REQUIRED)
MUST create `src/modules/{concept}/api.ts` for each module:
```typescript
import apiClient from '../../shared/api/client';
import type { Resource, CreateResourceInput } from './types';

export const resourceApi = {
  list: async (params?: Record<string, unknown>): Promise<Resource[]> => {
    const response = await apiClient.get<Resource[]>('/resource/', { params });
    return response.data;
  },
  
  get: async (id: number | string): Promise<Resource> => {
    const response = await apiClient.get<Resource>(`/resource/${String(id)}/`);
    return response.data;
  },
  
  create: async (data: CreateResourceInput): Promise<Resource> => {
    const response = await apiClient.post<Resource>('/resource/', data);
    return response.data;
  },
  
  update: async (id: number | string, data: Partial<Resource>): Promise<Resource> => {
    const response = await apiClient.patch<Resource>(`/resource/${String(id)}/`, data);
    return response.data;
  },
  
  delete: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/resource/${String(id)}/`);
  },
};
```

### 3.5 TypeScript Types (REQUIRED)
MUST create `src/modules/{concept}/types.ts`:
```typescript
// Mirror Django model structure
export interface Resource {
  id: number;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  owner: User;
  created_at: string;  // ISO date string
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

// Input types (no read-only fields)
export interface CreateResourceInput {
  name: string;
  description?: string;
}
```

### 3.6 Auth Provider (REQUIRED)
MUST use shared AuthProvider at `src/shared/auth/AuthProvider.tsx`:
```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { setToken, clearToken } from '../api/client';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);
  
  // Check for SSO token in URL params (after OAuth redirect)
  useEffect(() => {
    captureTokenFromUrl();
  }, []);
  
  const isAdmin = user?.role === 'ADMIN';
  
  // Implementation details...
  
  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### 3.7 Vite Configuration (REQUIRED)
MUST configure Vite with allowedHosts for deployment:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: process.env.VITE_DEPLOY_DOMAIN 
      ? [process.env.VITE_DEPLOY_DOMAIN] 
      : undefined,
  },
});
```

### 3.8 Layout Component (REQUIRED)
MUST use shared layout with module-specific nav:
```typescript
interface LayoutProps {
  children: ReactNode;
  title: string;           // Module name
  subtitle?: string;       // Short description
  navItems: NavItem[];     // Module-specific nav
}

export function Layout({ children, title, subtitle, navItems }: LayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  
  // Filter nav items by admin status
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);
  
  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header with user info and logout */}
      <header>...</header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with module nav */}
        <div className="w-64 bg-white">
          <nav>{/* Render navItems */}</nav>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

### 3.9 Package.json Scripts (REQUIRED)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "fmt": "prettier --write 'src/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 4. TASKFILE AUTOMATION

### 4.1 Required Taskfile Structure
Each inator MUST have `Taskfile.yml` at repository root with these patterns:

```yaml
version: '3'

set:
  - errexit
  - nounset
  - pipefail

env:
  PATH: "{{.ROOT_DIR}}/.venv/bin:{{.PATH}}"

vars:
  PROJECT_NAME: {Inator}Name
  BACKEND_DIR: backend
  FRONTEND_DIR: frontend
  COVERAGE_THRESHOLD: 85  # MUST enforce 85% minimum
```

### 4.2 Required Tasks (MUST IMPLEMENT)

#### Backend Tasks
- `backend:install` - Create venv at `{ROOT}/.venv` and install requirements
- `backend:migrate` - Run Django migrations
- `backend:makemigrations` - Create new migrations
- `backend:test` - Run tests
- `backend:test:coverage` - Run tests with coverage report, enforce threshold
- `backend:lint` - Run ruff (if installed)
- `backend:fmt` - Run black (if installed)
- `backend:dev` - Start Django server on assigned port
- `backend:shell` - Open Django shell
- `backend:manage` - Run arbitrary management command

#### Frontend Tasks
- `frontend:install` - npm install
- `frontend:dev` - Start Vite dev server
- `frontend:build` - Build for production
- `frontend:preview` - Preview production build
- `frontend:lint` - Run ESLint
- `frontend:typecheck` - Run TypeScript type checking
- `frontend:fmt` - Run Prettier
- `frontend:test` - Run Vitest tests
- `frontend:test:coverage` - Run tests with coverage

#### Combined Tasks
- `install` - Install both backend and frontend
- `test` - Run all tests
- `test:coverage` - Run all tests with coverage (≥85%)
- `lint` - Lint all code
- `fmt` - Format all code
- `check` - Pre-commit checks (fmt, lint, test:coverage)
- `build` - Build for production
- `clean` - Remove artifacts
- `clean:all` - Remove artifacts and dependencies
- `db:reset` - Reset database (with prompt)
- `stats` - Show project statistics

### 4.3 Port Assignments (MUST USE)
- Authinator backend: 8001
- RMAinator backend: 8002
- FULFILinator backend: 8003
- Additional inators: 8004+
- Unified frontend (Vite): 5173
- Unified gateway (Caddy): 8080

## 5. ENVIRONMENT VARIABLES

### 5.1 Backend .env.example (REQUIRED)
Every inator MUST provide `.env.example`:

#### Authinator Template
```bash
# Security
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# External domain deployment (leave empty for local dev)
DEPLOY_DOMAIN=
DEPLOY_SCHEME=https
FRONTEND_URL=http://localhost:8080

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:8080

# Database
DATABASE_URL=sqlite:///db.sqlite3

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@authinator.local

# Service Registry
SERVICE_REGISTRY_ENABLED=True
SERVICE_REGISTRATION_KEY=dev-service-key-change-in-production

# SSO Providers (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

#### Non-Authinator Template
```bash
# Security
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# External domain deployment (leave empty for local dev)
DEPLOY_DOMAIN=
DEPLOY_SCHEME=https

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:8080

# Authinator Integration
AUTHINATOR_API_URL=http://localhost:8001/api/auth/
AUTHINATOR_VERIFY_SSL=False

# Service Registry
SERVICE_REGISTRY_URL=http://localhost:8001/api/services/register/
SERVICE_REGISTRATION_KEY=dev-service-key-change-in-production
```

### 5.2 Frontend .env.example (REQUIRED)
```bash
# External domain deployment (leave empty for local dev)
VITE_DEPLOY_DOMAIN=
```

## 6. TESTING REQUIREMENTS

### 6.1 Backend Testing (REQUIRED)
- MUST use Django TestCase or pytest-django
- MUST achieve ≥85% code coverage
- MUST test all authentication/authorization logic
- MUST test model methods and properties
- MUST test API endpoints
- SHOULD test serializer validation

Test file naming: `test_*.py` in app directories

Example test structure:
```python
from django.test import TestCase
from rest_framework.test import APITestCase
from unittest.mock import patch

class ModelTest(TestCase):
    def setUp(self):
        # Create test data
        pass
    
    def test_model_behavior(self):
        # Test model logic
        pass

class APITest(APITestCase):
    def setUp(self):
        # Create test user and authenticate
        pass
    
    def test_list_endpoint(self):
        response = self.client.get('/api/resource/')
        self.assertEqual(response.status_code, 200)
```

### 6.2 Frontend Testing (REQUIRED)
- MUST use Vitest + React Testing Library
- MUST test all API functions
- SHOULD test components
- SHOULD test auth flows

Test file naming: `*.test.ts` or `*.test.tsx` alongside source files

## 7. DOCUMENTATION REQUIREMENTS

### 7.1 README.md (REQUIRED)
Each inator MUST have README.md with:
1. Project description and purpose
2. Tech stack versions
3. Prerequisites
4. Quick start guide using Taskfile
5. Development workflow
6. API overview
7. Testing instructions
8. Deployment notes

### 7.2 API Documentation
- SHOULD use drf-spectacular for OpenAPI schema
- SHOULD document all endpoints
- SHOULD include request/response examples

### 7.3 Code Comments
- MUST document complex business logic
- SHOULD document model fields with help_text
- SHOULD document serializer validation logic

## 8. VERSION CONTROL (REQUIRED)

### 8.1 Git Ignore
MUST include in `.gitignore`:
```
# Python
__pycache__/
*.py[cod]
*.so
.venv/
*.egg-info/
.coverage
.pytest_cache/
db.sqlite3

# Frontend
node_modules/
dist/
.vite/

# Environment
.env
*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
```

### 8.2 Commit Messages
SHOULD follow conventional commits:
- `feat(scope): description`
- `fix(scope): description`
- `docs(scope): description`
- `refactor(scope): description`
- `test(scope): description`

### 8.3 Secrets (CRITICAL)
- MUST NOT commit SECRET_KEY, API keys, passwords
- MUST use .env files for secrets
- MUST provide .env.example templates

## 9. DEPLOYMENT CONFIGURATION

### 9.1 External Domain Support (REQUIRED)
All inators MUST support deployment with external domains via:
- DEPLOY_DOMAIN environment variable
- DEPLOY_SCHEME (http/https) environment variable
- Dynamic ALLOWED_HOSTS, CORS, CSRF configuration
- Frontend VITE_DEPLOY_DOMAIN support

### 9.2 Cloudflare Tunnel (RECOMMENDED)
SHOULD document Cloudflare Tunnel setup in docs/DEPLOYMENT.md

### 9.3 Production Readiness
- MUST set DEBUG=False
- MUST use strong SECRET_KEY
- MUST enable HTTPS (CSRF_COOKIE_SECURE, SESSION_COOKIE_SECURE)
- SHOULD use PostgreSQL instead of SQLite
- SHOULD configure proper logging

## 10. DEPENDENCY MANAGEMENT

### 10.1 Backend Dependencies (REQUIRED)
Minimum requirements.txt:
```
Django>=6.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.4
django-cors-headers>=4.6
python-decouple>=3.8
```

Additional based on needs:
- `django-allauth` (for SSO - Authinator only)
- `drf-spectacular` (for API docs)
- `pytest-django` (for testing)
- `coverage` (for test coverage)

### 10.2 Frontend Dependencies (REQUIRED)
Minimum package.json dependencies:
```json
{
  "dependencies": {
    "axios": "^1.13",
    "react": "^19.2",
    "react-dom": "^19.2",
    "react-router-dom": "^7.13"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1",
    "@tailwindcss/vite": "^4.2",
    "typescript": "^5.9",
    "vite": "^7.3",
    "vitest": "^4.0",
    "@testing-library/react": "^16.3",
    "eslint": "^9.39",
    "prettier": "^3.8"
  }
}
```

## 11. INTER-SERVICE COMMUNICATION

### 11.1 Service Registry (REQUIRED for non-Authinator)
- MUST register with Authinator service registry on startup
- MUST include service name, description, UI URL, icon
- MUST use SERVICE_REGISTRATION_KEY for authentication

### 11.2 API Calls Between Services
- SHOULD be minimal - prefer direct database queries where possible
- MUST use JWT token forwarding for user context
- MUST handle service unavailability gracefully

## 12. CODE QUALITY GATES (REQUIRED)

### 12.1 Pre-commit Requirements
Before any commit, MUST pass:
1. `task fmt` - Code formatting
2. `task lint` - Linting (ruff, ESLint)
3. `task typecheck` - TypeScript type checking (frontend)
4. `task test:coverage` - Tests with ≥85% coverage

Use `task check` to run all pre-commit checks.

### 12.2 Formatting Standards
- Backend: Black (default settings) or ruff format
- Frontend: Prettier (default settings)
- MUST NOT commit unformatted code

### 12.3 Linting Standards
- Backend: ruff with default rules
- Frontend: ESLint with typescript-eslint recommended config
- MUST fix all errors before commit

## 13. SECURITY REQUIREMENTS

### 13.1 Authentication (REQUIRED)
- MUST require authentication for all API endpoints (except health check)
- MUST use Bearer token authentication
- MUST validate tokens on every request
- MUST handle token expiration gracefully

### 13.2 Authorization (REQUIRED)
- MUST implement role-based access control
- MUST check permissions at view level
- MUST filter querysets by user permissions
- MUST NOT expose sensitive data to non-admin users

### 13.3 Input Validation (REQUIRED)
- MUST validate all user input in serializers
- MUST sanitize file uploads (if applicable)
- MUST use Django ORM (avoid raw SQL)
- MUST prevent SQL injection, XSS, CSRF

## 14. PERFORMANCE REQUIREMENTS

### 14.1 Database Queries
- SHOULD use `select_related()` for ForeignKey lookups
- SHOULD use `prefetch_related()` for reverse ForeignKey
- SHOULD add indexes for frequently queried fields
- SHOULD paginate large result sets

### 14.2 API Response Times
- SHOULD optimize queries to keep response time <200ms
- SHOULD use caching for expensive calculations (optional)
- MUST implement pagination for list endpoints

## 15. MONITORING AND LOGGING

### 15.1 Health Checks (REQUIRED)
MUST implement health check endpoint:
```python
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'healthy'})
```

### 15.2 Logging
- SHOULD log errors with appropriate level
- SHOULD NOT log sensitive data (passwords, tokens)
- SHOULD use structured logging in production

## 16. MIGRATION STRATEGY

### 16.1 Database Migrations (REQUIRED)
- MUST create migrations for all model changes
- MUST test migrations on copy of production data
- SHOULD make migrations reversible where possible
- MUST NOT delete migrations from version control

### 16.2 Zero-Downtime Deployments
- SHOULD make backward-compatible schema changes
- SHOULD deploy in stages (schema → code → cleanup)

## SUMMARY OF CRITICAL MUST-HAVE RULES

1. MUST use `{Concept}inator` naming pattern
2. MUST place .venv at repository root, NOT in backend/
3. MUST use python-decouple for environment variables
4. MUST implement DEPLOY_DOMAIN support in all services
5. MUST use AuthinatorJWTAuthentication in non-Authinator services
6. MUST achieve ≥85% test coverage
7. MUST use Taskfile.yml with standard tasks
8. MUST use assigned port numbers
9. MUST NOT commit secrets or database files
10. MUST implement service registry registration (non-Authinator)
11. MUST use relative API paths in frontend (`/api`, not `http://...`)
12. MUST configure CORS for unified gateway (`:8080`)
13. MUST implement IsAuthenticated permission on all endpoints
14. MUST use Bearer token authentication
15. MUST implement health check endpoint
16. MUST pass all quality gates before commit (fmt, lint, test, coverage)

## ANTI-PATTERNS TO AVOID

1. MUST NOT create venv inside backend/ directory
2. MUST NOT use hardcoded URLs in settings (localhost, 127.0.0.1)
3. MUST NOT use absolute API URLs in frontend
4. MUST NOT commit .env files with secrets
5. MUST NOT use raw SQL queries
6. MUST NOT expose admin-only fields to regular users
7. MUST NOT skip authentication on API endpoints
8. MUST NOT use synchronous I/O in async contexts
9. MUST NOT implement local authentication in non-Authinator services
10. MUST NOT use different API path patterns than `/api/{concept}/`
