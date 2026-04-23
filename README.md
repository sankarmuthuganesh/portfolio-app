# Portfolio Web App Deployment

This project is a Vite + React app with Supabase for:

- Auth
- Database
- Storage

## Recommended setup

For your goals:

- **best performance**
- **simple deployment**
- **custom domain**
- **good India latency**


the recommended setup is:

- **Frontend hosting:** Cloudflare Pages
- **Domain/DNS:** Cloudflare DNS
- **Backend/data:** Supabase in **Singapore** (`ap-southeast-1`)

This gives the simplest setup with strong performance for users in India.

---

## Why this setup

### Cloudflare Pages
Benefits:

- simple Git-based deployment
- global CDN with strong India performance
- free SSL
- easy custom domain setup
- works well with static Vite apps
- supports `_headers` and `_redirects`

### Supabase Singapore
Supabase managed platform does **not** provide an India region.

For Chennai/India users, Singapore is the closest practical managed region and usually gives acceptable latency.

If strict India data residency is mandatory, the alternative is:

- self-host Supabase on AWS Mumbai or another India provider

That is more complex and adds maintenance overhead.

---

## Current environment variables

This app uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set these locally in `.env` and also in Cloudflare Pages environment variables.

Example:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Deploy to Cloudflare Pages

### 1. Push code to GitHub
Make sure this project is committed and pushed to a GitHub repository.

### 2. Create a Cloudflare Pages project
In Cloudflare:

- go to **Workers & Pages**
- click **Create application**
- choose **Pages**
- connect your GitHub repository

### 3. Use these build settings

```txt
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

### 4. Add environment variables
In Cloudflare Pages project settings, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the values from your new Supabase Singapore project.

### 5. Deploy
Trigger the first deployment from Cloudflare Pages.

---

## Custom domain setup

### If you do not have a domain yet
You can still deploy immediately.

Cloudflare Pages gives you a free project URL like:

```txt
your-project-name.pages.dev
```

Recommended path:

1. deploy the site first on `pages.dev`
2. verify the app, admin login, image upload, and Supabase connection
3. buy a domain later
4. attach the custom domain in Cloudflare Pages when ready

This is the simplest approach because you do not need to block deployment while deciding on a domain name.

### Suggested registrars
For a simple setup, buy the domain from one of these:

- Cloudflare Registrar
- Namecheap
- Porkbun

If possible, use Cloudflare for DNS even if you buy the domain elsewhere.

### If your domain is already on Cloudflare
This is the easiest option.

- open your Pages project
- go to **Custom domains**
- click **Set up a custom domain**
- enter your domain, for example:
  - `yourdomain.com`
  - `www.yourdomain.com`
- Cloudflare will add the required DNS records
- SSL is issued automatically

### If your domain is with another registrar
Keep the domain where it is or move DNS to Cloudflare.

Recommended for simplicity:

- move DNS management to Cloudflare
- then attach the domain in Cloudflare Pages

Typical DNS approach:

- `www` -> CNAME to your Cloudflare Pages domain
- apex/root domain -> use Cloudflare flattened CNAME or Cloudflare-managed record

---

## Supabase migration to Singapore

This is the easiest migration path because your app uses only:

- Supabase Auth
- two simple tables: `projects`, `profile`
- one storage bucket: `images`

### Migration difficulty
This is **not hard** for your current app.

Expected effort:

- setup: 15 to 30 minutes
- data copy: depends on how many images you have
- code changes: **none**, only environment variable updates

---

## Step-by-step Supabase migration

### 1. Create a new Supabase project in Singapore
In Supabase:

- create a new project
- choose the **Singapore** region

### 2. Recreate schema and policies
Run your SQL setup on the new project:

- open the SQL editor in the new project
- execute `supabase-rls-setup.sql`

If you added any manual table changes in the old project, recreate those too.

### 3. Create the `images` storage bucket
In the new project:

- go to **Storage**
- create bucket: `images`
- make it public if your current app expects public URLs

### 4. Export old table data
From the old project, export data for:

- `projects`
- `profile`

You can do this using:

- Supabase table editor export
- SQL export
- CSV export/import

### 5. Import data into the new project
Import the data into the same tables in the new Singapore project.

### 6. Migrate storage files
Copy all files from the old `images` bucket to the new `images` bucket.

Important:

- uploaded image public URLs will change because the project URL changes
- if your `projects.images` or `profile.photo` fields store full public URLs, those values may need updating

### 7. Update image URLs if needed
If database rows contain full Supabase storage URLs from the old project:

- replace old project URL with the new project URL
- update `projects.images`
- update `profile.photo`

If you only stored relative paths, no URL rewrite is needed.

### 8. Recreate admin auth user
This project uses Supabase email/password auth.

In the new project:

- create the admin user again
- or invite/create the same email account
- confirm login works

### 9. Update app environment variables
Replace old credentials with the new project values:

```env
VITE_SUPABASE_URL=https://your-new-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key
```

### 10. Test locally
Run:

```bash
npm install
npm run build
npm run preview
```

Check:

- home page loads
- admin login works
- projects load
- profile loads
- image upload works
- image display works

### 11. Update Cloudflare Pages env vars
In Cloudflare Pages, update:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then redeploy.

---

## Important note about storage URLs

Your app currently returns full public URLs from Supabase Storage.

That means when you move to a new Supabase project:

- old uploaded files stay on the old project
- new project will generate a different base URL

If old database records store old full URLs, you must update them after migration.

---

## Performance notes

This project is already in a good shape for static hosting:

- Vite production build
- code splitting configured in `vite.config.ts`
- asset caching headers in `public/_headers`
- SPA redirect in `public/_redirects`

For best real-world performance in India:

- host on Cloudflare Pages
- keep images optimized and under reasonable size
- use Supabase Singapore
- keep the custom domain on Cloudflare DNS

---

## If India-only data residency is mandatory

Use this instead:

- host frontend on Cloudflare Pages
- self-host Supabase on AWS Mumbai

Pros:

- data stays in India
- frontend can still be fast globally

Cons:

- harder setup
- server maintenance
- backups and monitoring become your responsibility

For your current project, this is only worth doing if compliance or residency is mandatory.

---

## Recommended final architecture

```txt
Users in India
   -> Cloudflare Pages (frontend)
   -> Supabase Singapore (auth + database + storage)
   -> Custom domain via Cloudflare DNS
```

This is the best balance of:

- simplicity
- performance
- low maintenance

---

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Run preview:

```bash
npm run preview
```
