# Blog Setup Walkthrough

Follow these steps in order. Each step takes 2–10 minutes.
When you're done you'll be able to visit the Pi easter egg →
`LOG_CREATOR`, type your password, and publish your first post.

---

## Step 1 — Unblock the immediate crash (5 min)

This fixes the `www.beaudawson.com` server error right now.
The error is: NextAuth has no secret and no admin password set
in Vercel.

1. Go to https://vercel.com → `beau-portfolio` project
2. **Settings** → **Environment Variables**
3. Add these **three** variables, all scoped to **Production**
   (and check the Preview box too if you want branch previews to work):

   | Name | Value |
   |------|-------|
   | `NEXTAUTH_SECRET` | `hlZ3AWzEPlW+LM1Y8h5N6HdunkD3H+w1pVtninl5bLk=` |
   | `NEXTAUTH_URL` | `https://www.beaudawson.com` |
   | `ADMIN_PASSWORD` | Pick something long, e.g. `0sJGbtszYbRWHztEeRDHDlYgI4wUmlM` |

   _(Both generated values are fresh — not used anywhere else. Save the
   admin password in a password manager.)_

4. **Deployments** tab → click the three-dot menu on the latest
   deployment → **Redeploy**. Vercel does **not** auto-rebuild on env
   var changes.

5. Once the deploy finishes: reload the site. The homepage should
   load. Clicking `LOG_CREATOR` on the Pi dashboard now shows a
   password prompt instead of crashing.

You've unblocked the crash. You still need Contentful to actually
save and publish posts — that's Step 2.

---

## Step 2 — Contentful (post storage) (~10 min)

Contentful is a free-tier CMS. We use it as the database that
stores your blog posts.

### 2a. Create a space

1. Sign up at https://www.contentful.com (free forever plan is fine)
2. Create a new **Space** — call it `beau-portfolio` or anything.
3. Pick the free "Community" tier.

### 2b. Create the content model

This tells Contentful what fields a blog post has.

1. In your space: **Content model** → **Add content type**
2. Name it **System Log** → API identifier: `systemLog` (exact,
   camelCase — the code expects this)
3. Add these fields one by one using **Add field**:

   | Field Name | Field ID | Type | Required? |
   |-----------|----------|------|-----------|
   | Title | `title` | Short text | Yes |
   | Slug | `slug` | Short text | Yes |
   | Entry ID | `entryId` | Short text | Yes |
   | Published Date | `publishedDate` | Date & time | Yes |
   | Status | `status` | Short text | Yes |
   | Tags | `tags` | Short text, **list** | No |
   | Executive Summary | `executiveSummary` | Long text | Yes |
   | Bottleneck Identified | `bottleneckIdentified` | Long text | No |
   | Body | `body` | Rich text | Yes |
   | Recommended Architecture | `recommendedArchitecture` | Long text | No |
   | Meta Description | `metaDescription` | Short text | No |

   _Tip: For "Status" and "Tags", you can add **validations** later
   to restrict values, but it's not required to publish._

4. Click **Save** on the content type.

### 2c. Get your API keys

1. **Settings** → **API keys** → **Add API key**
2. Name it "Production". Copy these three values:
   - **Space ID**
   - **Content Delivery API — access token**
   - **Content Preview API — access token**

### 2d. Get a management token (needed to CREATE posts from the site)

1. Top-right avatar → **Account settings**
2. **CMA tokens** → **Create personal access token**
3. Name it "Portfolio admin" → **Generate**
4. Copy the long token (shown once — save to password manager)

### 2e. Add to Vercel

Back in Vercel → beau-portfolio → Settings → Environment Variables,
add these **four** (all Production scope):

| Name | Paste |
|------|-------|
| `CONTENTFUL_SPACE_ID` | Space ID from 2c |
| `CONTENTFUL_ACCESS_TOKEN` | Delivery token from 2c |
| `CONTENTFUL_PREVIEW_TOKEN` | Preview token from 2c |
| `CONTENTFUL_MANAGEMENT_TOKEN` | Token from 2d |

**Redeploy** again (Deployments → ⋯ → Redeploy).

---

## Step 3 — Write your first post (~5 min)

1. Homepage → click the `π` symbol in the footer corner
2. Complete the Pi challenge → Dashboard appears
3. Click `> LOG_CREATOR [RESTRICTED]`
4. Enter your `ADMIN_PASSWORD` → click **AUTHENTICATE**
5. Click `[ + NEW_LOG ]` in the sidebar
6. Fill out the form. Minimum to publish:
   - **Title**
   - **Slug** (auto-generated from title, edit if you want)
   - **Entry ID** (auto-generated, e.g. `LOG_001`)
   - **Published Date**
   - **Status** → pick `DRAFT` until you're ready to ship
   - **At least one Tag**
   - **Executive Summary** (2–3 sentences)
   - **Body** (Markdown)
7. Click `[ SAVE_DRAFT ]`. When ready to publish: change status to
   `DEPLOYED` → save again.
8. Visit `/system-logs` to see it live.

> ⚠ While the blog is hidden behind the Pi easter egg, search
> engines are blocked from indexing it (we set `robots: noindex`).
> When you're ready to promote the blog, remove that block in
> `src/app/system-logs/layout.tsx` and add a link to `/system-logs`
> in `src/components/Header.tsx`.

---

## Step 4 (optional, later) — Supabase

Skip this unless/until you want:
- Newsletter signups on blog posts
- Per-post view counts

Setup is ~20 min. Signal me when you want to do it and I'll write
the schema + Vercel env vars.

---

## Troubleshooting

**"AUTH_FAILED" on login page**
→ Your `ADMIN_PASSWORD` in Vercel doesn't match what you typed.
Check for trailing spaces / wrong casing / extra newlines.

**Homepage still shows `server-side exception` after Step 1**
→ You didn't redeploy. Go to Deployments → ⋯ → Redeploy.

**Create page shows "CREATE_FAILED" when saving a post**
→ Contentful env vars are missing or wrong, or the content model
doesn't match the field IDs in step 2b. Double-check each field
has the exact API identifier (camelCase).

**/system-logs shows "NO_ENTRIES_FOUND" but you saved a post**
→ The post is a `DRAFT`. Only `DEPLOYED` posts show on the public
listing. Change status and re-save.
