import { Link, useLocation } from 'react-router-dom';
import { Shield, LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function NavBar() {
  const { user, logout, isAuthenticated } = useAuth();
  const loc = useLocation();

  const linkClass = (path: string) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
      loc.pathname.startsWith(path)
        ? 'bg-blue-100 text-blue-700'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/verify" className="flex items-center gap-2 font-bold text-slate-900 hover:opacity-80">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span>PharmaTrace</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-normal">PROTOTYPE</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link to="/verify" className={linkClass('/verify')}>Verify</Link>
          {isAuthenticated && user?.role === 'MANUFACTURER' && (
            <Link to="/manufacturer" className={linkClass('/manufacturer')}>Manufacturer</Link>
          )}
          {isAuthenticated && user?.role === 'REGULATOR' && (
            <Link to="/regulator" className={linkClass('/regulator')}>Regulator</Link>
          )}
          {!isAuthenticated && (
            <Link to="/login" className={linkClass('/login')}>Login</Link>
          )}
          {isAuthenticated && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <User className="w-3.5 h-3.5" />
                <span>{user?.orgName}</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
