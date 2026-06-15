import 'server-only';
import type { UpdraftMod, UpdraftTier } from '@/types';

interface TierLimits {
  maxDetailedRoles: number;
  maxBulletsPerRole: number;
  showEarlierCareer: boolean;
  maxKeyOutcomes: number;
}

const LIMITS: Record<UpdraftTier, TierLimits> = {
  1: { maxDetailedRoles: 2, maxBulletsPerRole: 4, showEarlierCareer: false, maxKeyOutcomes: 3 },
  2: { maxDetailedRoles: 3, maxBulletsPerRole: 5, showEarlierCareer: true,  maxKeyOutcomes: 4 },
  3: { maxDetailedRoles: 4, maxBulletsPerRole: 6, showEarlierCareer: true,  maxKeyOutcomes: 4 },
  4: { maxDetailedRoles: 5, maxBulletsPerRole: 6, showEarlierCareer: true,  maxKeyOutcomes: 4 },
};

/**
 * Returns a shallow copy of the MOD trimmed for resume rendering.
 * The canonical MOD is never mutated — this produces the publishable
 * resume's content view, scoped by the candidate's tier.
 *
 * Roles beyond the limit are demoted to earlier-career one-liners.
 * Bullets beyond the per-role cap are dropped (keeping the first N,
 * which the parser ordered by strength).
 */
export function trimModForResume(mod: UpdraftMod, tier: UpdraftTier): UpdraftMod {
  const limits = LIMITS[tier];

  const detailedRoles = mod.experience.slice(0, limits.maxDetailedRoles);
  const demotedRoles = mod.experience.slice(limits.maxDetailedRoles);

  const trimmedRoles = detailedRoles.map((role) => {
    if (role.bullets.length <= limits.maxBulletsPerRole) return role;
    return { ...role, bullets: role.bullets.slice(0, limits.maxBulletsPerRole) };
  });

  const demotedAsEarlier = demotedRoles.map((role) => ({
    company: role.company,
    title: role.title,
    dates: `${role.start_date} – ${role.end_date}`,
  }));

  const earlierCareer = limits.showEarlierCareer
    ? [...demotedAsEarlier, ...mod.earlier_career]
    : demotedAsEarlier.length > 0
      ? demotedAsEarlier
      : [];

  return {
    ...mod,
    experience: trimmedRoles,
    earlier_career: earlierCareer,
  };
}
