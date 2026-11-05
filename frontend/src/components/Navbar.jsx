import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-navy-500 text-white shadow-lg" role="navigation" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg hover:text-teal-300 transition-colors">
            <svg className="w-7 h-7 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="hidden sm:inline">Certificate Verification</span>
            <span className="sm:hidden">CertVerify</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <NavLink to="/" end
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink to="/verify"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"
                }`
              }
            >
              Verify
            </NavLink>
            <NavLink to="/university"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"
                }`
              }
            >
              University
            </NavLink>
            <NavLink to="/admin"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-blue-100 hover:text-white hover:bg-white/10"
                }`
              }
            >
              Admin
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
