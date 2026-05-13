export interface TelegramBridge {
  isTelegram: boolean;
  userId?: string;
  viewportStableHeight?: number;
  haptic(type?: 'light' | 'medium' | 'heavy'): void;
  ready(): void;
}

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: {
      id?: number;
      username?: string;
      first_name?: string;
    };
  };
  viewportStableHeight?: number;
  ready?: () => void;
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy') => void;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export const createTelegramBridge = (): TelegramBridge => {
  const webApp = window.Telegram?.WebApp;
  return {
    isTelegram: Boolean(webApp),
    userId: webApp?.initDataUnsafe?.user?.id?.toString(),
    viewportStableHeight: webApp?.viewportStableHeight,
    haptic(type = 'light') {
      webApp?.HapticFeedback?.impactOccurred?.(type);
    },
    ready() {
      webApp?.ready?.();
    },
  };
};
