/**
 * Resolve asset paths against the page URL so loads work behind
 * proxies, Live Preview, and nested routes — not only localhost roots.
 */
function resolveAsset(relativePath) {
  if (!relativePath) return relativePath;
  if (/^(data:|blob:|https?:)/i.test(relativePath)) return relativePath;
  try {
    return new URL(relativePath, document.baseURI).href;
  } catch (err) {
    return relativePath;
  }
}

window.resolveAsset = resolveAsset;
