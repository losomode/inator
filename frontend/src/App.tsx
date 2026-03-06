import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthProvider';
import { ProtectedRoute } from './shared/auth/ProtectedRoute';
import { Layout } from './shared/layout/Layout';
import type { NavItem } from './shared/types';

// -- Public pages (small, no lazy split) --
import { Login } from './modules/auth/pages/Login';

// -- Lazy-loaded module pages --
const Home = lazy(() => import('./modules/auth/pages/Home').then((m) => ({ default: m.Home })));
const Security = lazy(() =>
  import('./modules/auth/pages/Security').then((m) => ({ default: m.Security })),
);

// RMA module
const RMADashboard = lazy(() =>
  import('./modules/rma/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const RMADetail = lazy(() =>
  import('./modules/rma/pages/RMADetail').then((m) => ({ default: m.RMADetail })),
);
const CreateRMA = lazy(() =>
  import('./modules/rma/pages/CreateRMA').then((m) => ({ default: m.CreateRMA })),
);
const AdminDashboard = lazy(() =>
  import('./modules/rma/pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminRMAManagement = lazy(() =>
  import('./modules/rma/pages/AdminRMAManagement').then((m) => ({
    default: m.AdminRMAManagement,
  })),
);
const AdminStaleConfig = lazy(() =>
  import('./modules/rma/pages/AdminStaleConfig').then((m) => ({ default: m.AdminStaleConfig })),
);

// Users module
const UserList = lazy(() =>
  import('./modules/users/pages/UserList').then((m) => ({ default: m.UserList })),
);
const UserProfilePage = lazy(() =>
  import('./modules/users/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const UserProfileEditPage = lazy(() =>
  import('./modules/users/pages/ProfileEditPage').then((m) => ({ default: m.ProfileEditPage })),
);
const UserCompanyPage = lazy(() =>
  import('./modules/users/pages/CompanyPage').then((m) => ({ default: m.CompanyPage })),
);
const UserCompanyEditPage = lazy(() =>
  import('./modules/users/pages/CompanyEditPage').then((m) => ({ default: m.CompanyEditPage })),
);
const UserInvitationReviewPage = lazy(() =>
  import('./modules/users/pages/InvitationReviewPage').then((m) => ({ default: m.InvitationReviewPage })),
);
const UserInvitationRequestPage = lazy(() =>
  import('./modules/users/pages/InvitationRequestPage').then((m) => ({ default: m.InvitationRequestPage })),
);
const UserPreferencesPage = lazy(() =>
  import('./modules/users/pages/PreferencesPage').then((m) => ({ default: m.PreferencesPage })),
);
const UserEditPage = lazy(() =>
  import('./modules/users/pages/UserEditPage').then((m) => ({ default: m.UserEditPage })),
);
const CompanyListPage = lazy(() =>
  import('./modules/users/pages/CompanyListPage').then((m) => ({ default: m.CompanyListPage })),
);
const CompanyCreatePage = lazy(() =>
  import('./modules/users/pages/CompanyCreatePage').then((m) => ({ default: m.CompanyCreatePage })),
);

// Fulfil module
const ItemList = lazy(() =>
  import('./modules/fulfil/pages/items/ItemList').then((m) => ({ default: m.ItemList })),
);
const ItemForm = lazy(() =>
  import('./modules/fulfil/pages/items/ItemForm').then((m) => ({ default: m.ItemForm })),
);
const POList = lazy(() =>
  import('./modules/fulfil/pages/pos/POList').then((m) => ({ default: m.POList })),
);
const POForm = lazy(() =>
  import('./modules/fulfil/pages/pos/POForm').then((m) => ({ default: m.POForm })),
);
const PODetail = lazy(() =>
  import('./modules/fulfil/pages/pos/PODetail').then((m) => ({ default: m.PODetail })),
);
const OrderList = lazy(() =>
  import('./modules/fulfil/pages/orders/OrderList').then((m) => ({ default: m.OrderList })),
);
const OrderForm = lazy(() =>
  import('./modules/fulfil/pages/orders/OrderForm').then((m) => ({ default: m.OrderForm })),
);
const OrderDetail = lazy(() =>
  import('./modules/fulfil/pages/orders/OrderDetail').then((m) => ({ default: m.OrderDetail })),
);
const DeliveryList = lazy(() =>
  import('./modules/fulfil/pages/deliveries/DeliveryList').then((m) => ({
    default: m.DeliveryList,
  })),
);
const DeliveryForm = lazy(() =>
  import('./modules/fulfil/pages/deliveries/DeliveryForm').then((m) => ({
    default: m.DeliveryForm,
  })),
);
const DeliveryDetail = lazy(() =>
  import('./modules/fulfil/pages/deliveries/DeliveryDetail').then((m) => ({
    default: m.DeliveryDetail,
  })),
);
const SerialSearch = lazy(() =>
  import('./modules/fulfil/pages/deliveries/SerialSearch').then((m) => ({
    default: m.SerialSearch,
  })),
);

// -- Navigation configs --
const usersNavItems: NavItem[] = [
  { path: '/users', label: 'Users', adminOnly: true },
  { path: '/users/companies', label: 'Companies', adminOnly: true },
  { path: '/users/profile', label: 'My Profile' },
  { path: '/users/company', label: 'My Company' },
  { path: '/users/invitations', label: 'Invitations', adminOnly: true },
  { path: '/users/invitations/new', label: 'Request Invite' },
  { path: '/users/preferences', label: 'Preferences' },
];

const rmaNavItems: NavItem[] = [
  { path: '/rma', label: 'Dashboard' },
  { path: '/rma/new', label: 'Create RMA' },
  { path: '/rma/admin', label: 'Admin Tools', adminOnly: true },
];

const fulfilNavItems: NavItem[] = [
  { path: '/fulfil/items', label: 'Items' },
  { path: '/fulfil/pos', label: 'Purchase Orders' },
  { path: '/fulfil/orders', label: 'Orders' },
  { path: '/fulfil/deliveries', label: 'Deliveries' },
];

const Loading = (): React.JSX.Element => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
  </div>
);

/** Wrap Users pages in shared Layout with Users nav. */
const UsersLayout = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Layout title="USERinator" subtitle="User Management" navItems={usersNavItems}>
    {children}
  </Layout>
);

/** Wrap RMA pages in shared Layout with RMA nav. */
const RMALayout = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Layout title="RMAinator" subtitle="Return Management" navItems={rmaNavItems}>
    {children}
  </Layout>
);

/** Wrap Fulfil pages in shared Layout with Fulfil nav. */
const FulfilLayout = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <Layout title="FULFILinator" subtitle="Fulfillment Management" navItems={fulfilNavItems}>
    {children}
  </Layout>
);

/**
 * Root application component with lazy-loaded route groups.
 * Each module is code-split and loaded on demand.
 */
function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Auth module (protected) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/security"
              element={
                <ProtectedRoute>
                  <Security />
                </ProtectedRoute>
              }
            />

            {/* Users module */}
            <Route
              path="/users"
              element={
                <ProtectedRoute adminOnly>
                  <UsersLayout>
                    <UserList />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/profile"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserProfilePage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/profile/edit"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserProfileEditPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/company"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserCompanyPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/company/edit"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserCompanyEditPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/invitations"
              element={
                <ProtectedRoute adminOnly>
                  <UsersLayout>
                    <UserInvitationReviewPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/invitations/new"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserInvitationRequestPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/preferences"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserPreferencesPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/companies"
              element={
                <ProtectedRoute adminOnly>
                  <UsersLayout>
                    <CompanyListPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/companies/new"
              element={
                <ProtectedRoute adminOnly>
                  <UsersLayout>
                    <CompanyCreatePage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/companies/:id"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserCompanyPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id/edit"
              element={
                <ProtectedRoute adminOnly>
                  <UsersLayout>
                    <UserEditPage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute>
                  <UsersLayout>
                    <UserProfilePage />
                  </UsersLayout>
                </ProtectedRoute>
              }
            />

            {/* RMA module (protected) */}
            <Route
              path="/rma"
              element={
                <ProtectedRoute>
                  <RMALayout>
                    <RMADashboard />
                  </RMALayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rma/new"
              element={
                <ProtectedRoute>
                  <RMALayout>
                    <CreateRMA />
                  </RMALayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rma/:id"
              element={
                <ProtectedRoute>
                  <RMALayout>
                    <RMADetail />
                  </RMALayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rma/admin"
              element={
                <ProtectedRoute adminOnly>
                  <RMALayout>
                    <AdminDashboard />
                  </RMALayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rma/admin/manage"
              element={
                <ProtectedRoute adminOnly>
                  <RMALayout>
                    <AdminRMAManagement />
                  </RMALayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rma/admin/stale-config"
              element={
                <ProtectedRoute adminOnly>
                  <RMALayout>
                    <AdminStaleConfig />
                  </RMALayout>
                </ProtectedRoute>
              }
            />

            {/* Fulfil module (protected) */}
            <Route path="/fulfil" element={<Navigate to="/fulfil/items" replace />} />
            <Route
              path="/fulfil/items"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <ItemList />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/items/new"
              element={
                <ProtectedRoute adminOnly>
                  <FulfilLayout>
                    <ItemForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/items/:id/edit"
              element={
                <ProtectedRoute adminOnly>
                  <FulfilLayout>
                    <ItemForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/pos"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <POList />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/pos/new"
              element={
                <ProtectedRoute adminOnly>
                  <FulfilLayout>
                    <POForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/pos/:id"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <PODetail />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/pos/:id/edit"
              element={
                <ProtectedRoute adminOnly>
                  <FulfilLayout>
                    <POForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/orders"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <OrderList />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/orders/new"
              element={
                <ProtectedRoute adminOnly>
                  <FulfilLayout>
                    <OrderForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/orders/:id"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <OrderDetail />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/orders/:id/edit"
              element={
                <ProtectedRoute adminOnly>
                  <FulfilLayout>
                    <OrderForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/deliveries"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <DeliveryList />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/deliveries/serial-search"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <SerialSearch />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/deliveries/new"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <DeliveryForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/deliveries/:id"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <DeliveryDetail />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fulfil/deliveries/:id/edit"
              element={
                <ProtectedRoute>
                  <FulfilLayout>
                    <DeliveryForm />
                  </FulfilLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
