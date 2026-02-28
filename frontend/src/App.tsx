import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthProvider';
import { ProtectedRoute } from './shared/auth/ProtectedRoute';
import { Layout } from './shared/layout/Layout';
import type { NavItem } from './shared/types';

// -- Public pages (small, no lazy split) --
import { Login } from './modules/auth/pages/Login';

// -- Lazy-loaded module pages --
const Home = lazy(() => import('./modules/auth/pages/Home').then((m) => ({ default: m.Home })));
const Profile = lazy(() =>
  import('./modules/auth/pages/Profile').then((m) => ({ default: m.Profile })),
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
const rmaNavItems: NavItem[] = [
  { path: '/rma', label: 'Dashboard' },
  { path: '/rma/new', label: 'Create RMA' },
  { path: '/rma/admin', label: 'Admin Dashboard', adminOnly: true },
  { path: '/rma/admin/manage', label: 'RMA Management', adminOnly: true },
  { path: '/rma/admin/stale-config', label: 'Stale Config', adminOnly: true },
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
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
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
