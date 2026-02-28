import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { NavItem } from '../types';

interface LayoutProps {
  children: ReactNode;
  /** Module title shown in the header (e.g. "RMAinator"). */
  title: string;
  /** Short description shown next to the title. */
  subtitle?: string;
  /** Module-specific sidebar navigation items. */
  navItems: NavItem[];
}

/**
 * Shared app shell with header, sidebar, and content area.
 * Each module passes its own title and nav items.
 */
export function Layout({ children, title, subtitle, navItems }: LayoutProps): React.JSX.Element {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const isActive = (path: string): boolean => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <span className="ml-4 text-sm text-gray-500">{subtitle}</span>}
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Link
                to="/"
                className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-100"
              >
                Home
              </Link>
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-64 flex-col border-r border-gray-200 bg-white shadow-lg">
          <nav className="mt-6 flex-1">
            {visibleItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-6 py-3 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'border-r-4 border-blue-700 bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
