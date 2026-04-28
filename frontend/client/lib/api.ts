import { safeGetItem, safeRemoveItem } from "@/lib/safeStorage";

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

if (!rawApiUrl) {
  throw new Error(" VITE_API_URL is not defined. Check Vercel Environment Variables.");
}

const normalizeApiBase = (input: string) => {
  // If user sets domain only (https://api.example.com), append /api automatically.
  if (/^https?:\/\//i.test(input)) {
    const noTrail = input.replace(/\/+$/, "");
    return /\/api$/i.test(noTrail) ? noTrail : `${noTrail}/api`;
  }
  return input.replace(/\/+$/, "");
};

const API_BASE_URL = normalizeApiBase(rawApiUrl);

export class ApiError extends Error {
  status: number;
  endpoint: string;
  details?: unknown;

  constructor(params: { message: string; status: number; endpoint: string; details?: unknown }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.endpoint = params.endpoint;
    this.details = params.details;
  }
}

const AUTH_LOGOUT_EVENT = "auth:logout";

export const authEvents = {
  onLogout: (handler: (reason?: string) => void) => {
    const listener = (e: Event) => {
      const ce = e as CustomEvent<{ reason?: string }>;
      handler(ce.detail?.reason);
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, listener);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
  },
};

const emitLogout = (reason?: string) => {
  try {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, { detail: { reason } }));
  } catch {
    // no-op: safe in non-browser test contexts
  }
};

const getToken = () => {
  const t = (safeGetItem("token") || "").trim();
  if (!t || t === "null" || t === "undefined") return null;
  return t;
};

const safeJsonParse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!isJson) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Centralized API call with consistent error handling.
const apiCall = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    (headers as any).Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    console.error(`API Network Error [${endpoint}]:`, error);
    throw new ApiError({
      message: "Network error. Please check your connection and backend server.",
      status: 0,
      endpoint,
      details: error,
    });
  }

  const data = await safeJsonParse(response);

  if (response.status === 401) {
    // Token invalid/expired or missing; auto-logout.
    safeRemoveItem("token");
    emitLogout("unauthorized");
  }

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in (data as any) && (data as any).error) ||
      (data && typeof data === "object" && "message" in (data as any) && (data as any).message) ||
      `Request failed (${response.status})`;

    const err = new ApiError({
      message,
      status: response.status,
      endpoint,
      details: data,
    });

    // Console-safe but not noisy.
    if (response.status >= 500) {
      console.error(`API ${response.status} [${endpoint}]:`, err);
    }

    throw err;
  }

  // Some endpoints may return empty 204 or non-json. Standardize.
  return (data ?? ({} as any)) as T;
};

const apiTry = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    // Feature-safe fallback for missing/unfinished backend endpoints.
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return fallback;
    }
    throw e;
  }
};

// Activities API
export const activitiesApi = {
  getAll: () => apiCall("/activities"),
  getById: (id: string) => apiCall(`/activities/${id}`),
  create: (data: any) => apiCall("/activities", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiCall(`/activities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/activities/${id}`, { method: "DELETE" }),
  
  register: (activityId: string, userId: string) => 
    apiCall(`/activities/${activityId}/register`, { method: "POST", body: JSON.stringify({ userId }) }),
  
  unregister: (activityId: string, userId: string) => 
    apiCall(`/activities/${activityId}/unregister`, { method: "POST", body: JSON.stringify({ userId }) }),
  
  joinWaitlist: (activityId: string, userId: string) => 
    apiCall(`/activities/${activityId}/waitlist`, { method: "POST", body: JSON.stringify({ userId }) }),
  
  leaveWaitlist: (activityId: string, userId: string) => 
    apiCall(`/activities/${activityId}/leave-waitlist`, { method: "POST", body: JSON.stringify({ userId }) }),
  
  addComment: (activityId: string, data: { userId: string; userName: string; content: string }) => 
    apiCall(`/activities/${activityId}/comments`, { method: "POST", body: JSON.stringify(data) }),
  
  deleteComment: (activityId: string, commentId: string) => 
    apiCall(`/activities/${activityId}/comments/${commentId}`, { method: "DELETE" }),
  
  addRating: (activityId: string, data: { userId: string; userName: string; score: number; review?: string }) => 
    apiCall(`/activities/${activityId}/ratings`, { method: "POST", body: JSON.stringify(data) }),
  
  addPhoto: (activityId: string, data: { url: string; caption?: string; uploadedBy: string }) => 
    apiCall(`/activities/${activityId}/photos`, { method: "POST", body: JSON.stringify(data) }),
  
  getCategories: () => apiCall("/activities/categories"),
  addCategory: (name: string) => apiCall("/activities/categories", { method: "POST", body: JSON.stringify({ name }) }),
  updateCategory: (id: string, data: any) => apiCall(`/activities/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id: string) => apiCall(`/activities/categories/${id}`, { method: "DELETE" }),
};

// Users API
export const usersApi = {
  getMe: () => apiCall("/users/me"),
  
  getById: (id: string) => apiCall(`/users/${id}`),
  
  updateProfile: (data: { name?: string; email?: string }) =>
    apiCall("/users/profile", { method: "PUT", body: JSON.stringify(data) }),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiCall("/users/password", { method: "PUT", body: JSON.stringify(data) }),
  
  getAll: () => apiCall("/users"),
  getStudents: () => apiCall("/users/students"),
  deleteUser: (id: string) => apiCall(`/users/${id}`, { method: "DELETE" }),
  
  getAchievements: (userId: string) => apiCall(`/users/${userId}/achievements`),
  
  addAchievement: (userId: string, achievementType: string) =>
    apiCall(`/users/${userId}/achievements`, { method: "POST", body: JSON.stringify({ achievementType }) }),
  
  forgotPassword: (email: string) =>
    apiCall("/users/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  
  resetPassword: (code: string, newPassword: string) =>
    apiCall("/users/reset-password", { method: "POST", body: JSON.stringify({ code, newPassword }) }),
};

// Auth API (email verification required)
export const authApi = {
  register: (data: { email: string; name: string; password: string; role?: string }) =>
    apiCall("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  verifyOtp: (data: { email: string; otp: string }) =>
    apiCall("/auth/verify", { method: "POST", body: JSON.stringify(data) }),

  resendOtp: (data: { email: string }) =>
    apiCall("/auth/resend-otp", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiCall("/auth/login", { method: "POST", body: JSON.stringify(data) }),
};

// Feedbacks API
export const feedbacksApi = {
  getAll: () => apiCall("/feedbacks"),
  getById: (id: string) => apiCall(`/feedbacks/${id}`),
  getByActivity: (activityId: string) => apiCall(`/feedbacks/activity/${activityId}`),
  getByUser: (userId: string) => apiCall(`/feedbacks/user/${userId}`),
  create: (data: any) => apiCall("/feedbacks", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/feedbacks/${id}`, { method: "DELETE" }),
};

// Check-ins API
export const checkInsApi = {
  getAll: () => apiCall("/checkins"),
  getById: (id: string) => apiCall(`/checkins/${id}`),
  getByActivity: (activityId: string) => apiCall(`/checkins/activity/${activityId}`),
  getByUser: (userId: string) => apiCall(`/checkins/user/${userId}`),
  checkIn: (data: { userId: string; userName: string; activityId: string; checkedInBy: string }) =>
    apiCall("/checkins", { method: "POST", body: JSON.stringify(data) }),
  bulkCheckIn: (data: { activityId: string; userIds: string[]; checkedInBy: string }) =>
    apiCall("/checkins/bulk", { method: "POST", body: JSON.stringify(data) }),
  checkOut: (id: string) => apiCall(`/checkins/${id}/checkout`, { method: "POST" }),
  delete: (id: string) => apiCall(`/checkins/${id}`, { method: "DELETE" }),
  generateQrToken: (activityId: string) => apiCall(`/checkins/qr-token/${activityId}`, { method: "POST" }),
  qrCheckIn: (data: { token: string; userId: string }) => apiCall("/checkins/qr-checkin", { method: "POST", body: JSON.stringify(data) }),
  getReport: (activityId: string) => apiCall(`/checkins/report/${activityId}`),
};


// Tags API
export const tagsApi = {
  getAll: () => apiCall("/tags"),
  getById: (id: string) => apiCall(`/tags/${id}`),
  create: (data: { name: string; color?: string }) => apiCall("/tags", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiCall(`/tags/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/tags/${id}`, { method: "DELETE" }),
};

// Notifications API
export const notificationsApi = {
  getAll: () => apiCall("/notifications"),
  getByUser: (userId: string) => apiCall(`/notifications/user/${userId}`),
  getByRole: (role: string) => apiCall(`/notifications/role/${role}`),
  getUnreadCount: (userId: string) => apiCall(`/notifications/unread/${userId}`),
  markAsRead: (id: string) => apiCall(`/notifications/${id}/read`, { method: "PUT" }),
  markAllAsRead: (userId: string) => apiCall(`/notifications/read-all/${userId}`, { method: "PUT" }),
  create: (data: any) => apiCall("/notifications", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/notifications/${id}`, { method: "DELETE" }),
  clearRead: (userId: string) => apiCall(`/notifications/clear/${userId}`, { method: "DELETE" }),
};

// Notification Settings API
export const notificationSettingsApi = {
  get: (userId: string) => apiCall(`/notification-settings/${userId}`),
  update: (userId: string, data: any) => apiCall(`/notification-settings/${userId}`, { method: "PUT", body: JSON.stringify(data) }),
};

// Favorites API
export const favoritesApi = {
  getByUser: (userId: string) => apiCall(`/favorites/user/${userId}`),
  checkIsFavorite: (userId: string, activityId: string) => apiCall(`/favorites/${userId}/${activityId}`),
  add: (userId: string, activityId: string) => apiCall("/favorites", { method: "POST", body: JSON.stringify({ userId, activityId }) }),
  remove: (id: string) => apiCall(`/favorites/${id}`, { method: "DELETE" }),
  removeByActivity: (userId: string, activityId: string) => apiCall(`/favorites/user/${userId}/activity/${activityId}`, { method: "DELETE" }),
};

// Certificates API
export const certificatesApi = {
  getAll: () => apiCall("/certificates"),
  getById: (id: string) => apiCall(`/certificates/${id}`),
  getByUser: (userId: string) => apiCall(`/certificates/user/${userId}`),
  getByActivity: (activityId: string) => apiCall(`/certificates/activity/${activityId}`),
  issue: (activityId: string, userId: string) => apiCall("/certificates", { method: "POST", body: JSON.stringify({ activityId, userId }) }),
  verify: (id: string) => apiCall(`/certificates/verify/${id}`),
};

// Broadcast API
export const broadcastApi = {
  getAll: () => apiCall("/broadcasts"),
  getById: (id: string) => apiCall(`/broadcasts/${id}`),
  getRecipientPreview: () => apiCall("/broadcasts/preview/recipients"),
  send: (data: { title: string; message: string; targetRole: string; type: string; sendEmail?: boolean }) =>
    apiCall("/broadcasts", { method: "POST", body: JSON.stringify(data) }),
  sendToAllUsers: (data: { title: string; message: string; type: string; sendEmail?: boolean }) =>
    apiCall("/broadcasts/all-users", { method: "POST", body: JSON.stringify(data) }),
  sendToStudents: (data: { title: string; message: string; type: string; sendEmail?: boolean }) =>
    apiCall("/broadcasts/students", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiCall(`/broadcasts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/broadcasts/${id}`, { method: "DELETE" }),
};

// Reminders API
export const remindersApi = {
  getAll: () => apiCall("/reminders"),
  getById: (id: string) => apiCall(`/reminders/${id}`),
  getByActivity: (activityId: string) => apiCall(`/reminders/activity/${activityId}`),
  getByUser: (userId: string) => apiCall(`/reminders/user/${userId}`),
  getPending: () => apiCall("/reminders/pending/now"),
  create: (data: { activityId: string; userId: string; reminderTime: string }) =>
    apiCall("/reminders", { method: "POST", body: JSON.stringify(data) }),
  send: (id: string) => apiCall(`/reminders/${id}/send`, { method: "POST" }),
  delete: (id: string) => apiCall(`/reminders/${id}`, { method: "DELETE" }),
};

// Activity History API
export const activityHistoryApi = {
  getAll: () => apiCall("/activity-historys"),
  getById: (id: string) => apiCall(`/activity-historys/${id}`),
  getByUser: (userId: string) => apiCall(`/activity-historys/user/${userId}`),
  getByActivity: (activityId: string) => apiCall(`/activity-historys/activity/${activityId}`),
  register: (data: { activityId: string; userId: string; status: string }) =>
    apiCall("/activity-historys/register", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiCall(`/activity-historys/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  cancel: (id: string) => apiCall(`/activity-historys/${id}/cancel`, { method: "POST" }),
  attend: (id: string) => apiCall(`/activity-historys/${id}/attend`, { method: "POST" }),
  delete: (id: string) => apiCall(`/activity-historys/${id}`, { method: "DELETE" }),
};

// Analytics API
export const analyticsApi = {
  getOverview: () => apiCall("/analytics/overview"),
  getCategories: () => apiCall("/analytics/categories"),
  getWeekly: () => apiCall("/analytics/weekly"),
  getMonthly: () => apiCall("/analytics/monthly"),
  getTopActivities: () => apiCall("/analytics/top-activities"),
  getTopStudents: () => apiCall("/analytics/top-students"),
  getRatings: () => apiCall("/analytics/ratings"),
  getHeatmap: () => apiCall("/analytics/heatmap"),
};

// User Preferences API - for recommendations
export const userPreferencesApi = {
  get: (userId: string) =>
    apiTry(() => apiCall(`/user-preferences/${userId}`), null as any),
  update: (userId: string, data: any) =>
    apiTry(
      () => apiCall(`/user-preferences/${userId}`, { method: "PUT", body: JSON.stringify(data) }),
      null as any,
    ),
  updateFromActivity: (userId: string, data: any) =>
    apiTry(
      () => apiCall(`/user-preferences/${userId}/update-from-activity`, { method: "POST", body: JSON.stringify(data) }),
      null as any,
    ),
};

export default {
  activitiesApi,
  authApi,
  usersApi,
  feedbacksApi,
  checkInsApi,
  tagsApi,
  notificationsApi,
  notificationSettingsApi,
  favoritesApi,
  certificatesApi,
  broadcastApi,
  remindersApi,
  activityHistoryApi,
  analyticsApi,
  userPreferencesApi,
};
