import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE_URL = "https://sarkari-jobs-api-eyq2.onrender.com";

export const STORAGE_KEYS = {
  TOKEN: "auth_token",
  SAVED_JOBS: "saved_jobs",
  PROFILE: "user_profile",
  ONBOARDING_DONE: "onboarding_done",
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Types ──────────────────────────────────────────────────────────────────────

export type JobCategory =
  | "SSC" | "UPSC" | "Railway" | "Banking"
  | "State PSC" | "Defence" | "Police" | "Teaching" | "Other";

export type JobStatus = "active" | "closed" | "upcoming";

export interface Job {
  id: number;
  title: string;
  organisation: string;
  category: JobCategory;
  status: JobStatus;
  content_hash: string | null;
  total_posts: number | null;
  description: string | null;
  qualification: string | null;
  age_limit: string | null;
  salary: string | null;
  location: string | null;
  states: string[] | null;
  apply_link: string | null;
  is_official_link: boolean;
  notification_pdf: string | null;
  last_date: string | null;
  source: string | null;
  created_at: string;
}

export interface JobListResponse {
  total: number;
  page: number;
  per_page: number;
  items: Job[];
}

export interface UserProfile {
  name: string;
  qualification: string;
  state: string;
  preferred_categories: JobCategory[];
}

// ── Jobs API ───────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    category?: string;
    categories?: string;   // comma-separated, e.g. "SSC,Railway"
    q?: string;
    state?: string;
    include_closed?: boolean;
    sort?: "newest" | "deadline" | "posts";
  }) => api.get<JobListResponse>("/api/jobs", { params }),

  detail: (id: number) => api.get<Job>(`/api/jobs/${id}`),

  categories: () => api.get<string[]>("/api/jobs/categories/list"),
};

// ── Local saved jobs (AsyncStorage) ───────────────────────────────────────────

export const savedJobsStorage = {
  getAll: async (): Promise<Job[]> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_JOBS);
    return raw ? JSON.parse(raw) : [];
  },

  save: async (job: Job): Promise<void> => {
    const current = await savedJobsStorage.getAll();
    if (!current.find((j) => j.id === job.id)) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SAVED_JOBS,
        JSON.stringify([job, ...current])
      );
    }
  },

  remove: async (jobId: number): Promise<void> => {
    const current = await savedJobsStorage.getAll();
    await AsyncStorage.setItem(
      STORAGE_KEYS.SAVED_JOBS,
      JSON.stringify(current.filter((j) => j.id !== jobId))
    );
  },

  isSaved: async (jobId: number): Promise<boolean> => {
    const current = await savedJobsStorage.getAll();
    return current.some((j) => j.id === jobId);
  },

  getSavedIds: async (): Promise<Set<number>> => {
    const all = await savedJobsStorage.getAll();
    return new Set(all.map((j) => j.id));
  },
};

// ── Profile storage ────────────────────────────────────────────────────────────

export const profileStorage = {
  get: async (): Promise<UserProfile> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    return raw
      ? JSON.parse(raw)
      : { name: "", qualification: "", state: "", preferred_categories: [] };
  },
  save: async (profile: UserProfile): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },
};

// ── Push notifications API ─────────────────────────────────────────────────────

export const pushApi = {
  register: (token: string, categories: string[]) =>
    api.post("/api/push/register", { token, categories }),
  unregister: (token: string) =>
    api.delete(`/api/push/register?token=${encodeURIComponent(token)}`),
};

export default api;
