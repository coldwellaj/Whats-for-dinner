import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLogout, type CurrentUser } from "../api/auth.js";
import { Logo } from "./Logo.js";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
    isActive ? "bg-olive-600 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

const NAV_LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: "/", label: "Recipes", end: true },
  { to: "/plan", label: "Meal Plan" },
  { to: "/shopping-list", label: "Shopping List" },
  { to: "/family", label: "Family" },
];

export function NavBar({ user }: { user: CurrentUser }) {
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 py-2">
        <span className="shrink-0">
          <Logo size={32} />
        </span>

        {/* Desktop: links stay inline in the bar. */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {user.picture && (
            <img src={user.picture} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
          )}
          <span className="text-sm text-gray-600 hidden sm:inline">{user.name ?? user.email}</span>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="text-sm text-gray-500 hover:text-gray-800 px-2 py-2"
          >
            Sign out
          </button>

          {/* Mobile: links collapse behind this toggle. */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="sm:hidden text-xl leading-none px-2 py-1 text-gray-600 hover:text-gray-900"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t px-4 py-2 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
