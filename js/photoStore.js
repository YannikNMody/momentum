// Stores user-uploaded background photos as Blobs in IndexedDB (never in
// chrome.storage, which isn't meant for binary blobs and has small quotas).
// Every method fails soft: if IndexedDB is unavailable or errors out, calls
// resolve to an empty/null result instead of throwing, so callers can fall
// back to the bundled photo set.

const DB_NAME = "momentum-photos";
const DB_VERSION = 1;
const STORE_NAME = "photos";

export const MAX_PHOTOS = 30;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, run) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = run(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    return mode === "readonly" ? [] : null;
  }
}

// Adds a photo Blob with metadata. Returns the new photo's id, or null on
// failure (e.g. IndexedDB unavailable, or the store is at capacity).
export async function addPhoto(blob, { width, height } = {}) {
  const existing = await getAllPhotos();
  if (existing.length >= MAX_PHOTOS) return null;

  const record = {
    id: crypto.randomUUID(),
    blob,
    mimeType: blob.type,
    width: width || null,
    height: height || null,
    size: blob.size,
    createdAt: Date.now(),
  };

  const ok = await withStore("readwrite", (store) => {
    store.put(record);
    return true;
  });

  return ok ? record.id : null;
}

// Returns all stored photo records (including the Blob), oldest first.
export async function getAllPhotos() {
  const records = await withStore("readonly", (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
  const list = Array.isArray(records) ? records : [];
  return list.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deletePhoto(id) {
  return withStore("readwrite", (store) => {
    store.delete(id);
    return true;
  });
}

// Total bytes used by all stored photo blobs.
export async function getUsageBytes() {
  const photos = await getAllPhotos();
  return photos.reduce((sum, p) => sum + (p.size || 0), 0);
}
