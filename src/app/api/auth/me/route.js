// src/app/api/auth/me/route.js
import { getTokenFromRequest } from '@/lib/jwt';
import { ok, err } from '@/lib/apiHelpers';

export async function GET(request) {
  const user = getTokenFromRequest(request);
  if (!user) return err('Unauthorized', 401);
  return ok({ user });
}
