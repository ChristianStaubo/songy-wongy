import { createAuthClient } from '@repo/auth';

// Create auth client instance pointing to your API
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

// Example usage functions
export async function signIn(email: string, password: string) {
  try {
    const result = await authClient.signIn(email, password);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' };
  }
}

export async function signUp(email: string, password: string, name?: string) {
  try {
    const result = await authClient.signUp(email, password, name);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sign up failed' };
  }
}

export async function signOut() {
  try {
    await authClient.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' };
  }
}

export async function getCurrentUser() {
  try {
    const user = await authClient.getMe();
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get user' };
  }
}

