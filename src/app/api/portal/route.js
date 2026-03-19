// src/app/api/portal/route.js
import { query } from '@/lib/db';
import { ok, err, requireAuth } from '@/lib/apiHelpers';

export async function GET() {
  try {
    const rows = await query('SELECT setting_key, value FROM portal_settings');
    const s = {};
    rows.forEach(r => { s[r.setting_key] = r.value; });
    return ok(s);
  } catch {
    return ok({ portal_name: 'Exame Portal', portal_logo_text: 'EP', portal_tagline: '' });
  }
}

export async function PUT(request) {
  const auth = requireAuth(request, 'teacher');
  if (auth.error) return auth.error;
  try {
    const body = await request.json();

    // Alter column to MEDIUMTEXT to support base64 images (up to 16MB)
    try {
      await query('ALTER TABLE portal_settings MODIFY COLUMN value MEDIUMTEXT NULL');
    } catch {} // ignore if already done

    const updates = [
      ['portal_name',      body.portal_name      || 'Exame Portal'],
      ['portal_logo_text', body.portal_logo_text  || 'EP'],
      ['portal_tagline',   body.portal_tagline    || ''],
      ['portal_logo_url',  body.portal_logo_url   || ''],
    ];

    for (const [k, v] of updates) {
      await query(
        'INSERT INTO portal_settings (setting_key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
        [k, v, v]
      );
    }
    return ok({ message: 'Portal settings updated' });
  } catch (e) {
    console.error('[Portal]', e.message);
    return err('Server error: ' + e.message, 500);
  }
}
