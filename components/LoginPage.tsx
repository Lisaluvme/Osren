import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginPageProps {
  onLogin: (role: UserRole, userInfo: { name: string; email: string }) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email to role mapping
  const emailRoleMap: Record<string, { role: UserRole; name: string }> = {
    'admin@osren.com': { role: UserRole.ADMIN, name: 'System Administrator' },
    'sales@osren.com': { role: UserRole.SALES, name: 'Sales Representative' },
    'driver@osren.com': { role: UserRole.DRIVER, name: 'Delivery Driver' },
    'finance@osren.com': { role: UserRole.FINANCE, name: 'Finance Manager' },
    'warehouse@osren.com': { role: UserRole.WAREHOUSE, name: 'Warehouse Manager' }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      // Simple validation for demo
      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Email validation
      if (!email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      // Password validation (at least 8 characters)
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      // Get role from email
      const userRole = emailRoleMap[email.toLowerCase()];

      if (!userRole) {
        setError('User not found. Please use a valid email address.');
        setLoading(false);
        return;
      }

      // Success - call onLogin
      onLogin(userRole.role, {
        name: userRole.name,
        email: email
      });

      setLoading(false);
    }, 800);
  };

  const fillCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('Password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">OSREN Integrated Operations Manager</h1>
          <p className="text-slate-600">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Login Access */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Login Access</h3>
            <div className="space-y-2">
              <button
                onClick={() => fillCredentials('admin@osren.com')}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Admin Login (Full Access)
              </button>
              <button
                onClick={() => fillCredentials('sales@osren.com')}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Sales Login (Sales & Distribution)
              </button>
              <button
                onClick={() => fillCredentials('finance@osren.com')}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Finance Login (Finance & Accounts)
              </button>
              <button
                onClick={() => fillCredentials('warehouse@osren.com')}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Warehouse Login (Warehouse Management)
              </button>
              <button
                onClick={() => fillCredentials('driver@osren.com')}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Driver Login (Delivery Only)
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>💡 Tip:</strong> Each role has specific module access: Sales (Sales & Distribution), Finance (Finance & Accounts), Warehouse (Warehouse Management), Driver (Delivery Only). Click any quick login button to auto-fill credentials.
            </p>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>⚠️ Demo Mode:</strong> This is a demo login page. In production, this will connect to your authentication API with real user credentials.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>OSREN Operations Manager © 2026 | Enterprise Resource Planning System</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;