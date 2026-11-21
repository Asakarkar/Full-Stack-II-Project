/**
 * RankForge Gamification & Academic Evaluation Enhancements
 * Kept strictly modular and decoupled from core evaluation functionality.
 */

export interface MilestoneInfo {
  currentTier: string;
  nextTier: string | null;
  minPoints: number;
  nextPoints: number | null;
  progressPercent: number;
  pointsToNext: number;
}

const MILESTONE_TIERS = [
  { name: "Initiate", minPoints: 0 },
  { name: "Bronze Scholar", minPoints: 50 },
  { name: "Silver Scholar", minPoints: 100 },
  { name: "Gold Achiever", minPoints: 250 },
  { name: "Diamond Champion", minPoints: 500 },
  { name: "Master of RankForge", minPoints: 1000 },
] as const;

export function calculateMilestone(totalPoints: number): MilestoneInfo {
  const points = Math.max(0, totalPoints);
  let currentTierIndex = 0;
  for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
    if (points >= MILESTONE_TIERS[i].minPoints) {
      currentTierIndex = i;
      break;
    }
  }

  const currentTier = MILESTONE_TIERS[currentTierIndex].name;
  const isMaxTier = currentTierIndex === MILESTONE_TIERS.length - 1;
  const nextTier = isMaxTier ? null : MILESTONE_TIERS[currentTierIndex + 1].name;
  const minPoints = MILESTONE_TIERS[currentTierIndex].minPoints;
  const nextPoints = isMaxTier ? null : MILESTONE_TIERS[currentTierIndex + 1].minPoints;

  let progressPercent = 100;
  let pointsToNext = 0;
  if (nextPoints !== null) {
    const range = nextPoints - minPoints;
    const earnedInRange = points - minPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((earnedInRange / range) * 100)));
    pointsToNext = Math.max(0, nextPoints - points);
  }

  return {
    currentTier,
    nextTier,
    minPoints,
    nextPoints,
    progressPercent,
    pointsToNext,
  };
}

export interface RankMedalInfo {
  tier: "gold" | "silver" | "bronze" | "top10" | "standard";
  label: string;
  badgeColor: string;
  bgColor: string;
  glowColor: string;
}

export function getRankMedal(rank: number): RankMedalInfo {
  if (rank === 1) {
    return {
      tier: "gold",
      label: "Gold",
      badgeColor: "#D97706",
      bgColor: "#FEF3C7",
      glowColor: "#F59E0B40",
    };
  }
  if (rank === 2) {
    return {
      tier: "silver",
      label: "Silver",
      badgeColor: "#64748B",
      bgColor: "#F1F5F9",
      glowColor: "#94A3B840",
    };
  }
  if (rank === 3) {
    return {
      tier: "bronze",
      label: "Bronze",
      badgeColor: "#B45309",
      bgColor: "#FFEDD5",
      glowColor: "#CD7F3240",
    };
  }
  if (rank <= 10) {
    return {
      tier: "top10",
      label: "Top 10",
      badgeColor: "#635BFF",
      bgColor: "#EFEDFF",
      glowColor: "#635BFF20",
    };
  }
  return {
    tier: "standard",
    label: "Ranked",
    badgeColor: "#74809B",
    bgColor: "#F0F2FA",
    glowColor: "transparent",
  };
}

export interface BadgeInfo {
  id: string;
  title: string;
  description: string;
  iconName: string;
  earned: boolean;
}

export function getStudentBadges(points: number): BadgeInfo[] {
  return [
    {
      id: "first_win",
      title: "First Spark",
      description: "Earned your first academic point",
      iconName: "Zap",
      earned: points > 0,
    },
    {
      id: "rising_star",
      title: "Rising Star",
      description: "Crossed 50 points milestone",
      iconName: "Star",
      earned: points >= 50,
    },
    {
      id: "century_club",
      title: "Century Club",
      description: "Earned 100+ points on the leaderboard",
      iconName: "Award",
      earned: points >= 100,
    },
    {
      id: "honor_roll",
      title: "Honor Roll",
      description: "Exceeded 250 points in academic merit",
      iconName: "Crown",
      earned: points >= 250,
    },
    {
      id: "elite_master",
      title: "Grand Scholar",
      description: "Reached 500+ points mastery",
      iconName: "Shield",
      earned: points >= 500,
    },
  ];
}
