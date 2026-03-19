// src/app/api/settings/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;
  const dbUser = await queryOne(
    'SELECT id, name, email, role, status, auth_provider FROM users WHERE id = ?',
    [auth.user.id]
  );
  if (!dbUser) return err('User not found', 404);
  return ok(dbUser);
}

export async function PUT(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;
  const { user } = auth;

  try {
    const { action, currentPassword, newPassword, newEmail, newName } = await request.json();
    const dbUser = await queryOne('SELECT * FROM users WHERE id = ?', [user.id]);
    if (!dbUser) return err('User not found', 404);

    // ── Change Name ────────────────────────────────────────────
    if (action === 'change_name') {
      if (!newName?.trim() || newName.trim().length < 2)
        return err('Name must be at least 2 characters');
      await query('UPDATE users SET name = ? WHERE id = ?', [newName.trim(), user.id]);
      // Return new token with updated name
      const newToken = signToken({
        id: dbUser.id, name: newName.trim(), email: dbUser.email,
        role: dbUser.role, classId: dbUser.class_id,
      });
      return ok({ message: 'Name updated successfully', name: newName.trim(), newToken });
    }

    // Google users cannot change password
    if (dbUser.auth_provider === 'google' || !dbUser.password) {
      return err('Google account users cannot change password here.', 400);
    }

    // ── Change Password ────────────────────────────────────────
    if (action === 'change_password') {
      if (!currentPassword || !newPassword) return err('Current and new password required');
      if (newPassword.length < 6) return err('New password must be at least 6 characters');

      const valid = await bcrypt.compare(currentPassword, dbUser.password);
      if (!valid) return err('Current password is incorrect. Please check and try again.', 401);

      const hash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);

      // Issue new token (same claims, but now user has new password)
      const newToken = signToken({
        id: dbUser.id, name: dbUser.name, email: dbUser.email,
        role: dbUser.role, classId: dbUser.class_id,
      });
      return ok({ message: 'Password updated successfully. Stay logged in.', newToken });
    }

    // ── Change Email (Teacher only) ────────────────────────────
    if (action === 'change_email') {
      if (user.role !== 'teacher') return err('Only teachers can change email', 403);
      if (!newEmail?.trim()) return err('New email required');
      if (!currentPassword) return err('Current password required to confirm');

      const valid = await bcrypt.compare(currentPassword, dbUser.password);
      if (!valid) return err('Current password is incorrect. Please check and try again.', 401);

      const cleanEmail = newEmail.trim().toLowerCase();
      const exists = await queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, user.id]
      );
      if (exists) return err('This email is already in use by another account');

      await query('UPDATE users SET email = ? WHERE id = ?', [cleanEmail, user.id]);

      // Issue new token with updated email
      const newToken = signToken({
        id: dbUser.id, name: dbUser.name, email: cleanEmail,
        role: dbUser.role, classId: dbUser.class_id,
      });
      return ok({ message: 'Email updated successfully.', newToken, requireRelogin: false });
    }

    return err('Invalid action');
  } catch (e) {
    console.error('[Settings Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
