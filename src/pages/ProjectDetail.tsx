import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { getProject, Project } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, ImageIcon, User } from "lucide-react";

/* ── Skeleton ── */
const SkeletonDetail = () => (
  <div className="container py-6 md:py-8 lg:py-10 max-w-6xl animate-pulse">
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-3">
        <div className="h-8 md:h-12 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-full max-w-md" />
      </div>
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_360px] gap-4 md:gap-6">
        <div className="space-y-3">
          <div className="aspect-[16/10] rounded-2xl bg-muted" />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="aspect-square rounded-xl bg-muted" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-8 bg-muted rounded-full w-28" />
            <div className="h-8 bg-muted rounded-full w-32" />
          </div>
          <div className="rounded-2xl bg-muted h-48" />
        </div>
      </div>
    </div>
  </div>
);

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | undefined>();
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // getProject checks in-memory cache first → instant if coming from Index
    getProject(id).then((p) => {
      setProject(p);
      if (p) document.title = `${p.title} — Portfolio`;
      setLoading(false);
    });
  }, [id]);

  // Auto-cycle images every 6 seconds
  useEffect(() => {
    if (!project || project.images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveImg((prev) => (prev + 1) % project.images.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [project]);

  if (loading) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background">
        <SiteHeader />
        <div className="h-16 shrink-0" />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SkeletonDetail />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold">Project not found</h1>
            <Button onClick={() => navigate("/")}>Back home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <SiteHeader />
      <div className="h-16 shrink-0" />
      <main className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">
        <div className="container py-6 md:py-8 lg:py-10 max-w-6xl">
          <div className="space-y-4 md:space-y-6 animate-fade-in">
            {/* Title + short description */}
            <header className="space-y-2 md:space-y-3">
              <div className="relative">
                <Link to="/" className="absolute right-full mr-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 text-sm md:text-base text-muted-foreground hover:text-primary smooth whitespace-nowrap">
                  <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" /> Back to projects
                </Link>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold">
                  <span className="gradient-text">{project.title}</span>
                </h1>
              </div>
              <p className="text-sm md:text-lg text-muted-foreground">{project.shortDescription}</p>
            </header>

            {/* Image + Sidebar */}
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_360px] gap-4 md:gap-6 items-start">
              {/* Gallery */}
              <div className="space-y-3 w-full">
                {project.images.length > 0 ? (
                  <>
                    <div className="max-h-[40vh] md:max-h-[45vh] lg:max-h-[50vh] aspect-[16/10] rounded-xl md:rounded-2xl overflow-hidden glass card-shadow">
                      <img
                        src={project.images[activeImg]}
                        alt={`${project.title} screenshot ${activeImg + 1}`}
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {project.images.length > 1 && (
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 md:gap-2">
                        {project.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveImg(i)}
                            className={`aspect-square rounded-lg md:rounded-xl overflow-hidden smooth ${i === activeImg ? "ring-2 ring-primary glow" : "opacity-60 hover:opacity-100"}`}
                          >
                            <img src={img} alt={`Thumbnail ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="max-h-[40vh] md:max-h-[45vh] lg:max-h-[50vh] aspect-[16/10] rounded-xl md:rounded-2xl glass hero-bg flex items-center justify-center">
                    <ImageIcon className="w-14 h-14 md:w-20 md:h-20 text-primary/40" />
                  </div>
                )}
              </div>

              {/* Meta + Description sidebar */}
              <div className="space-y-3 md:space-y-4 w-full lg:sticky lg:top-4">
                <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                  <div className="glass rounded-full px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" /> {project.role}
                  </div>
                  <div className="glass rounded-full px-2.5 py-1 md:px-3 md:py-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" /> {project.timeline}
                  </div>
                </div>
                <article className="glass rounded-xl md:rounded-2xl p-4 md:p-5 space-y-2 md:space-y-3">
                  <h2 className="text-base md:text-lg font-bold">About this project</h2>
                  <p className="text-xs md:text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{project.fullDescription}</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;