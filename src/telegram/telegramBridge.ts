interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
    };
  };
  themeParams?: Record<string, string>;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const telegramBridge = {
  isTelegram: () => Boolean(window.Telegram?.WebApp),
  init: () => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready();
    webApp?.expand();
  },
  playerId: () => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return user ? `tg-${user.id}` : 'local-browser-player';
  },
  haptic: (style: 'light' | 'medium' | 'heavy' = 'light') => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  },
};
