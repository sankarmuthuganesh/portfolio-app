import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SkillIcon } from "@/components/SkillIcon";
import { ArrowUpRight, ImageIcon, Mail, Phone } from "lucide-react";
import defaultProfileImg from "@/assets/profile.jpg";
import { getProjects, getProfile, Project, ProfileData, DEFAULT_PROFILE } from "@/lib/portfolio";

/* ── Skeleton placeholders ── */
const SkeletonCard = () => (
  <div className="glass rounded-2xl overflow-hidden card-shadow animate-pulse">
    <div className="aspect-[16/10] bg-muted" />
    <div className="p-3 md:p-4 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-2.5 bg-muted rounded w-1/3" />
    </div>
  </div>
);

const SkeletonProfile = () => (
  <div className="glass rounded-3xl p-4 md:p-5 card-shadow animate-pulse w-full">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-muted" />
      <div className="space-y-2 w-full flex flex-col items-center">
        <div className="h-2.5 bg-muted rounded w-16" />
        <div className="h-5 bg-muted rounded w-32" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
      <div className="h-12 bg-muted rounded w-full" />
      <div className="h-8 bg-muted rounded w-full mt-2" />
      <div className="grid grid-cols-2 gap-1.5 w-full mt-2">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="h-8 bg-muted rounded-md" />
        ))}
      </div>
    </div>
  </div>
);

const Index = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount: use prefetch for first load, fresh fetch for subsequent visits
    Promise.all([getProjects(), getProfile()]).then(([p, prof]) => {
      setProjects(p);
      setProfile(prof);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!profile.name) return;
    document.title = `${profile.name} — ${profile.title}`;
    const meta = document.querySelector('meta[name="description"]');
    const desc = `${profile.name}'s portfolio — ${profile.title}. ${profile.bio.slice(0, 100)}`;
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, [profile]);

  const photoSrc = profile.photo || defaultProfileImg;

  const prefetchDetail = useCallback(() => {
    import("./ProjectDetail.tsx");
  }, []);

  return (
    <div className="h-[100dvh] bg-background hero-bg relative flex flex-col overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <SiteHeader />

      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden [scrollbar-width:thin]">
        <div className="container h-full box-border pt-20 pb-6 md:pt-24 md:pb-8 lg:pt-20 lg:pb-6">
          <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] gap-6 lg:h-full">

            {/* ── Profile sidebar ── */}
            <aside className="animate-fade-in lg:h-full lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin] flex items-start lg:items-center">
              {loading ? (
                <SkeletonProfile />
              ) : (
                <div className="glass rounded-3xl p-4 md:p-5 card-shadow flex flex-col justify-center w-full lg:my-auto">
                  <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                    <div className="relative">
                      <div className="absolute inset-0 gradient-bg blur-2xl opacity-50 rounded-full" />
                      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30">
                        <img
                          src={photoSrc}
                          alt={`${profile.name} portrait`}
                          width={96}
                          height={96}
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Hello,</p>
                      <h1 className="text-lg md:text-xl font-bold leading-tight">
                        I'm <span className="gradient-text">{profile.name}</span>
                      </h1>
                      <p className="text-xs text-muted-foreground">{profile.title}</p>
                    </div>
                    <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{profile.bio}</p>

                    {(profile.email || profile.mobile) && (
                      <div className="flex flex-col gap-1.5 w-full">
                        {profile.email && (
                          <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary smooth justify-center">
                            <Mail className="w-3.5 h-3.5" /> {profile.email}
                          </a>
                        )}
                        {profile.mobile && (
                          <a href={`tel:${profile.mobile}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary smooth justify-center">
                            <Phone className="w-3.5 h-3.5" /> {profile.mobile}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {profile.vision && (
                    <div className="mt-3 pt-3 md:mt-4 md:pt-4 border-t border-border/60">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-1.5">Vision</p>
                      <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{profile.vision}</p>
                    </div>
                  )}

                  {profile.skills.length > 0 && (
                    <div className="mt-3 pt-3 md:mt-4 md:pt-4 border-t border-border/60">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-1.5">Skills</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {profile.skills.map((skill) => (
                          <div
                            key={skill.name}
                            className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/60 px-2 py-1.5 smooth hover:bg-primary/15 hover:border-primary/40"
                          >
                            <span className="shrink-0 flex items-center justify-center w-4 h-4">
                              <SkillIcon icon={skill.icon} name={skill.name} className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-medium truncate">{skill.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </aside>

            {/* ── Projects section ── */}
            <section id="projects" className="animate-fade-in flex flex-col lg:h-full lg:min-h-0">
              <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight">
                  Featured <span className="gradient-text">Projects</span>
                </h2>
                {!loading && (
                  <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{projects.length} project{projects.length === 1 ? "" : "s"}</p>
                )}
              </div>

              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
                <div className="glass rounded-2xl p-3 md:p-4">
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-2 items-start">
                      {[1, 2, 3, 4, 5, 6].map((k) => (
                        <SkeletonCard key={k} />
                      ))}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="p-8 md:p-12 text-center text-muted-foreground">No projects yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 pb-2 items-start">
                      {projects.map((p, i) => {
                        const cover = p.images[0];
                        return (
                          <Link
                            key={p.id}
                            to={`/project/${p.id}`}
                            onMouseEnter={prefetchDetail}
                            className="group glass rounded-2xl overflow-hidden smooth hover:scale-[1.02] hover:border-primary/60 card-shadow block animate-fade-in"
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                              {cover ? (
                                <img
                                  src={cover}
                                  alt={p.title}
                                  width={640}
                                  height={400}
                                  loading={i < 3 ? "eager" : "lazy"}
                                  decoding="async"
                                  className="w-full h-full object-cover smooth group-hover:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full hero-bg flex items-center justify-center">
                                  <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-primary/40" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 md:p-4 space-y-1.5 md:space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-sm md:text-base group-hover:gradient-text smooth">{p.title}</h3>
                                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary smooth shrink-0 group-hover:rotate-45" />
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{p.shortDescription}</p>
                              <p className="text-[10px] uppercase tracking-wider text-primary/70">{p.timeline}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;