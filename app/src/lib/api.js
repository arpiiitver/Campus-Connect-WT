// Central API client for Campus Connect backend
const BASE_URL = "http://localhost:5000/api";

// Get stored JWT token
const getToken = () => localStorage.getItem("cc_token");

// Store token
export const setToken = (token) => localStorage.setItem("cc_token", token);

// Remove token (logout)
export const clearToken = () => localStorage.removeItem("cc_token");

// Base fetch wrapper
const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
};

// ── Auth ──────────────────────────────────────────────
export const apiSignup = (username, college_email, password) =>
  apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, college_email, password }),
  });

export const apiLogin = (college_email, password) =>
  apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ college_email, password }),
  });

export const apiGetMe = () => apiFetch("/auth/me");

// ── Listings ──────────────────────────────────────────
export const apiGetListings = () => apiFetch("/listings");

export const apiGetMyListings = () => apiFetch("/listings/my");

export const apiGetListing = (id) => apiFetch(`/listings/${id}`);

export const apiCreateListing = (data) =>
  apiFetch("/listings", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const apiUpdateListingStatus = (id, status) =>
  apiFetch(`/listings/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const apiDeleteListing = (id) =>
  apiFetch(`/listings/${id}`, {
    method: "DELETE",
  });

export const apiUpdateProfile = (data) =>
  apiFetch("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// ── Image helper — convert File to base64 ────────────
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
};

// ── Chat ──────────────────────────────────────────────
export const apiCreateOrGetRoom = (listing_id) =>
  apiFetch("/chat/rooms", {
    method: "POST",
    body: JSON.stringify({ listing_id }),
  });

export const apiGetMyRooms = () => apiFetch("/chat/rooms");

export const apiGetRoomMessages = (roomId) =>
  apiFetch(`/chat/rooms/${roomId}/messages`);

export const apiSendMessage = (roomId, text) =>
  apiFetch(`/chat/rooms/${roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });

// ── Reports ───────────────────────────────────────────
export const apiReportListing = (listingId, reason) =>
  apiFetch(`/listings/${listingId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// ── Admin ─────────────────────────────────────────────
export const apiAdminGetStats = () => apiFetch("/admin/stats");

export const apiAdminGetUsers = (search) =>
  apiFetch(
    `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const apiAdminToggleBan = (userId) =>
  apiFetch(`/admin/users/${userId}/ban`, { method: "PATCH" });

export const apiAdminUpdateTrust = (userId, trust_score) =>
  apiFetch(`/admin/users/${userId}/trust`, {
    method: "PATCH",
    body: JSON.stringify({ trust_score }),
  });

export const apiAdminGetAllListings = (search) =>
  apiFetch(
    `/admin/listings${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const apiAdminDeleteListing = (listingId) =>
  apiFetch(`/admin/listings/${listingId}`, { method: "DELETE" });

export const apiAdminForceStatus = (listingId, status) =>
  apiFetch(`/admin/listings/${listingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const apiAdminGetReports = () => apiFetch("/admin/reports");

export const apiAdminDismissReport = (reportId) =>
  apiFetch(`/admin/reports/${reportId}/dismiss`, { method: "PATCH" });

export const apiAdminActionReport = (reportId) =>
  apiFetch(`/admin/reports/${reportId}/action`, { method: "PATCH" });
