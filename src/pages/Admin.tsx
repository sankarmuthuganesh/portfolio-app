import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteProject,
  uploadImage,
  getProfile,
  getProjects,
  isAdmin,
  logoutAdmin,
  ProfileData,
  Project,
  saveProfile,
  Skill,
  upsertProject,
  saveProjectOrder,
  invalidateCache,
  DEFAULT_PROFILE,
} from "@/lib/portfolio";
import { fetchVisits, clearAllVisits, VisitRow } from "@/lib/supabase";
import defaultProfileImg from "@/assets/profile.jpg";
import { toast } from "sonner";
import { Edit, Plus, Trash2, X, Upload, ArrowLeft, GripVertical, Image as ImageIcon, Loader2, Smartphone, Tablet, Monitor, RefreshCw, Eye } from "lucide-react";
import { SkillIcon } from "@/components/SkillIcon";

const BASE = import.meta.env.VITE_APP_BASENAME || "/myportfolio";

const empty = (): Project => ({
  id: crypto.randomUUID(),
  title: "",
  shortDescription: "",
  fullDescription: "",
  role: "",
  timeline: "",
  images: [],
  createdAt: Date.now(),
  displayOrder: 0,
});

const Admin = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const projectsListRef = useRef<HTMLDivElement>(null);
  const autoScrollTimer = useRef<number | null>(null);
  const touchStartY = useRef<number>(0);
  const touchCurrentIdx = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const loggedIn = await isAdmin();
      if (!loggedIn) {
        navigate(`${BASE}/admin/login`);
        return;
      }
      const [p, prof] = await Promise.all([getProjects(), getProfile()]);
      if (cancelled) return;
      setProjects(p);
      setProfile(prof);
      setLoading(false);
    }
    init();
    document.title = `Admin — ${import.meta.env.VITE_APP_NAME || "Portfolio"}`;
    // Prevent search engines from indexing admin pages
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    // Keyboard shortcut: Escape to go home
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") navigate(BASE);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      cancelled = true;
      document.head.removeChild(meta);
      window.removeEventListener("keydown", handleKey);
    };
  }, [navigate]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate(`${BASE}/admin/login`);
  };

  const refresh = async () => {
    invalidateCache("projects");
    setProjects(await getProjects());
  };

  // --- Auto-scroll helper ---
  const autoScroll = (clientY: number) => {
    const container = projectsListRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const edgeZone = 60;
    const scrollSpeed = 12;
    if (clientY < rect.top + edgeZone) {
      container.scrollBy({ top: -scrollSpeed });
    } else if (clientY > rect.bottom - edgeZone) {
      container.scrollBy({ top: scrollSpeed });
    }
  };

  // --- Find which project index is at a given Y coordinate ---
  const getIndexAtY = (clientY: number): number | null => {
    const container = projectsListRef.current;
    if (!container) return null;
    const children = Array.from(container.children) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    // If above first or below last, clamp
    if (children.length > 0) {
      const firstRect = children[0].getBoundingClientRect();
      if (clientY < firstRect.top) return 0;
      const lastRect = children[children.length - 1].getBoundingClientRect();
      if (clientY > lastRect.bottom) return children.length - 1;
    }
    return null;
  };

  // --- Complete a reorder (shared by drag and touch) ---
  const completeReorder = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...projects];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((p, i) => ({ ...p, displayOrder: i }));
    setProjects(updated);
    setReordering(true);
    try {
      await saveProjectOrder(updated.map((p) => ({ id: p.id, displayOrder: p.displayOrder })));
      toast.success("Order saved");
    } catch {
      toast.error("Failed to save order");
      await refresh();
    } finally {
      setReordering(false);
    }
  };

  // --- Desktop drag handlers ---
  const handleDragStart = (index: number) => {
    setDragIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
    autoScroll(e.clientY);
  };

  const handleDrop = async (dropIndex: number) => {
    if (dragIdx === null) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setDragIdx(null);
    setDragOverIdx(null);
    await completeReorder(dragIdx, dropIndex);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
    if (autoScrollTimer.current) {
      cancelAnimationFrame(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  // --- Touch handlers (mobile/tablet) ---
  // Use ref-based listener for touchmove with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = projectsListRef.current;
    if (!container) return;

    const onTouchMove = (e: TouchEvent) => {
      // Only intercept if we're actively dragging
      if (dragIdx === null) return;
      e.preventDefault(); // prevent page scroll while reordering
      const clientY = e.touches[0].clientY;
      autoScroll(clientY);
      const overIdx = getIndexAtY(clientY);
      if (overIdx !== null) setDragOverIdx(overIdx);
    };

    container.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => container.removeEventListener("touchmove", onTouchMove);
  }, [dragIdx]);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentIdx.current = index;
    setDragIdx(index);
  };

  const handleTouchEnd = async () => {
    const fromIdx = dragIdx;
    const toIdx = dragOverIdx;
    setDragIdx(null);
    setDragOverIdx(null);
    touchCurrentIdx.current = null;
    if (fromIdx !== null && toIdx !== null) {
      await completeReorder(fromIdx, toIdx);
    }
  };

  const handleSave = async () => {
    if (!editing || saving) return;
    if (!editing.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await upsertProject(editing);
      toast.success("Project saved");
      setEditing(null);
      await refresh();
    } catch {
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?") || saving) return;
    setSaving(true);
    try {
      await deleteProject(id);
      toast.success("Deleted");
      await refresh();
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setSaving(false);
    }
  };

  const handleImages = async (files: FileList | null) => {
    if (!files || !editing) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      setEditing({ ...editing, images: [...editing.images, ...urls] });
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleProfilePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setProfile({ ...profile, photo: url });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const updateSkill = (i: number, patch: Partial<Skill>) => {
    const next = [...profile.skills];
    next[i] = { ...next[i], ...patch };
    setProfile({ ...profile, skills: next });
  };

  const addSkill = () =>
    setProfile({ ...profile, skills: [...profile.skills, { name: "New Skill", icon: "✨" }] });

  const removeSkill = (i: number) =>
    setProfile({ ...profile, skills: profile.skills.filter((_, idx) => idx !== i) });

  const handleSkillIconUpload = async (i: number, file: File | undefined) => {
    if (!file) return;
    try {
      const url = await uploadImage(file);
      updateSkill(i, { icon: url });
      toast.success("Icon uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload icon");
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim() || saving) {
      if (!profile.name.trim()) toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await saveProfile(profile);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container pt-28 pb-20 max-w-5xl">
        {editing ? (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary smooth"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-3xl font-bold">
              {projects.find((p) => p.id === editing.id) ? "Edit" : "New"}{" "}
              <span className="gradient-text">Project</span>
            </h1>

            <div className="glass rounded-3xl p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Input id="role" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} placeholder="Lead Engineer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline</Label>
                  <Input id="timeline" value={editing.timeline} onChange={(e) => setEditing({ ...editing, timeline: e.target.value })} placeholder="Jan – Jun 2024" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="short">Short description</Label>
                <Textarea id="short" rows={2} value={editing.shortDescription} onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full">Full description</Label>
                <Textarea id="full" rows={6} value={editing.fullDescription} onChange={(e) => setEditing({ ...editing, fullDescription: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Images</Label>
                <label className="block">
                  <div className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-6 text-center cursor-pointer smooth">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 mx-auto mb-2 text-primary" />
                    )}
                    <p className="text-sm">{uploading ? "Uploading…" : "Click to upload images"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Uploaded to cloud storage</p>
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImages(e.target.files)} />
                </label>
                {editing.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                    {editing.images.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
                        <img src={img} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setEditing({ ...editing, images: editing.images.filter((_, idx) => idx !== i) })}
                          className="absolute top-1 right-1 bg-background/80 backdrop-blur rounded-full p-1 opacity-0 group-hover:opacity-100 smooth"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gradient-bg text-primary-foreground border-0 hover:opacity-90 smooth">
                  {saving ? "Saving…" : "Save Project"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="projects" className="animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h1 className="text-4xl font-bold">
                Manage <span className="gradient-text">Portfolio</span>
              </h1>
              <TabsList>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="visits">Visits</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => setEditing(empty())}
                  className="gradient-bg text-primary-foreground border-0 hover:opacity-90 smooth glow"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
              </div>

              <div ref={projectsListRef} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                {projects.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">No projects yet — create your first one.</p>
                )}
                {projects.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTouchStart(idx, e)}
                    onTouchEnd={handleTouchEnd}
                    className={`glass rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 smooth hover:border-primary/60 cursor-grab active:cursor-grabbing select-none touch-none ${
                      dragIdx === idx ? "opacity-50 scale-95" : ""
                    } ${dragOverIdx === idx && dragIdx !== idx ? "border-primary ring-2 ring-primary/30" : ""}`}
                  >
                    <div className="shrink-0 text-muted-foreground hover:text-primary smooth" title="Drag to reorder">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden bg-muted shrink-0 hero-bg">
                      {p.images[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-sm md:text-base">{p.title}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{p.shortDescription}</p>
                    </div>
                    <div className="flex gap-0.5 md:gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <div className="glass rounded-3xl p-6 space-y-5">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30 shrink-0">
                    <img
                      src={profile.photo || defaultProfileImg}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo" className="cursor-pointer">
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-primary/15 smooth text-sm">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? "Uploading…" : "Change photo"}
                      </span>
                      <input
                        id="photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleProfilePhoto(e.target.files?.[0])}
                      />
                    </Label>
                    {profile.photo && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setProfile({ ...profile, photo: "" })}
                      >
                        Reset to default
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pname">Name</Label>
                  <Input id="pname" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptitle">Title / Headline</Label>
                  <Input id="ptitle" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pbio">Bio</Label>
                  <Textarea id="pbio" rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pvision">Vision</Label>
                  <Textarea id="pvision" rows={4} value={profile.vision} onChange={(e) => setProfile({ ...profile, vision: e.target.value })} placeholder="What drives you / what you're working toward" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pemail">Email</Label>
                  <Input id="pemail" type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pmobile">Mobile</Label>
                  <Input id="pmobile" type="tel" value={profile.mobile || ""} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} placeholder="+1 (555) 123-4567" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Skills</Label>
                    <Button size="sm" variant="outline" onClick={addSkill}>
                      <Plus className="w-4 h-4 mr-1" /> Add skill
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {profile.skills.map((skill, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2">
                        <div className="w-10 h-10 shrink-0 rounded-md bg-background flex items-center justify-center overflow-hidden border border-border/60">
                          <SkillIcon icon={skill.icon} name={skill.name} className="w-7 h-7" />
                        </div>
                        <Input
                          className="flex-1 min-w-0"
                          value={skill.name}
                          onChange={(e) => updateSkill(i, { name: e.target.value })}
                          placeholder="Skill name"
                        />
                        <Input
                          className="flex-1 min-w-0"
                          value={skill.icon}
                          onChange={(e) => updateSkill(i, { icon: e.target.value })}
                          placeholder="Emoji, image URL, or <svg>…"
                        />
                        <Label className="cursor-pointer shrink-0" title="Upload SVG or PNG">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-background hover:bg-primary/15 border border-border/60 smooth">
                            <Upload className="w-4 h-4" />
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => handleSkillIconUpload(i, e.target.files?.[0])}
                          />
                        </Label>
                        <Button size="icon" variant="ghost" onClick={() => removeSkill(i)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Icon accepts an emoji, an image URL, an uploaded SVG/PNG, or raw <code>&lt;svg&gt;</code> markup.</p>
                </div>

                <div className="pt-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="gradient-bg text-primary-foreground border-0 hover:opacity-90 smooth">
                    {saving ? "Saving…" : "Save Profile"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visits" className="space-y-4">
              <VisitsPanel />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

/* ── Visits / Audit panel ── */
const DeviceIcon = ({ type }: { type: string }) => {
  if (type === "mobile") return <Smartphone className="w-4 h-4 text-primary" />;
  if (type === "tablet") return <Tablet className="w-4 h-4 text-primary" />;
  return <Monitor className="w-4 h-4 text-primary" />;
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const VisitsPanel = () => {
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setVisits(await fetchVisits(500));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleClear = async () => {
    if (!confirm("Delete ALL visit logs? This cannot be undone.")) return;
    setClearing(true);
    try {
      const ok = await clearAllVisits();
      if (ok) {
        toast.success("All visit logs cleared");
        await load();
      } else {
        toast.error("Failed to clear visits");
      }
    } finally {
      setClearing(false);
    }
  };

  // Stats
  const total = visits.length;
  const uniqueVisitors = new Set(visits.map((v) => v.visitor_id || "")).size;
  const byDevice = visits.reduce<Record<string, number>>((acc, v) => {
    acc[v.device_type] = (acc[v.device_type] || 0) + 1;
    return acc;
  }, {});
  const topPages = Object.entries(
    visits.reduce<Record<string, number>>((acc, v) => {
      acc[v.page_name] = (acc[v.page_name] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Showing the most recent {visits.length} visits
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={clearing || visits.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-1 text-destructive" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total visits</p>
          <p className="text-2xl font-bold gradient-text">{total}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Unique visitors</p>
          <p className="text-2xl font-bold gradient-text">{uniqueVisitors}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Mobile</p>
          <p className="text-2xl font-bold">
            {byDevice.mobile || 0}
            <span className="text-sm text-muted-foreground ml-1">
              / {byDevice.tablet || 0} / {byDevice.desktop || 0}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">mobile / tablet / desktop</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Top page</p>
          <p className="text-base font-semibold truncate">
            {topPages[0]?.[0] || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {topPages[0]?.[1] ? `${topPages[0][1]} views` : ""}
          </p>
        </div>
      </div>

      {/* Top pages */}
      {topPages.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Top pages
          </h3>
          <div className="space-y-2">
            {topPages.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span className="truncate">{name}</span>
                <span className="text-muted-foreground ml-2 shrink-0">{count} views</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visits list */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
            Loading visits…
          </div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No visits yet. Once people start viewing your portfolio, you'll see entries here.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {visits.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-3 text-sm">
                <DeviceIcon type={v.device_type} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{v.page_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{v.device_type}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatTime(v.visited_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
