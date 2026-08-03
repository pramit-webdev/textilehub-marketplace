export function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function productImage(product, fallback = "") {
  if (!product) return fallback;
  if (product.images && product.images.length > 0) {
    const primary = product.images.find((img) => img.is_primary) || product.images[0];
    return primary.url || fallback;
  }
  return fallback;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
