import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;

export function NavBar() {
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
      </div>
    </nav>
  );
}
