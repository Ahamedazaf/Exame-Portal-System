// src/app/api/auth/register/route.js
import { query, queryOne } from '@/lib/db';
import { ok, err } from '@/lib/apiHelpers';
import bcrypt from 'bcryptjs';

const BLOCKED_DOMAINS = [
  'mailinator.com','guerrillamail.com','throwam.com','tempmail.com','yopmail.com',
  'sharklasers.com','guerrillamail.info','guerrillamail.biz','guerrillamail.de',
  'guerrillamail.net','guerrillamail.org','spam4.me','trashmail.com','trashmail.me',
  'trashmail.net','dispostable.com','mailnesia.com','mailnull.com','fakeinbox.com',
  'maildrop.cc','discard.email','10minutemail.com','20minutemail.com','tempr.email',
  'temp-mail.org','emailondeck.com','getairmail.com','filzmail.com',
];

function isValidDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && !BLOCKED_DOMAINS.includes(domain);
}

export async function POST(request) {
  try {
    const { name, email, password, classId } = await request.json();

    if (!name?.trim() || !email?.trim() || !password || !classId)
      return err('All fields are required');
    if (password.length < 6)
      return err('Password must be at least 6 characters');

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidDomain(cleanEmail))
      return err('Please use a valid email (Gmail, Yahoo, Outlook, etc.)');

    const exists = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (exists) return err('An account with this email already exists');

    const cls = await queryOne('SELECT id FROM classes WHERE id = ? AND status = "active"', [classId]);
    if (!cls) return err('Invalid class selected');

    const hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password, role, class_id, auth_provider, approval_status, status)
       VALUES (?, ?, ?, 'student', ?, 'local', 'pending', 'active')`,
      [name.trim(), cleanEmail, hash, classId]
    );

    // Create notification for teacher
    await query(
      `INSERT INTO notifications (type, message, user_id) VALUES ('new_student', ?, ?)`,
      [`New student registered: ${name.trim()} (${cleanEmail}) is waiting for approval.`, result.insertId]
    ).catch(() => {}); // don't fail if notifications table doesn't exist yet

    return ok({ message: 'Registration submitted. Waiting for teacher approval.' }, 201);
  } catch (e) {
    console.error('[Register Error]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
