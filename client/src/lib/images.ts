// Downscales/re-encodes an image file client-side into a small JPEG data URL, cheap enough to
// send as a JSON field and store directly on a row (see server-side size caps in auth.ts's
// PUT /me and recipes.ts's resolvePhotoUpdate — keep maxDimension/quality choices well under
// those before assuming a larger cap is safe to raise here without raising them too).
export function resizeImageToDataUrl(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
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
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
