// Shared auth configuration constants
export const AUTH_CONFIG = {
  // Cookie settings
  COOKIE_NAME: 'songy-wongy-session',
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // 7 days
  
  // JWT settings
  JWT_EXPIRES_IN: '7d',
  
  // API endpoints
  ENDPOINTS: {
    SIGN_IN: '/api/auth/sign-in',
    SIGN_UP: '/api/auth/sign-up',
    SIGN_OUT: '/api/auth/sign-out',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  
  // OAuth providers (if you plan to use them)
  PROVIDERS: {
    GOOGLE: 'google',
    GITHUB: 'github',
  },
} as const;

export type AuthEndpoint = typeof AUTH_CONFIG.ENDPOINTS[keyof typeof AUTH_CONFIG.ENDPOINTS];

