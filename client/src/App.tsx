import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar.js";
import { LoginScreen } from "./components/LoginScreen.js";
import { RecipesPage } from "./pages/RecipesPage.js";
import { RecipeFormPage } from "./pages/RecipeFormPage.js";
import { RecipeDetailPage } from "./pages/RecipeDetailPage.js";
import { MealPlanPage } from "./pages/MealPlanPage.js";
import { ShoppingListPage } from "./pages/ShoppingListPage.js";
import { FamilyPage } from "./pages/FamilyPage.js";
import { useCurrentUser } from "./api/auth.js";

export default function App() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) return null;
  if (isError || !user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} />
      <Routes>
        <Route path="/" element={<RecipesPage />} />
        <Route path="/recipes/new" element={<RecipeFormPage />} />
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
        <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
        <Route path="/plan" element={<MealPlanPage />} />
        <Route path="/shopping-list" element={<ShoppingListPage />} />
        <Route path="/family" element={<FamilyPage />} />
      </Routes>
    </div>
  );
}
