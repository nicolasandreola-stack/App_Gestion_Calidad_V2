/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: { credential: string }) => void;
}

interface GoogleIdButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (parent: HTMLElement, options: GoogleIdButtonOptions) => void;
        prompt?: () => void;
      };
    };
  };
}
