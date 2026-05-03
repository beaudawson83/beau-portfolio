# UpDraft — Login-page privacy copy (canonical)

This is the verbiage that renders below the email-input + login button on `/updraft/login`. Display requirements:

- **Below** the login functionality — never above it (the email input is the first thing the eye lands on).
- **Not buried in fine print** — body copy weight, full readable size, not a collapsible "Learn more" expander.
- Headings as headings. Bullets as bullets. The trust statement is the hero, not legalese.
- Sources cited inline with the original markdown link syntax preserved.

When this file changes, the change must be reflected in `src/lib/data.ts` under the `updraftPrivacyCopy` export — `data.ts` is the single source of truth for content per CLAUDE.md, and the `<PrivacyCallout>` component reads from there. This file remains the human-edited master Beau revises.

---

## Heading

**Privacy, Trust & Opportunity**

## Lede

Building a great resume shouldn't require being an expert—or giving up your privacy.

Our mission is simple: help people showcase their skills, earn better opportunities, and move forward with confidence—safely and transparently.

## Section: How we protect your data

We designed our platform around privacy‑by‑default and data minimization, in line with GDPR principles of lawfulness, fairness, and transparency. [[gdpr-advisor.com](http://gdpr-advisor.com)], [[gdprlocal.com](http://gdprlocal.com)]

### Passwordless, secure access

We use Magic Link authentication, so there are no passwords to store or leak. We collect only your email address, solely to provide access to your account.

### Purpose‑limited data use

Your information is used only to help generate, edit, and export your resume—never for advertising, tracking, or unrelated purposes.

### Temporary storage, automatic deletion

To support edits and downloads, your uploaded information and generated resumes are stored for up to 30 days.

After 30 days of inactivity, all data is automatically and permanently deleted, consistent with GDPR storage‑limitation requirements. [[gdprlocal.com](http://gdprlocal.com)]

### You stay in control

At any time, you can access, export, or delete your data directly from your dashboard—no emails, no hoops. This reflects your GDPR rights to access and erasure. [[gdpr-advisor.com](http://gdpr-advisor.com)]

### Ethical AI, full stop

We never sell personal data and never use your content to train AI models. Your information belongs to you—always.

## Section: Why this matters

No one majors in resume writing. It's a learned skill—and one that AI can explain, refine, and elevate for people who didn't grow up fluent in career language. Used responsibly, AI helps level the playing field.

Our promise is to offer that advantage without compromising your privacy, agency, or trust.

## Footer microcopy

By logging in, you acknowledge our temporary data‑retention policy, designed to give you flexibility while keeping your information secure, private, and fully under your control.
