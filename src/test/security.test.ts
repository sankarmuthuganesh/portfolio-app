import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

function readFile(path: string): string {
  return readFileSync(resolve(root, path), "utf-8");
}

describe("Security checks", () => {
  describe("CSP headers", () => {
    const headers = readFile("public/_headers");

    it("should have Content-Security-Policy", () => {
      expect(headers).toContain("Content-Security-Policy:");
    });

    it("should deny framing", () => {
      expect(headers).toContain("frame-ancestors 'none'");
      expect(headers).toContain("X-Frame-Options: DENY");
    });

    it("should enforce upgrade-insecure-requests", () => {
      expect(headers).toContain("upgrade-insecure-requests");
    });

    it("should have X-Content-Type-Options nosniff", () => {
      expect(headers).toContain("X-Content-Type-Options: nosniff");
    });

    it("should restrict form-action to self", () => {
      expect(headers).toContain("form-action 'self'");
    });

    it("should restrict base-uri to self", () => {
      expect(headers).toContain("base-uri 'self'");
    });

    it("should block camera, microphone, geolocation", () => {
      expect(headers).toContain("camera=()");
      expect(headers).toContain("microphone=()");
      expect(headers).toContain("geolocation=()");
    });
  });

  describe("robots.txt", () => {
    const robots = readFile("public/robots.txt");

    it("should block /admin from crawlers", () => {
      expect(robots).toContain("Disallow: /admin");
    });

    it("should allow public routes", () => {
      expect(robots).toContain("Allow: /");
    });
  });

  describe("index.html", () => {
    const html = readFile("index.html");

    it("should not contain inline scripts", () => {
      // Only the Vite module script should exist
      const scriptTags = html.match(/<script[^>]*>/g) || [];
      scriptTags.forEach((tag) => {
        expect(tag).toMatch(/type="module"/);
      });
    });

    it("should not contain javascript: URLs", () => {
      expect(html).not.toContain("javascript:");
    });

    it("should have favicon set to protect.png", () => {
      expect(html).toContain('href="/protect.png"');
    });

    it("should not expose source map references", () => {
      expect(html).not.toContain("sourceMappingURL");
    });
  });

  describe("Environment variables", () => {
    const envFile = readFile(".env");

    it("should not contain service role keys", () => {
      expect(envFile.toLowerCase()).not.toContain("service_role");
      expect(envFile.toLowerCase()).not.toContain("secret");
    });

    it(".gitignore should exclude .env", () => {
      const gitignore = readFile(".gitignore");
      expect(gitignore).toContain(".env");
    });

    it("should define all required VITE_ env vars", () => {
      expect(envFile).toContain("VITE_SUPABASE_URL=");
      expect(envFile).toContain("VITE_SUPABASE_ANON_KEY=");
      expect(envFile).toContain("VITE_ADMIN_EMAIL=");
      expect(envFile).toContain("VITE_APP_BASENAME=");
      expect(envFile).toContain("VITE_APP_NAME=");
      expect(envFile).toContain("VITE_APP_AUTHOR=");
      expect(envFile).toContain("VITE_SITE_URL=");
      expect(envFile).toContain("VITE_OG_IMAGE_URL=");
    });
  });

  describe("No hardcoded values", () => {
    it("index.html should use env vars for app name, not hardcoded", () => {
      const html = readFile("index.html");
      expect(html).toContain("%VITE_APP_NAME%");
      expect(html).toContain("%VITE_APP_AUTHOR%");
      expect(html).toContain("%VITE_SUPABASE_URL%");
      // Should NOT contain the actual hardcoded values
      expect(html).not.toMatch(/content="வாழ்"/);
      expect(html).not.toMatch(/content="Jeyaraj"/);
      expect(html).not.toContain("qytqkyewynucemiefczu");
    });

    it("App.tsx should read basename from env var", () => {
      const app = readFile("src/App.tsx");
      expect(app).toContain("VITE_APP_BASENAME");
      expect(app).not.toMatch(/basename="\/myportfolio"/);
    });

    it("page titles should use env var for app name", () => {
      const admin = readFile("src/pages/Admin.tsx");
      const detail = readFile("src/pages/ProjectDetail.tsx");
      expect(admin).toContain("VITE_APP_NAME");
      expect(detail).toContain("VITE_APP_NAME");
    });

    it("robots.txt should not contain hardcoded domain", () => {
      const robots = readFile("public/robots.txt");
      expect(robots).not.toContain("vaazh.org");
    });
  });

  describe("Source code XSS prevention", () => {
    it("should sanitize SVG in SkillIcon with DOMPurify", () => {
      const skillIcon = readFile("src/components/SkillIcon.tsx");
      expect(skillIcon).toContain("DOMPurify.sanitize");
      expect(skillIcon).toContain("FORBID_TAGS");
      expect(skillIcon).toContain("FORBID_ATTR");
    });

    it("should not allow SVG uploads in file validation", () => {
      const portfolio = readFile("src/lib/portfolio.ts");
      expect(portfolio).not.toMatch(/ALLOWED_IMAGE_TYPES.*svg/);
    });

    it("should not accept SVG in admin file input", () => {
      const admin = readFile("src/pages/Admin.tsx");
      // Skill icon upload input should not accept SVG
      const acceptAttrs = admin.match(/accept="[^"]*"/g) || [];
      acceptAttrs.forEach((attr) => {
        expect(attr).not.toContain("svg");
      });
    });
  });

  describe("Auth patterns", () => {
    it("should use Supabase Auth, not custom auth", () => {
      const portfolio = readFile("src/lib/portfolio.ts");
      expect(portfolio).toContain("supabase.auth.signInWithPassword");
      expect(portfolio).toContain("supabase.auth.signOut");
      expect(portfolio).toContain("supabase.auth.getSession");
    });

    it("admin page should check auth on mount", () => {
      const admin = readFile("src/pages/Admin.tsx");
      expect(admin).toContain("isAdmin()");
      expect(admin).toContain("/admin/login");
    });

    it("login should have client-side rate limiting", () => {
      const login = readFile("src/pages/AdminLogin.tsx");
      expect(login).toContain("lockedUntil");
      expect(login).toContain("attempts");
    });
  });

  describe("Admin noindex", () => {
    it("AdminLogin should inject noindex meta", () => {
      const login = readFile("src/pages/AdminLogin.tsx");
      expect(login).toContain("noindex, nofollow");
    });

    it("Admin should inject noindex meta", () => {
      const admin = readFile("src/pages/Admin.tsx");
      expect(admin).toContain("noindex, nofollow");
    });
  });

  describe("HSTS header", () => {
    const headers = readFile("public/_headers");

    it("should have Strict-Transport-Security", () => {
      expect(headers).toContain("Strict-Transport-Security:");
      expect(headers).toContain("max-age=31536000");
      expect(headers).toContain("includeSubDomains");
    });
  });
});

describe("Performance checks", () => {
  describe("Build configuration", () => {
    const viteConfig = readFile("vite.config.ts");

    it("should have sourcemaps disabled for production", () => {
      expect(viteConfig).toContain("sourcemap: false");
    });

    it("should have CSS code splitting enabled", () => {
      expect(viteConfig).toContain("cssCodeSplit: true");
    });

    it("should use manual chunks for vendor splitting", () => {
      expect(viteConfig).toContain("manualChunks");
      expect(viteConfig).toContain("vendor-react");
      expect(viteConfig).toContain("vendor-query");
      expect(viteConfig).toContain("vendor-supabase");
    });

    it("should use esbuild minification", () => {
      expect(viteConfig).toContain('minify: "esbuild"');
    });
  });

  describe("Caching headers", () => {
    const headers = readFile("public/_headers");

    it("should set no-store on HTML", () => {
      expect(headers).toContain("/index.html\n  Cache-Control: no-store");
    });

    it("should set immutable cache on assets", () => {
      expect(headers).toContain("max-age=31536000, immutable");
    });
  });

  describe("Code splitting", () => {
    const app = readFile("src/App.tsx");

    it("should lazy-load non-critical routes", () => {
      expect(app).toContain("lazy(() => import");
      // These should all be lazy
      expect(app).toContain("NotFound");
      expect(app).toContain("ProjectDetail");
      expect(app).toContain("AdminLogin");
      expect(app).toContain("Admin");
    });

    it("should eagerly load Index (critical path)", () => {
      expect(app).toMatch(/import Index from/);
    });
  });

  describe("Image optimization", () => {
    const portfolio = readFile("src/lib/portfolio.ts");

    it("should compress images before upload", () => {
      expect(portfolio).toContain("compressImage");
    });

    it("should enforce max file size", () => {
      expect(portfolio).toContain("MAX_FILE_SIZE");
      expect(portfolio).toMatch(/5\s*\*\s*1024\s*\*\s*1024/);
    });
  });

  describe("SPA redirects", () => {
    const redirects = readFile("public/_redirects");

    it("should have SPA catch-all fallback to index.html", () => {
      expect(redirects).toContain("/*");
      expect(redirects).toContain("/index.html");
      expect(redirects).toContain("200");
    });
  });

  describe("No unused dependencies", () => {
    const pkg = JSON.parse(readFile("package.json"));
    const deps = Object.keys(pkg.dependencies || {});

    it("should not include next-themes", () => {
      expect(deps).not.toContain("next-themes");
    });

    it("should not include recharts", () => {
      expect(deps).not.toContain("recharts");
    });

    it("should not include react-hook-form", () => {
      expect(deps).not.toContain("react-hook-form");
    });

    it("should not include date-fns", () => {
      expect(deps).not.toContain("date-fns");
    });
  });
});