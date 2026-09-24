"use client";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
}

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return tg || null;
}

export function extractInitDataFromUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const data = params.get("tgWebAppData");
      if (data) return decodeURIComponent(data);
    }
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const data = params.get("tgWebAppData");
      if (data) return decodeURIComponent(data);
    }
  } catch {
    // Ignore URL parsing errors
  }
  return "";
}

const STORAGE_KEY = "giftguard_tg_init_data";
const USER_KEY = "giftguard_tg_user";

export function getStoredInitData(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredInitData(data: string): void {
  if (typeof window === "undefined" || !data) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, data);
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // Storage access blocked or quota exceeded
  }
}

export function parseUserFromInitData(initData: string): TelegramUser | null {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (userStr) {
      return JSON.parse(userStr) as TelegramUser;
    }
  } catch {
    // Fallback if parsing fails
  }
  return null;
}

export function getEffectiveInitData(): string {
  if (typeof window === "undefined") return "";

  // 1. Direct WebApp object
  const tg = getTelegram();
  if (tg?.initData) {
    setStoredInitData(tg.initData);
    if (tg.initDataUnsafe?.user) {
      try { sessionStorage.setItem(USER_KEY, JSON.stringify(tg.initDataUnsafe.user)); } catch {}
    }
    return tg.initData;
  }

  // 2. URL hash or search params
  const fromUrl = extractInitDataFromUrl();
  if (fromUrl) {
    setStoredInitData(fromUrl);
    const parsedUser = parseUserFromInitData(fromUrl);
    if (parsedUser) {
      try { sessionStorage.setItem(USER_KEY, JSON.stringify(parsedUser)); } catch {}
    }
    return fromUrl;
  }

  // 3. Fallback to cached storage
  return getStoredInitData();
}

export function getEffectiveUser(): TelegramUser | null {
  const tg = getTelegram();
  if (tg?.initDataUnsafe?.user) return tg.initDataUnsafe.user;

  const initData = getEffectiveInitData();
  const fromInit = parseUserFromInitData(initData);
  if (fromInit) return fromInit;

  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      if (cached) return JSON.parse(cached) as TelegramUser;
    } catch {}
  }
  return null;
}

export async function waitForTelegram(timeoutMs: number = 800): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (getEffectiveInitData()) return true;

  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const data = getEffectiveInitData();
      if (data || Date.now() - start >= timeoutMs) {
        resolve(Boolean(data));
      } else {
        setTimeout(check, 40);
      }
    };
    check();
  });
}

export function initTelegram(): void {
  const tg = getTelegram();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
  } catch {
    // Ignore in non-Telegram contexts
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "medium"): void {
  const tg = getTelegram();
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.impactOccurred(style);
    } catch {
      // Ignore
    }
  }
}

export function hapticNotification(type: "success" | "warning" | "error"): void {
  const tg = getTelegram();
  if (tg?.HapticFeedback) {
    try {
      tg.HapticFeedback.notificationOccurred(type);
    } catch {
      // Ignore
    }
  }
}

export function openTelegramChannel(usernameOrId: string): void {
  const tg = getTelegram();
  const clean = usernameOrId.replace(/^@/, "");
  const url = `https://t.me/${clean}`;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}

