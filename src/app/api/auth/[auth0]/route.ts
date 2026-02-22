import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: {
      // Allow sign-up screen hint to be passed via query param
      // e.g., /api/auth/login?screen_hint=signup
    },
    returnTo: '/dashboard',
  }),
  signup: handleLogin({
    authorizationParams: {
      screen_hint: 'signup',
    },
    returnTo: '/dashboard',
  }),
});
