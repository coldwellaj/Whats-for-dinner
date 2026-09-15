import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../api/client.js";
import { useCreateRecipe, useRecipe, useUpdateRecipe } from "../api/recipes.js";
import { IngredientListEditor } from "../components/IngredientListEditor.js";
import { resizeImageToDataUrl } from "../lib/images.js";
import type { RecipeIngredientInput, RecipeInput } from "../types.js";

const emptyForm: RecipeInput = {
  name: "",
  description: "",
  instructions: "",
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  servings: null,
  sourceUrl: "",
  tags: "",
  ingredients: [],
};

const PHOTO_MAX_DIMENSION = 1024;
const PHOTO_JPEG_QUALITY = 0.82;
const MAX_SOURCE_FILE_BYTES = 10_000_000;

// Tracks the photo separately from the rest of the form: "unchanged" means don't touch it on
// submit (the common case when editing), so a save doesn't have to re-upload an untouched photo.
type PhotoState = { kind: "unchanged" } | { kind: "removed" } | { kind: "new"; dataUrl: string };

export function RecipeFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing } = useRecipe(id);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe(id ?? "");

  const [form, setForm] = useState<RecipeInput>(emptyForm);
  const [photoState, setPhotoState] = useState<PhotoState>({ kind: "unchanged" });
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        description: existing.description ?? "",
        instructions: existing.instructions ?? "",
        prepTimeMinutes: existing.prepTimeMinutes,
        cookTimeMinutes: existing.cookTimeMinutes,
        servings: existing.servings,
        sourceUrl: existing.sourceUrl ?? "",
        tags: existing.tags ?? "",
        ingredients: existing.ingredients.map((ri) => ({
          name: ri.ingredient.name,
          quantity: ri.quantity,
          unit: ri.unit,
          notes: ri.notes,
        })),
      });
    }
  }, [existing]);

  function handleIngredientsChange(ingredients: RecipeIngredientInput[]) {
    setForm((f) => ({ ...f, ingredients }));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file");
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setPhotoError("Image is too large — please choose a smaller file");
      return;
    }
    setProcessingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, PHOTO_MAX_DIMENSION, PHOTO_JPEG_QUALITY);
      setPhotoState({ kind: "new", dataUrl });
    } catch {
      setPhotoError("Could not process that image");
    } finally {
      setProcessingPhoto(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoState({ kind: "removed" });
    setPhotoError(null);
  }

  const photoPreviewSrc =
    photoState.kind === "new"
      ? photoState.dataUrl
      : photoState.kind === "unchanged" && existing?.hasPhoto
        ? `${API_BASE}/recipes/${id}/photo`
        : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const cleanedIngredients = form.ingredients.filter((i) => i.name.trim());
    const payload = {
      ...form,
      ingredients: cleanedIngredients,
      ...(photoState.kind === "new" ? { photo: photoState.dataUrl } : {}),
      ...(photoState.kind === "removed" ? { photo: null } : {}),
    };

    const result = isEditing
      ? await updateRecipe.mutateAsync(payload)
      : await createRecipe.mutateAsync(payload);
    navigate(`/recipes/${result.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{isEditing ? "Edit Recipe" : "New Recipe"}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          <div className="flex items-center gap-4">
            {photoPreviewSrc ? (
              <img src={photoPreviewSrc} alt="" className="w-24 h-24 rounded object-cover border" />
            ) : (
              <div className="w-24 h-24 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                No photo
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-terracotta-700 hover:underline cursor-pointer">
                {processingPhoto ? "Processing..." : "Choose photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={processingPhoto}
                  className="hidden"
                />
              </label>
              {photoPreviewSrc && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-sm text-gray-400 hover:text-red-500 text-left"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          {photoError && <p className="text-sm text-red-600 mt-1">{photoError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prep (min)</label>
            <input
              type="number"
              value={form.prepTimeMinutes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, prepTimeMinutes: e.target.value === "" ? null : Number(e.target.value) }))
              }
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cook (min)</label>
            <input
              type="number"
              value={form.cookTimeMinutes ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, cookTimeMinutes: e.target.value === "" ? null : Number(e.target.value) }))
              }
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
            <input
              type="number"
              value={form.servings ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, servings: e.target.value === "" ? null : Number(e.target.value) }))
              }
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
          <IngredientListEditor ingredients={form.ingredients} onChange={handleIngredientsChange} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
          <textarea
            value={form.instructions ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            rows={6}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
            <input
              value={form.sourceUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-base sm:text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={createRecipe.isPending || updateRecipe.isPending || processingPhoto}
            className="bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {isEditing ? "Save Changes" : "Create Recipe"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-md text-sm text-gray-600">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
