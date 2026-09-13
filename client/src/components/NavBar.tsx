import { NavLink } from "react-router-dom";
import { useLogout, type CurrentUser } from "../api/auth.js";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

export function NavBar({ user }: { user: CurrentUser }) {
  const logout = useLogout();

  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center gap-2 h-14">
        <span className="font-semibold text-emerald-700 mr-4">🍽️ Meal Planner</span>
        <NavLink to="/" end className={linkClass}>
          Recipes
        </NavLink>
        <NavLink to="/plan" className={linkClass}>
          Meal Plan
        </NavLink>
        <NavLink to="/shopping-list" className={linkClass}>
          Shopping List
        </NavLink>
        <NavLink to="/family" className={linkClass}>
          Family
        </NavLink>
        <div className="ml-auto flex items-center gap-2">
          {user.picture && (
            <img src={user.picture} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
          )}
          <span className="text-sm text-gray-600 hidden sm:inline">{user.name ?? user.email}</span>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
