# 🔑 Google OAuth Setup Guide

This guide explains how to enable **Google Login** for Exame Portal.
This setup only needs to be done once.

---

## Step 1 — Open Google Cloud Console

👉 https://console.cloud.google.com

Sign in with your Google account.

---

## Step 2 — Create a New Project

1. Click **"Select a project"** in the top-left corner → **"New Project"**
2. Project name: `Exame Portal`
3. Click **Create**

---

## Step 3 — Configure the OAuth Consent Screen

1. In the left menu, go to **APIs & Services** → **OAuth consent screen**
2. Select User Type: **External** → Click **Create**
3. Fill in the following fields:
   - **App name:** `Exame Portal`
   - **User support email:** Your email address
   - **Developer contact email:** Your email address
4. Click **Save and Continue** three times to proceed through all steps
5. Click **Back to Dashboard**

---

## Step 4 — Create OAuth Credentials

1. In the left menu, go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Set **Application type** to: `Web application`
4. Set **Name** to: `Exame Portal Web`
5. Under **Authorized JavaScript origins**, click **+ Add URI** and enter:
   ```
   http://localhost:3000
   ```
6. Under **Authorized redirect URIs**, click **+ Add URI** and enter:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Click **Create**

---

## Step 5 — Copy Your Client ID and Secret

A dialog will appear showing your credentials:
```
Client ID:     xxxxxxxxxxxx.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxxxxx
```

> ⚠️ **Important:** Copy the Client Secret immediately. Google will not show it again after you close this dialog. You can also click **Download JSON** to save a copy.

---

## Step 6 — Add Credentials to .env.local

Open the file `exame-portal/.env.local` and update the following lines:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
```

Replace the placeholder values with your actual credentials.

---

## Step 7 — Restart the Development Server

Stop the running server (press `Ctrl + C` in the terminal), then start it again:

```bash
npm run dev
```

---

## ✅ Testing Google Login

1. Open http://localhost:3000/login in your browser
2. Click the **"Continue with Google"** button
3. Select your Google account and allow access
4. You will be redirected to the registration page to complete your profile

> **Note:** New Google users must complete registration and receive **teacher approval** before they can access the portal.

---

## 🚀 Deploying to Production

When deploying to a live server, update `.env.local` with your production URL:

```env
NEXTAUTH_URL=https://yourdomain.com
```

Then, in the Google Cloud Console, add your production domain to both:
- **Authorized JavaScript origins:** `https://yourdomain.com`
- **Authorized redirect URIs:** `https://yourdomain.com/api/auth/callback/google`

---

## ❓ Common Errors & Solutions

| Error Message            | Cause                                          | Solution                                                   |
|--------------------------|------------------------------------------------|------------------------------------------------------------|
| `redirect_uri_mismatch`  | Redirect URI not added correctly in Step 4     | Go to Credentials → edit your OAuth client → verify the redirect URI is exactly `http://localhost:3000/api/auth/callback/google` |
| `Access blocked`         | Your Google account is not in the test users list | Go to OAuth consent screen → Test users → add your email  |
| `invalid_client`         | Client ID or Secret is incorrect               | Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` match exactly what is shown in Google Cloud Console |
| `Configuration` error    | Credentials not set in `.env.local`            | Make sure both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are filled in and the server has been restarted |

---

*Exame Portal v1.0.0 — Google OAuth Setup Guide*
