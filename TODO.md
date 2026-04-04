# Portfolio TODO

> **Last updated:** 2026-04-04
> **Live:** beaudawson.com
> **Status:** Portfolio complete. Blog infrastructure built, needs content.

---

## Completed

- [x] Portfolio redesign — story-driven, substance-first, no theatrical effects
- [x] Hero with trifecta positioning (name, title, proof line, clean headshot)
- [x] 8-metric TelemetryGrid with animated count-up
- [x] 3 case studies (Expedia, Union, BAD Labs) with expandable detail
- [x] BAD Labs showcase with live link
- [x] Tools & Platforms 4-column grid
- [x] Collapsible career timeline (pure CSS, no JS)
- [x] Clean contact form with objective selector
- [x] Ask Beau AI chatbot with rich personal details
- [x] Stripped all theatrical elements (Three.js, particles, boot sequences, terminal chrome)
- [x] Removed 7 dead dependencies, 10 orphaned components (~5,800 lines)
- [x] Mobile polish pass
- [x] Updated metadata/SEO for new positioning
- [x] Professional email: email@beaudawson.com
- [x] GlitchText word-break fix (words no longer split across lines)

---

## Blog — System Logs

Infrastructure is built and deployed. Needs content in Contentful CMS.

### Setup (already done)
- [x] Contentful CMS integration with rich text rendering
- [x] Supabase for view counts and likes
- [x] ISR with 60s revalidation
- [x] 6 tags: AI_STRATEGY, OPS_EFFICIENCY, FRACTIONAL_INSIGHTS, AUTOMATION, CRM_ARCHITECTURE, LEADERSHIP
- [x] Admin create page at `/system-logs/create` (NextAuth protected)
- [x] Auto-generated OG images per post
- [x] Post listing with tag filtering

### Content to Write (priority order)

1. **"Operations Is the Most Underleveraged Function in Your Company"**
   - Tag: OPS_EFFICIENCY
   - Your thesis statement / manifesto. Broadest, most shareable.
   - Angle: why ops is treated as cost center when it should be profit engine.

2. **"The Million-Dollar Billing Error Nobody Was Looking For"**
   - Tag: OPS_EFFICIENCY
   - Your Expedia story. Forensic ops thinking finds money.
   - Angle: narrative — the discovery, the investigation, the recovery.

3. **"Onboarding Is a System, Not a Vibe"**
   - Tag: LEADERSHIP
   - 50%→90% success rate at Union.
   - Angle: what the structured curriculum looks like, why "trial by firehose" fails.

4. **"The Case for Fractional Ops Leadership"**
   - Tag: FRACTIONAL_INSIGHTS
   - When to hire full-time vs. bring in someone for 90 days.
   - Angle: practical guide for CEOs/VPs evaluating this option.

5. **"What Happens When Your AI Actually Works"**
   - Tag: AI_STRATEGY
   - Real examples from Console and BAD Labs clients.
   - Angle: what 90% reduction in admin overhead looks like day-to-day.

6. **"31 Promotions: How I Think About Growing People"**
   - Tag: LEADERSHIP
   - Kevin's 160% pay increase, Sam's Dev Ambassador role.
   - Angle: the framework for identifying and developing talent.

7. **"I Automated 90% of CRM Admin. Here's What's Left."**
   - Tag: AUTOMATION
   - The 10% that still needs humans and why.
   - Angle: honest take on AI limits, not just hype.

8. **"Why I Built a CRM From Scratch"**
   - Tag: CRM_ARCHITECTURE
   - Console's origin story, mount architecture, why existing CRMs frustrated you.
   - Angle: technical decisions that shaped the product.

### Blog TODO
- [ ] Add "System Logs" link to Header nav
- [ ] Write and publish post #1 in Contentful
- [ ] Test post rendering, OG image, tag filtering on live site
- [ ] Add blog post preview cards to main page (below BAD Labs, above skills)

---

## Future Enhancements (not urgent)

- [ ] Social proof section (testimonials from colleagues/direct reports)
- [ ] Downloadable resume PDF (link in hero or contact section)
- [ ] Custom OG image for homepage social sharing (1200x630)
- [ ] Add structured data (JSON-LD) for SEO
- [ ] Lighthouse audit and performance optimization pass

---
