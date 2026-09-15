import { useEffect, useState } from "react";
import { useCurrentUser, useUpdateProfile } from "../api/auth.js";

const AVATAR_MAX_DIMENSION = 256;
const AVATAR_JPEG_QUALITY = 0.85;
const MAX_SOURCE_FILE_BYTES = 10_000_000;

// Downscales/re-encodes to a small JPEG data URL client-side so the picture is cheap enough
// to store directly on the User row (see server/src/routes/auth.ts's PUT /me for the
// server-side size cap this is meant to stay well under).
function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const scale = Math.min(1, AVATAR_MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale) || 1;
        const height = Math.round(img.height * scale) || 1;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AccountPage() {
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState("");
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [pictureChanged, setPictureChanged] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPicturePreview(user.picture);
    }
  }, [user]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setSaved(false);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setError("Image is too large — please choose a smaller file");
      return;
    }
    setProcessingImage(true);
    try {
      setPicturePreview(await resizeImageToDataUrl(file));
      setPictureChanged(true);
    } catch {
      setError("Could not process that image");
    } finally {
      setProcessingImage(false);
    }
  }

  function handleRemovePicture() {
    setPicturePreview(null);
    setPictureChanged(true);
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        ...(pictureChanged ? { picture: picturePreview } : {}),
      });
      setPictureChanged(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-gray-800">Account</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white border rounded-lg p-4">
        <div className="flex items-center gap-4">
          {picturePreview ? (
            <img
              src={picturePreview}
              alt=""
              className="w-16 h-16 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-medium">
              {(name || user.email)[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terracotta-700 hover:underline cursor-pointer">
              {processingImage ? "Processing..." : "Change picture"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={processingImage}
                className="hidden"
              />
            </label>
            {picturePreview && (
              <button
                type="button"
                onClick={handleRemovePicture}
                className="text-sm text-gray-400 hover:text-red-500 text-left"
              >
                Remove picture
              </button>
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            maxLength={100}
            placeholder="Your name"
            className="border rounded px-3 py-2 text-base sm:text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            value={user.email}
            disabled
            className="border rounded px-3 py-2 text-base sm:text-sm bg-gray-50 text-gray-500"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-green-700">Saved.</p>}

        <button
          type="submit"
          disabled={updateProfile.isPending || processingImage}
          className="self-start bg-terracotta-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
