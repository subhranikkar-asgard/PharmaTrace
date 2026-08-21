import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const DEMO_ACCOUNTS = [
  { email: 'manufacturer@demo.local', role: 'MANUFACTURER', color: 'text-blue-600' },
  { email: 'regulator@demo.local', role: 'REGULATOR', color: 'text-slate-700' },
  { email: 'pharmacy@demo.local', role: 'PHARMACY', color: 'text-teal-600' },
];

export function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo@1234');
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      if (user.role === 'MANUFACTURER') navigate('/manufacturer');
      else if (user.role === 'REGULATOR') navigate('/regulator');
      else navigate('/verify');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">PharmaTrace</h1>
          <p className="text-slate-500 text-sm mt-1">Counterfeit Medicine Verification</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-5">Sign in to dashboard</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@demo.local" required
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>

          {/* Quick login shortcuts */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-3">Demo accounts (password: Demo@1234)</p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(({ email: demoEmail, role, color }) => (
                <button key={demoEmail}
                  onClick={() => { setEmail(demoEmail); setPassword('Demo@1234'); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-mono">{demoEmail}</span>
                  <span className={`text-xs font-semibold ${color}`}>{role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Public verify link */}
        <p className="text-center text-sm text-slate-400 mt-4">
          Want to verify a medicine?{' '}
          <a href="/verify" className="text-blue-600 hover:underline font-medium">Go to Verify →</a>
        </p>
      </div>
    </div>
  );
}
