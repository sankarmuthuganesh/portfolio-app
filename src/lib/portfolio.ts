import { supabase } from "./supabase";

export type Project = {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  role: string;
  timeline: string;
  images: string[];
  createdAt: number;
};

export type Skill = { name: string; icon: string };

export type ProfileData = {
  name: string;
  title: string;
  bio: string;
  vision: string;
  photo: string;
  skills: Skill[];
  email: string;
  mobile: string;
};

// --- Auth (Supabase Auth — server-side) ---

/** Check if there is an active Supabase Auth session */
export async function isAdmin(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
}

/** Synchronous check using cached session — use for initial guards only */
export function isAdminSync(): boolean {
  // supabase-js caches the session in memory after getSession()
  // This is a best-effort sync check; always confirm with isAdmin() for mutations
  try {
    const raw = sessionStorage.getItem(
      `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0]}-auth-token`
    );
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const expiresAt = parsed?.expires_at ?? parsed?.currentSession?.expires_at ?? 0;
    return expiresAt * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Log in with email + password via Supabase Auth */
export async function loginAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Log out via Supabase Auth */
export async function logoutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

/** Subscribe to auth state changes */
export function onAuthStateChange(
  callback: (isLoggedIn: boolean) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
  return () => subscription.unsubscribe();
}

// --- In-memory cache with deduplication ---
const cache = new Map<string, { data: unknown; ts: number }>();
const inflight = new Map<string, Promise<unknown>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
    inflight.delete(key);
  } else {
    cache.clear();
    inflight.clear();
  }
}

/** Deduplicated fetch — multiple callers get the same promise */
function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn()
    .then((result) => {
      setCache(key, result);
      inflight.delete(key);
      return result;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

// --- Projects (Supabase) ---
function mapRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: row.title as string,
    shortDescription: (row.short_description as string) || "",
    fullDescription: (row.full_description as string) || "",
    role: (row.role as string) || "",
    timeline: (row.timeline as string) || "",
    images: (row.images as string[]) || [],
    createdAt: (row.created_at as number) || Date.now(),
  };
}

export function getProjects(): Promise<Project[]> {
  return dedup("projects", async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch projects:", error.message);
      return [];
    }
    return (data || []).map(mapRow);
  });
}

export async function getProject(id: string): Promise<Project | undefined> {
  const cached = getCached<Project[]>("projects");
  if (cached) {
    const found = cached.find((p) => p.id === id);
    if (found) return found;
  }

  const inflightProjects = inflight.get("projects");
  if (inflightProjects) {
    const projects = (await inflightProjects) as Project[];
    const found = projects.find((p) => p.id === id);
    if (found) return found;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return undefined;
  return mapRow(data);
}

export async function upsertProject(project: Project): Promise<void> {
  invalidateCache("projects");
  const { error } = await supabase.from("projects").upsert({
    id: project.id,
    title: project.title,
    short_description: project.shortDescription,
    full_description: project.fullDescription,
    role: project.role,
    timeline: project.timeline,
    images: project.images,
    created_at: project.createdAt,
  });
  if (error) {
    console.error("Failed to save project:", error.message);
    throw new Error(error.message);
  }
}

export async function deleteProject(id: string): Promise<void> {
  invalidateCache("projects");
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete project:", error.message);
    throw new Error(error.message);
  }
}

// --- Profile (Supabase) ---
export const DEFAULT_SKILLS: Skill[] = [];

export const DEFAULT_PROFILE: ProfileData = {
  name: "",
  title: "",
  bio: "",
  vision: "",
  photo: "",
  skills: [],
  email: "",
  mobile: "",
};

export function getProfile(): Promise<ProfileData> {
  return dedup("profile", async () => {
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", 1)
      .single();
    if (error || !data) return DEFAULT_PROFILE;
    return {
      name: (data.name as string) || DEFAULT_PROFILE.name,
      title: (data.title as string) || DEFAULT_PROFILE.title,
      bio: (data.bio as string) || DEFAULT_PROFILE.bio,
      vision: (data.vision as string) || DEFAULT_PROFILE.vision,
      photo: (data.photo as string) || "",
      skills: (data.skills as Skill[]) || DEFAULT_SKILLS,
      email: (data.email as string) || "",
      mobile: (data.mobile as string) || "",
    };
  });
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  invalidateCache("profile");
  const { error } = await supabase
    .from("profile")
    .update({
      name: profile.name,
      title: profile.title,
      bio: profile.bio,
      vision: profile.vision,
      photo: profile.photo,
      skills: profile.skills,
      email: profile.email,
      mobile: profile.mobile,
    })
    .eq("id", 1);
  if (error) {
    console.error("Failed to save profile:", error.message);
    throw new Error(error.message);
  }
}

// --- Prefetch: start fetching immediately on module load ---
export const prefetchedData = Promise.all([getProjects(), getProfile()]);

// --- File helpers ---
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
// SVG removed from upload allowed types to prevent stored XSS via SVG files
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function validateFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, GIF, WebP");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large (max 5MB)");
  }
}

/** Compress an image file using Canvas (skips GIFs to preserve animation) */
async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<File> {
  if (file.type === "image/gif") return file;
  if (file.size < 100 * 1024) return file; // skip tiny files

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // prevent memory leak
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: "image/webp" }));
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

/** Upload a file to Supabase Storage and return its public URL */
export async function uploadImage(file: File): Promise<string> {
  validateFile(file);
  // Compress before uploading
  const compressed = await compressImage(file);
  const ext = compressed.type === "image/webp" ? "webp" : file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("images")
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) {
    console.error("Upload failed:", error.message);
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

/** Convert file to data URL (used only for local preview before upload) */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    validateFile(file);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Backwards-compat exports
export const SKILLS = DEFAULT_SKILLS;
export const PROFILE = DEFAULT_PROFILE;