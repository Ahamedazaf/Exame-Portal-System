// src/lib/jwt.js
import jwt from 'jsonwebtoken';

const SECRET  = process.env.JWT_SECRET || 'exame_portal_secret_change_in_production';
const EXPIRES = '7d';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Extract token from Request headers (Bearer or cookie)
export function getTokenFromRequest(request) {
  // 1. Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return verifyToken(authHeader.slice(7));
  }
  // 2. Cookie: token=<value>
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (match) return verifyToken(decodeURIComponent(match[1]));
  return null;
}
