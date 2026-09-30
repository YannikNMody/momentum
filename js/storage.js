// Small promise-based wrapper around chrome.storage.

function get(area, keys) {
  return new Promise((resolve) => {
    chrome.storage[area].get(keys, resolve);
  });
}

function set(area, items) {
  return new Promise((resolve) => {
    chrome.storage[area].set(items, resolve);
  });
}

export const storage = {
  sync: {
    get: (keys) => get("sync", keys),
    set: (items) => set("sync", items),
  },
  local: {
    get: (keys) => get("local", keys),
    set: (items) => set("local", items),
  },
};
