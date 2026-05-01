# Portfolio TODO

> **Last updated:** 2026-05-01
> **Live:** beaudawson.com
> **Status:** Portfolio current. Recently completed a cleanup pass — stripped dead Contentful/NextAuth blog infrastructure, newsletter, post-view analytics, dormant ingest endpoint, and `/admin/chats/` UI. Lint clean (0 errors, 0 warnings).

---

## Next Project — Custom Blog-Maker

The previous blog (Contentful + NextAuth + admin password) is gone. When ready to revisit:

- Decide auth model (passkey? GitHub OAuth? simpler than the old `ADMIN_PASSWORD` flow)
- Decide storage (Supabase vs filesystem MDX vs custom Postgres)
- Decide editor surface (in-app rich text vs MDX-in-repo vs hybrid)
- Decide rendering (RSC server-render vs ISR vs static at build)
- Tag taxonomy: AI_STRATEGY, OPS_EFFICIENCY, FRACTIONAL_INSIGHTS, AUTOMATION, CRM_ARCHITECTURE, LEADERSHIP (carry over from prior design)
- OG-image generation per post
- Hidden behind Pi easter egg until first post is live

### Drafted post backlog (from prior planning, still relevant)

1. "Operations Is the Most Underleveraged Function in Your Company" — OPS_EFFICIENCY
2. "The Million-Dollar Billing Error Nobody Was Looking For" — OPS_EFFICIENCY (Expedia story)
3. "Onboarding Is a System, Not a Vibe" — LEADERSHIP (50%→90% Union)
4. "The Case for Fractional Ops Leadership" — FRACTIONAL_INSIGHTS
5. "What Happens When Your AI Actually Works" — AI_STRATEGY (Console + clients)
6. "31 Promotions: How I Think About Growing People" — LEADERSHIP
7. "I Automated 90% of CRM Admin. Here's What's Left." — AUTOMATION
8. "Why I Built a CRM From Scratch" — CRM_ARCHITECTURE (Console origin)

---

## Future enhancements (no urgency)

- Social proof section (testimonials)
- Downloadable resume PDF link in hero / contact
- Custom OG image for homepage social sharing (1200x630)
- Structured data (JSON-LD) for SEO
- Lighthouse audit + perf pass
- Migrate Supabase JWT keys → opaque keys (`sb_publishable_*` / `sb_secret_*`) — only if already rotating for another reason
