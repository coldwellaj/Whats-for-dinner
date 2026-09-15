import { API_BASE } from "../api/client.js";

// Works for both owned and shared/Discover recipes — the server's GET /:id/photo allows either
// (see recipes.ts), so there's no separate "shared" variant of this URL to branch on.
export function RecipePhoto({ recipeId, hasPhoto, className }: { recipeId: string; hasPhoto: boolean; className?: string }) {
  if (!hasPhoto) return null;
  return <img src={`${API_BASE}/recipes/${recipeId}/photo`} alt="" className={className} />;
}
