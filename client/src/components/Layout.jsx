import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

export function Logo({ light = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="GigNest home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0B6E73" />
        <path d="M6 19c3 6 17 6 20 0" stroke="#F5B301" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="16" cy="12" r="4" fill="#F5B301" />
      </svg>
      <span className={`font-display text-xl font-bold ${light ? 'text-white' : 'text-ink'}`}>GigNest</span>
    </Link>
  );
}

const navLink = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-peacock-soft text-peacock-deep' : 'text-ink hover:bg-peacock-soft'}`;

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-mist/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <button
          className="rounded-lg p-2 hover:bg-peacock-soft lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <nav
          aria-label="Main"
          className={`${open ? 'flex' : 'hidden'} absolute left-0 right-0 top-16 flex-col gap-1 border-b border-line bg-mist px-4 pb-4 pt-2 lg:static lg:flex lg:flex-row lg:items-center lg:gap-1 lg:border-0 lg:bg-transparent lg:p-0`}
        >
          <NavLink to="/projects" end className={navLink} onClick={close}>
            Browse projects
          </NavLink>
          {user?.role === 'client' && (
            <>
              <NavLink to="/my-projects" className={navLink} onClick={close}>
                My projects
              </NavLink>
              <NavLink to="/projects/new" className={navLink} onClick={close}>
                Post a project
              </NavLink>
            </>
          )}
          {user?.role === 'freelancer' && (
            <NavLink to="/my-bids" className={navLink} onClick={close}>
              My bids
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/dashboard" className={navLink} onClick={close}>
                Dashboard
              </NavLink>
              <div className="mt-2 flex items-center gap-3 border-t border-line pt-3 lg:ml-2 lg:mt-0 lg:border-0 lg:pt-0">
                <Link to={`/profile/${user._id}`} onClick={close} className="flex items-center gap-3 rounded-lg hover:opacity-80" aria-label="Your profile">
                  <Avatar name={user.name} src={user.avatar} size="sm" />
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold">{user.name}</span>
                    <span className="block text-xs capitalize text-muted">{user.role}</span>
                  </span>
                </Link>
                <button className="btn btn-outline ml-auto lg:ml-2" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </>
          ) : (
            <div className="mt-2 flex gap-2 lg:ml-2 lg:mt-0">
              <Link to="/login" className="btn btn-ghost" onClick={close}>
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary" onClick={close}>
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-muted">
            A freelancing marketplace where every payment is tied to a milestone.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-5 text-sm font-medium">
          <Link to="/projects" className="hover:text-peacock">Browse projects</Link>
          <Link to="/login" className="hover:text-peacock">Log in</Link>
          <Link to="/register" className="hover:text-peacock">Sign up</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
