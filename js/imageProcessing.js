// Client-side processing for user-uploaded background photos: validates the
// file type, downscales to a max of 2560px on the long edge, and re-encodes
// as WebP (falling back to JPEG if the browser can't encode WebP). Nothing
// here ever leaves the machine - it only produces a Blob for photoStore.js.

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 2560;
const QUALITY = 0.85;

// Returns a friendly rejection message if the file can't be used, or null
// if it's fine to process.
export function getRejectionMessage(file) {
  if (ACCEPTED_TYPES.includes(file.type)) return null;

  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif") {
    return "Please convert to JPG first.";
  }
  return "Unsupported image type. Use JPG, PNG or WebP.";
}

function encodeCanvas(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob && webpBlob.size > 0) {
          resolve(webpBlob);
          return;
        }
        canvas.toBlob(
          (jpegBlob) => (jpegBlob ? resolve(jpegBlob) : reject(new Error("Image encoding failed"))),
          "image/jpeg",
          QUALITY
        );
      },
      "image/webp",
      QUALITY
    );
  });
}

// Downscales and re-encodes an accepted image File/Blob. Returns
// { blob, width, height }.
export async function processImageFile(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await encodeCanvas(canvas);
    return { blob, width, height };
  } finally {
    bitmap.close?.();
  }
}
