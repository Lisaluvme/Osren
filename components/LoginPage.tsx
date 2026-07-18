import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '../services/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Departments a user may self-request (admin is intentionally excluded —
// admins are created/seeded by an administrator only).
const REG_ROLES = [
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'driver', label: 'Driver' },
];

interface LoginPageProps {
  /** Error surfaced from the backend session check (e.g. pending / not provisioned). */
  serverError?: string;
}

const friendlyError = (code?: string, fallback?: string): string => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/missing-password':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in, or wait for admin approval if you just registered.';
    case 'auth/weak-password':
      return 'Password is too weak (use at least 8 characters).';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again later or reset your password.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in. Add it in the Firebase console.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return fallback || 'Something went wrong. Please try again.';
  }
};

const LoginPage: React.FC<LoginPageProps> = ({ serverError }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState(REG_ROLES[0].value);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset the spinner if the backend rejects the session (e.g. pending / not provisioned).
  useEffect(() => {
    if (serverError) setLoading(false);
  }, [serverError]);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setLocalError('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App's onAuthStateChanged listener hydrates the session from here.
    } catch (err: any) {
      setLocalError(friendlyError(err?.code, err?.message));
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      // 1. Create the Firebase account (this also signs them in).
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // 2. Capture the ID token immediately, then submit the pending record.
      //    Sending the token directly avoids a race with the app's session
      //    listener (which signs pending users out).
      const token = await cred.user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, requested_role: requestedRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw { message: body?.error || 'Registration failed.', code: body?.code };
      }
      // 3. Sign out (the account is pending and can't be used yet).
      await signOut(auth);
      setSuccessMsg(
        'Registration submitted! An administrator will review your request and confirm your department. You can sign in once your account is approved.'
      );
      setEmail('');
      setPassword('');
      setFullName('');
      setRequestedRole(REG_ROLES[0].value);
      switchMode('login');
    } catch (err: any) {
      setLocalError(friendlyError(err?.code, err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setLocalError(friendlyError(err?.code, err?.message));
      setLoading(false);
    }
  };

  const displayError = localError || serverError;

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
          <p className="text-slate-600">{mode === 'login' ? 'Sign in to your account' : 'Request a new account'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {displayError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{displayError}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 text-sm">{successMsg}</p>
            </div>
          )}

          {mode === 'login' ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
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
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="px-3 text-xs text-slate-400">OR</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>

              <p className="mt-6 text-center text-sm text-slate-600">
                New user?{' '}
                <button type="button" onClick={() => switchMode('register')} className="text-blue-600 font-medium hover:underline">
                  Request an account
                </button>
              </p>
            </>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Jane Doe"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="jane@osren.com"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="At least 8 characters"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Request access to department</label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {REG_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">An administrator will confirm or change this before approving.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Request Account'
                )}
              </button>
              <p className="mt-2 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')} className="text-blue-600 font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> New accounts require administrator approval before they can sign in. If you can’t sign in, your account may still be pending.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>OSREN Operations Manager © 2026 | Enterprise Resource Planning System</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
