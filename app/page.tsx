'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pill, Search, LogIn, UserPlus, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl">
              <Pill size={28} />
              <span>MediFind</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-blue-600 bg-blue-50"
              >
                <Search size={18} />
                <span>Search Medicines</span>
              </Link>
            </nav>

            {/* Auth Buttons / User Menu */}
            <div className="flex items-center gap-3">
              {!loading && !user && (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <LogIn size={18} />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <UserPlus size={18} />
                    <span className="hidden sm:inline">Register</span>
                  </Link>
                </>
              )}

              {!loading && user && (
                <>
                  {user.role === 'PATIENT' && (
                    <Link
                      href="/patient/reservations"
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <span className="hidden sm:inline">My Reservations</span>
                    </Link>
                  )}
                  
                  {user.role === 'PHARMACY' && (
                    <Link
                      href="/pharmacy/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                  )}
                  
                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin/analytics"
                      className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <span className="hidden sm:inline">Admin Panel</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <User size={18} className="text-slate-600" />
                    <span className="text-sm text-slate-700 hidden sm:inline">{user.name}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user ? `Welcome back, ${user.name}!` : 'Search Medicines'}
            </h1>
            <p className="text-gray-600">Find medicines available at nearby pharmacies</p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search for medicines..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Info Message for Guests */}
          {!loading && !user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-8">
              <p className="text-blue-900 mb-4">
                <span className="font-semibold">Welcome to MediFind!</span>
                <br />
                Browse medicines as a guest. Login or register to make reservations.
              </p>
              <div className="flex gap-4 justify-center">
                <a
                  href="/login"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login
                </a>
                <a
                  href="/register"
                  className="px-6 py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Register
                </a>
              </div>
            </div>
          )}

          {/* Info Message for Logged-in Patients */}
          {!loading && user && user.role === 'PATIENT' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <p className="text-green-900">
                <span className="font-semibold">You're logged in!</span>
                <br />
                Search for medicines and make reservations. View your reservations in the sidebar.
              </p>
            </div>
          )}

          {/* Redirect to search page */}
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-600 mb-4">
              Ready to find your medicines?
            </p>
            <a
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search size={20} />
              Start Searching
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-600 text-sm">
          <p>&copy; 2024 MediFind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
