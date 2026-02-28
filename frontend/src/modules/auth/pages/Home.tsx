import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/auth/AuthProvider';
import { getApiErrorMessage } from '../../../shared/types';
import { servicesApi } from '../api';
import type { Service } from '../types';
import { SERVICE_ROUTE_MAP } from '../types';

/**
 * Home / Service Directory page.
 * Lists registered inator services; known services navigate in-app.
 */
export function Home(): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    servicesApi
      .list()
      .then(setServices)
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, 'Failed to load services'));
      })
      .finally(() => setLoading(false));
  }, []);

  const getServiceRoute = (service: Service): string | null => {
    return SERVICE_ROUTE_MAP[service.name] ?? null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">🔐 AUTHinator</h1>
            <span className="ml-4 text-sm text-gray-500">Service Directory</span>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.customer?.name ?? user.role}</p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-100"
              >
                ⚙ Profile
              </button>
              <button
                onClick={logout}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">Your Services</h2>
          <p className="text-gray-600">Select a service to get started</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {services.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">No services registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const route = getServiceRoute(service);
              return <ServiceCard key={service.id} service={service} route={route} />;
            })}
          </div>
        )}
      </main>
    </div>
  );
}

/** Individual service card — links in-app or opens external URL. */
function ServiceCard({
  service,
  route,
}: {
  service: Service;
  route: string | null;
}): React.JSX.Element {
  if (route) {
    return (
      <Link
        to={route}
        className="block rounded-lg bg-white shadow transition-shadow hover:shadow-xl"
      >
        <div className="p-6">
          <div className="mb-4 text-5xl">{service.icon}</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">{service.name}</h3>
          <p className="mb-4 text-gray-600">{service.description}</p>
          <span className="block w-full rounded-lg bg-blue-600 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700">
            Open Service
          </span>
        </div>
      </Link>
    );
  }

  return (
    <a
      href={service.ui_url}
      className="block rounded-lg bg-white shadow transition-shadow hover:shadow-xl"
    >
      <div className="p-6">
        <div className="mb-4 text-5xl">{service.icon}</div>
        <h3 className="mb-2 text-xl font-semibold text-gray-900">{service.name}</h3>
        <p className="mb-4 text-gray-600">{service.description}</p>
        <span className="block w-full rounded-lg bg-blue-600 py-2 text-center font-medium text-white transition-colors hover:bg-blue-700">
          Open Service ↗
        </span>
      </div>
    </a>
  );
}
