const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, { method = "GET", body, token, isForm = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail = data && typeof data === "object" ? data.detail : data;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail.length
          ? detail[0].msg || "Validation error"
          : "Something went wrong";
    throw new ApiError(message, res.status);
  }
  return data;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const api = {
  get: (path, token) => request(path, { token }),
  post: (path, body, token, isForm) => request(path, { method: "POST", body, token, isForm }),
  patch: (path, body, token) => request(path, { method: "PATCH", body, token }),
  delete: (path, token) => request(path, { method: "DELETE", token }),
};
