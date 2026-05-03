import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure UpDraft skill spec files ship in the deployed Function bundle.
  // The .md files live outside src/ at skills/updraft/references/ and are
  // loaded at runtime via fs.readFile inside src/lib/updraft/skill-files.ts.
  // Without this trace include, Vercel strips them as untraced assets and
  // the Gemini wrapper has no prompts to send.
  outputFileTracingIncludes: {
    '/api/updraft/**/*': ['./skills/updraft/references/*.md'],
  },
};

export default nextConfig;
