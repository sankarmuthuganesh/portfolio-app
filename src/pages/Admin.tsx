import { useEffect, useState } from "react";
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
  DEFAULT_PROFILE,
} from "@/lib/portfolio";
import defaultProfileImg from "@/assets/profile.jpg";
import { toast } from "sonner";
import { Edit, Plus, Trash2, X, Upload, ArrowLeft, Image as ImageIcon, Loader2 } from "lucide-react";
import { SkillIcon } from "@/components/SkillIcon";

const empty = (): Project => ({
  id: crypto.randomUUID(),
  title: "",
  shortDescription: "",
  fullDescription: "",
  role: "",
  timeline: "",
  images: [],
  createdAt: Date.now(),
});

const Admin = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const loggedIn = await isAdmin();
      if (!loggedIn) {
        navigate("/admin/login");
        return;
      }
      const [p, prof] = await Promise.all([getProjects(), getProfile()]);
      if (cancelled) return;
      setProjects(p);
      setProfile(prof);
      setLoading(false);
    }
    init();
    document.title = "Admin — Portfolio";
    return () => { cancelled = true; };
  }, [navigate]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate("/admin/login");
  };

  const refresh = async () => setProjects(await getProjects());

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

              <div className="space-y-3">
                {projects.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">No projects yet — create your first one.</p>
                )}
                {projects.map((p) => (
                  <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-4 smooth hover:border-primary/60">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 hero-bg">
                      {p.images[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{p.shortDescription}</p>
                    </div>
                    <div className="flex gap-2">
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
                            accept="image/svg+xml,image/png,image/jpeg,image/webp"
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
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Admin;