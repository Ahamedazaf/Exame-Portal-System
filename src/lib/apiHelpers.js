// src/lib/apiHelpers.js
import { getTokenFromRequest } from './jwt';
import { NextResponse } from 'next/server';

export function ok(data, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function requireAuth(request, role = null) {
  const user = getTokenFromRequest(request);
  if (!user) return { error: err('Unauthorized — please login again', 401) };
  if (role && user.role !== role) return { error: err('Access denied — insufficient permissions', 403) };
  return { user };
}
