// src/app/api/auth/login/route.js
import { queryOne } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { ok, err } from '@/lib/apiHelpers';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const email    = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) return err('Email and password required');

    const user = await queryOne(
      'SELECT * FROM users WHERE LOWER(email) = ?', [email]
    );

    if (!user) return err('Invalid email or password', 401);
    if (user.status === 'blocked') return err('Your account has been blocked. Contact the teacher.', 403);

    // Check approval status
    if (user.approval_status === 'pending') {
      return err('Your account is pending teacher approval. Please wait for the teacher to approve your registration.', 403);
    }
    if (user.approval_status === 'rejected') {
      return err('Your registration has been rejected. Please contact the teacher.', 403);
    }

    if (user.password === 'NEEDS_HASH' || !user.password) {
      return err('Please use Google Sign-In for this account.', 400);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return err('Invalid email or password', 401);

    const token = signToken({
      id:      user.id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      classId: user.class_id,
    });

    return ok({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, classId: user.class_id } });
  } catch (e) {
    console.error('[Login Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
