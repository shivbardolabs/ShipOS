'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login — in production this would use NextAuth
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 relative overflow-hidden">
      {/* Ambient indigo orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.06)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full" style={{ background: 'rgba(99, 102, 241, 0.04)', filter: 'blur(80px)' }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#08081a_70%)]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shipos-logo-mark.svg"
            alt="ShipOS"
            width={56}
            height={56}
            className="mb-4 indigo-glow rounded-2xl"
          />
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-surface-100">Ship</span>
            <span className="text-3xl font-bold text-primary-500">OS</span>
          </div>
          <p className="text-sm text-surface-500 mt-1">Postal Management System</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl p-8 shadow-2xl shadow-black/30" style={{ background: '#121330', border: '1px solid rgba(192, 198, 212, 0.07)' }}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-surface-100">Sign in</h2>
            <p className="text-sm text-surface-400 mt-1">Welcome back. Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-surface-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 outline-none transition-colors duration-150"
                style={{
                  background: '#0e0f26',
                  border: '1px solid rgba(192, 198, 212, 0.07)',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(192, 198, 212, 0.07)'; e.target.style.boxShadow = 'none'; }}
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-surface-300">
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 outline-none transition-colors duration-150"
                style={{
                  background: '#0e0f26',
                  border: '1px solid rgba(192, 198, 212, 0.07)',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(192, 198, 212, 0.07)'; e.target.style.boxShadow = 'none'; }}
                required
              />
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded accent-primary-500"
              />
              <label htmlFor="remember" className="text-sm text-surface-400">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-500 active:bg-primary-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)' }}
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid rgba(192, 198, 212, 0.07)' }} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-surface-600" style={{ background: '#121330' }}>or</span>
            </div>
          </div>

          {/* SSO placeholder */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-surface-300 hover:text-surface-200 transition-colors"
            style={{ background: '#0e0f26', border: '1px solid rgba(192, 198, 212, 0.07)' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-surface-600 mt-6">
          © 2026 ShipOS · Powered by <span className="text-surface-500">Bardo Labs</span>
        </p>
      </div>
    </div>
  );
}
