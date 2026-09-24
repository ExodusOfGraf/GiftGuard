export type GiveawayStatus = "draft" | "scheduled" | "active" | "locked" | "drawing" | "completed" | "cancelled";
export type EligibilityStatus = "pending" | "eligible" | "rejected";
export type RiskLevel = "low" | "medium" | "high";
export type PrizeType = "telegram_gift" | "telegram_collectible" | "ton_nft" | "custom";

export interface Requirement {
  id: string;
  type: string;
  config: {
    chat_id?: string | number;
    username?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface Prize {
  id: string;
  type: PrizeType;
  title: string;
  description: string;
  estimated_value?: number | null;
  currency?: string | null;
  verification_status: "unverified" | "verified" | "failed";
  verification_evidence?: Record<string, unknown>;
}

export interface Giveaway {
  id: string;
  title: string;
  description: string;
  status: GiveawayStatus;
  starts_at: string;
  ends_at: string;
  winners_count: number;
  exclude_high_risk: boolean;
  created_at: string;
  prize?: Prize | null;
  requirements?: Requirement[];
}

export interface RiskSignal {
  rule: string;
  score: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface Participant {
  id: string;
  giveaway_id: string;
  joined_at: string;
  eligibility_status: EligibilityStatus;
  eligibility_checked_at?: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  rejection_reason?: string | null;
  metadata?: {
    risk_signals?: RiskSignal[];
    eligibility?: {
      checks?: {
        requirement_id: string;
        subscribed?: boolean;
        status?: string;
      }[];
    };
    [key: string]: unknown;
  };
  user: {
    id: string;
    telegram_id: number;
    username?: string | null;
    first_name: string;
    last_name?: string | null;
  };
}

export type Participation = Participant;

export interface Analytics {
  participants_total: number;
  eligible: number;
  rejected: number;
  pending: number;
  risk: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface Winner {
  position: number;
  participation_id: string;
  telegram_id: number;
}

export interface Verification {
  giveaway_id: string;
  algorithm: string;
  commitment_hash: string;
  secret_seed?: string;
  participant_snapshot_hash?: string;
  participant_snapshot?: string[];
  external_entropy?: string;
  entropy_provider?: string;
  final_seed?: string;
  participants_count: number;
  winners: Winner[];
  verified: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function getInitData(): string {
  if (typeof window === "undefined") return "";
  return (
    (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || ""
  );
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const initDataStr = getInitData();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(initDataStr ? { "X-Telegram-Init-Data": initDataStr } : {}),
    ...(init?.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Network request failed";
    try {
      const err = await response.json();
      message = err.detail || JSON.stringify(err);
    } catch {
      message = await response.text();
    }
    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.json();
}
