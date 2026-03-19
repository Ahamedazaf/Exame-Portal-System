// scripts/check-env.js
// Run: node scripts/check-env.js
// Checks if all required environment variables are set correctly

const fs   = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) { console.error('❌ .env.local file not found!'); process.exit(1); }
  const vars = {};
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i === -1) return;
    vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  });
  return vars;
}

const env = loadEnv();

console.log('\n🔍 Checking .env.local configuration...\n');

const checks = [
  {
    key: 'DB_HOST',
    ok: v => v && v !== '',
    msg: 'MySQL host (usually localhost)',
  },
  {
    key: 'JWT_SECRET',
    ok: v => v && v.length >= 20 && v !== 'exame_portal_super_secret_jwt_key_2025_change_this',
    msg: 'JWT Secret (change from default!)',
    warn: v => v === 'exame_portal_super_secret_jwt_key_2025_change_this' ? '⚠️  Using default secret — change this in production!' : null,
  },
  {
    key: 'NEXTAUTH_SECRET',
    ok: v => v && v.length >= 20 && v !== 'exame_portal_nextauth_secret_change_this_in_production',
    msg: 'NextAuth Secret (change from default!)',
    warn: v => v === 'exame_portal_nextauth_secret_change_this_in_production' ? '⚠️  Using default secret — change this in production!' : null,
  },
  {
    key: 'NEXTAUTH_URL',
    ok: v => v && v.startsWith('http'),
    msg: 'NextAuth URL (http://localhost:3000 for dev)',
  },
  {
    key: 'GOOGLE_CLIENT_ID',
    ok: v => v && v !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && v.includes('.apps.googleusercontent.com'),
    msg: 'Google OAuth Client ID (must end with .apps.googleusercontent.com)',
    fail: v => v === 'YOUR_GOOGLE_CLIENT_ID_HERE' ? '❌ GOOGLE_CLIENT_ID not set! This causes Error 401.' : null,
  },
  {
    key: 'GOOGLE_CLIENT_SECRET',
    ok: v => v && v !== 'YOUR_GOOGLE_CLIENT_SECRET_HERE' && v.startsWith('GOCSPX-'),
    msg: 'Google OAuth Client Secret (must start with GOCSPX-)',
    fail: v => v === 'YOUR_GOOGLE_CLIENT_SECRET_HERE' ? '❌ GOOGLE_CLIENT_SECRET not set!' : null,
  },
];

let allOk = true;

checks.forEach(({ key, ok, msg, warn, fail }) => {
  const val = env[key] || '';
  const isOk = ok(val);
  const failMsg = fail?.(val);
  const warnMsg = warn?.(val);

  if (failMsg) {
    console.log(`❌ ${key}\n   ${failMsg}\n   → ${msg}\n`);
    allOk = false;
  } else if (!isOk) {
    console.log(`❌ ${key} = "${val.slice(0, 30)}..."\n   → ${msg}\n`);
    allOk = false;
  } else if (warnMsg) {
    console.log(`✅ ${key} ← set\n   ${warnMsg}\n`);
  } else {
    const preview = val.length > 30 ? val.slice(0, 15) + '...' + val.slice(-10) : val;
    console.log(`✅ ${key} = "${preview}"\n`);
  }
});

if (allOk) {
  console.log('🎉 All environment variables look good!\n');
} else {
  console.log('─────────────────────────────────────────');
  console.log('📖 Fix the issues above, then restart: npm run dev');
  console.log('📖 Google setup guide: GOOGLE_OAUTH_SETUP.md\n');
}
