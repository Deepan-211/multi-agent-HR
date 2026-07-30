const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface DashboardStats {
  total_courses: number;
  languages_processed: number;
  localizations_completed: number;
  processing_in_queue: number;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface DashboardActivity {
  activity: ActivityDay[];
}

export interface RecentCourse {
  id: string;
  title: string;
  source_language: string;
  content_type: string;
  status: string;
  created_at: string;
}

export interface AIStatus {
  status: string;
  avg_response_time_ms: number;
  current_load: number;
  model: string;
}

export interface HealthStatus {
  status: string;
  service: string;
}

export interface LibraryItem {
  localization_id: string;
  course_id: string;
  course_title: string;
  target_language: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export interface LibraryResponse {
  items: LibraryItem[];
  total: number;
}

export interface ProgressItem {
  localization_id: string;
  course_id: string;
  course_title: string;
  target_language: string;
  status: string;
  progress_percentage: number;
  created_at: string;
}

export interface CourseUploadResponse {
  course_id: string;
  message: string;
}

export interface LocalizationStartResponse {
  localization_ids: string[];
  message: string;
}

export interface CourseListItem {
  id: string;
  title: string;
  source_language: string;
  content_type: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  localization_status: string | null;
}

export interface CourseListResponse {
  courses: CourseListItem[];
  total: number;
}

export interface CourseResponse extends CourseListItem {}

export interface LocalizationStatusResponse {
  localization_id: string;
  status: string;
  progress_percentage: number;
  estimated_time_seconds: number | null;
  target_language: string;
}

export interface ContentBlock {
  id: string;
  block_number: number;
  original_text: string;
}

export interface TranslatedBlock {
  id: string;
  block_id: string;
  translated_text: string;
  confidence_score: string;
  is_approved: boolean;
}

export interface WorkspaceBlockPair {
  block_number: number;
  source: ContentBlock;
  translation: TranslatedBlock | null;
}

export interface WorkspaceResponse {
  course_id: string;
  course_title: string;
  source_language: string;
  localization_id: string | null;
  blocks: WorkspaceBlockPair[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface UserSettings {
  default_source_language: string;
  default_target_languages: string[];
  email_notifications: boolean;
  localization_complete: boolean;
  weekly_digest: boolean;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Request failed";
    throw new Error(detail);
  }
  return data as T;
}

async function fetchWithAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<T>(res);
}

async function mutateWithAuth<T>(
  path: string,
  token: string,
  method: "PUT" | "POST" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}

export const api = {
  // Auth
  register: async (name: string, email: string, password: string): Promise<TokenResponse> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return parseResponse<TokenResponse>(res);
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return parseResponse<TokenResponse>(res);
  },

  getMe: (token: string) => fetchWithAuth<UserProfile>("/auth/me", token),

  updateProfile: (token: string, data: { name?: string; avatar_url?: string | null }) =>
    mutateWithAuth<UserProfile>("/auth/profile", token, "PUT", data),

  changePassword: (
    token: string,
    data: { old_password: string; new_password: string }
  ) => mutateWithAuth<{ message: string }>("/auth/change-password", token, "POST", data),

  getSettings: (token: string) => fetchWithAuth<UserSettings>("/settings", token),

  updateLanguageSettings: (
    token: string,
    data: {
      default_source_language: string;
      default_target_languages: string[];
    }
  ) => mutateWithAuth<UserSettings>("/settings/language", token, "PUT", data),

  updateNotificationSettings: (
    token: string,
    data: {
      email_notifications: boolean;
      localization_complete: boolean;
      weekly_digest: boolean;
    }
  ) => mutateWithAuth<UserSettings>("/settings/notifications", token, "PUT", data),

  // Dashboard
  getStats: (token: string) => fetchWithAuth<DashboardStats>("/dashboard/stats", token),

  getActivity: (token: string) => fetchWithAuth<DashboardActivity>("/dashboard/activity", token),

  getRecentCourses: (token: string) =>
    fetchWithAuth<RecentCourse[]>("/dashboard/recent", token),

  getAiStatus: (token: string) => fetchWithAuth<AIStatus>("/progress/ai-status", token),

  getHealth: async () => {
    const res = await fetch(`${API_URL}/health`);
    return parseResponse<HealthStatus>(res);
  },

  getLibrary: (token: string) => fetchWithAuth<LibraryResponse>("/library", token),

  searchLibrary: (
    token: string,
    params?: { q?: string; language?: string; status?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set("q", params.q);
    if (params?.language) searchParams.set("language", params.language);
    if (params?.status) searchParams.set("status", params.status);
    const query = searchParams.toString();
    return fetchWithAuth<LibraryResponse>(`/library/search${query ? `?${query}` : ""}`, token);
  },

  listCourses: (token: string) => fetchWithAuth<CourseListResponse>("/courses/", token),

  getCourse: (token: string, courseId: string) =>
    fetchWithAuth<CourseResponse>(`/courses/${courseId}`, token),

  deleteCourse: async (token: string, courseId: string) => {
    const res = await fetch(`${API_URL}/courses/${courseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseResponse<{ message: string }>(res);
  },

  downloadLocalization: async (token: string, localizationId: string) => {
    const res = await fetch(`${API_URL}/library/${localizationId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = typeof data.detail === "string" ? data.detail : "Download failed";
      throw new Error(detail);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "localization.txt";
    return { blob, filename };
  },

  getProgress: (token: string) => fetchWithAuth<ProgressItem[]>("/progress", token),

  getLocalizationStatus: (token: string, localizationId: string) =>
    fetchWithAuth<LocalizationStatusResponse>(`/localize/${localizationId}/status`, token),

  // Workspace
  getWorkspace: (token: string, courseId: string, language?: string) => {
    const path = `/workspace/${courseId}${language ? `?language=${encodeURIComponent(language)}` : ""}`;
    return fetchWithAuth<WorkspaceResponse>(path, token);
  },

  updateBlock: (token: string, blockId: string, data: { translated_text: string }) =>
    mutateWithAuth<TranslatedBlock>(`/workspace/block/${blockId}`, token, "PUT", data),

  approveLocalization: (token: string, localizationId: string) =>
    mutateWithAuth<{ message: string }>(`/workspace/${localizationId}/approve`, token, "POST"),

  exportLocalization: async (token: string, localizationId: string, format: "pdf" | "text") => {
    const res = await fetch(`${API_URL}/workspace/${localizationId}/export`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ format }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = typeof data.detail === "string" ? data.detail : "Export failed";
      throw new Error(detail);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `export.${format === "pdf" ? "pdf" : "txt"}`;
    return { blob, filename };
  },

  uploadCourse: async (
    token: string,
    data: {
      title: string;
      source_language: string;
      content_type: string;
      file: File;
    }
  ) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("source_language", data.source_language);
    formData.append("content_type", data.content_type);
    formData.append("file", data.file);

    const res = await fetch(`${API_URL}/courses/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return parseResponse<CourseUploadResponse>(res);
  },

  startLocalization: async (
    token: string,
    data: {
      course_id: string;
      target_languages: string[];
      ai_model: string;
    }
  ) => {
    const res = await fetch(`${API_URL}/localize/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return parseResponse<LocalizationStartResponse>(res);
  },
};

export default API_URL;