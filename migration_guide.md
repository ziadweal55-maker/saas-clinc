# Discovered Migration Blueprint: Railway to Render Free Tier

This custom guide outlines the exact steps to migrate **clinic-api** from Railway to Render's Free Tier, using your active **Neon Database**, **Cloudinary**, and **Vercel** configurations.

---

## 🔍 Discovered Architecture & Configurations

Through discovery, your current environment uses the following setup:
* **Backend API (`clinic-api`)**: Deployed on Railway.
* **Database (PostgreSQL)**: Already hosted on **Neon** (not Railway).
* **Storage**: Hosted on **Cloudinary**.
* **Admin Dashboard**: Hosted on **Vercel**.
* **Patient Portal**: Hosted on **Vercel** (connects directly to **Supabase**).

Since your database is already on Neon, **you do not need to migrate or dump any database data!** You only need to redeploy the Express API server.

---

## Step 1: Deploy `clinic-api` to Render

I have committed and pushed `render.yaml` to your repository. Follow these steps to deploy:

1. Log in to your **Render Dashboard** and click **New > Blueprint**.
2. Connect your GitHub repository (`ziadweal55-maker/saas-clinc`).
3. Render will auto-configure the service. In the setup page, populate the following environment variables using your discovered values:

| Environment Variable | Discovered Value | Source / Action |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://neondb_owner:***@ep-green-wildflower-atimsmqq.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require` | Copy exactly from your API `.env` |
| `DB_SSL` | `true` | Preset in `render.yaml` |
| `JWT_SECRET` | `super_secret_clinic_jwt_passphrase_key_1928374` | Copy or generate new |
| `ADMIN_JWT_SECRET` | `super_admin_dashboard_secret_key_8847291` | Copy or generate new |
| `ALLOWED_ORIGIN` | `.vercel.app` | Preset in `render.yaml` |
| `CLINIC_BASE_DOMAIN` | `clinicmanger-pt.com` | Copy from your API `.env` |
| `RESEND_API_KEY` | `re_Upynvrqz_PNC8sba1AbhvjqZVqo6Sb9nJ` | Copy from your API `.env` |
| `RESEND_FROM_EMAIL` | `onboarding@clinicmanger-pt.com` | Copy from your API `.env` |
| `CLOUDINARY_CLOUD_NAME` | `dlhlrul7q` | Copy from your API `.env` |
| `CLOUDINARY_API_KEY` | `854399468864862` | Copy from your API `.env` |
| `CLOUDINARY_API_SECRET` | `AB0tlL1XfWzY9n3-JH__l4-t0oA` | Copy from your API `.env` |
| `TZ` | `Africa/Cairo` | Preset in `render.yaml` |

4. Click **Apply**. Render will deploy the API and assign a public URL (e.g., `https://clinic-api.onrender.com`).

---

## Step 2: Update the Admin Dashboard in Vercel

Since your `admin-dashboard` makes requests to the Express API, you must update its API address:

1. Log in to your **Vercel Dashboard** and open your **admin-dashboard** project settings.
2. Go to **Settings > Environment Variables**.
3. Update the variable **`VITE_API_URL`**:
   - **Old Value**: Points to your old Railway backend (e.g., `https://clinic-api.up.railway.app/api/v1/admin`)
   - **New Value**: Update to your new Render URL (e.g., `https://<your-render-url>.onrender.com/api/v1/admin`)
4. Go to the **Deployments** tab in Vercel, select your latest deployment, and click **Redeploy** so Vercel builds the dashboard React bundle with the new URL.

---

## Step 3: No Updates Needed for Patient Portal / Supabase / Cloudinary

* **Patient Portal**: The patient portal connects exclusively to Supabase (`csubxhxsspzeioukowta.supabase.co`) and does not send requests to the Express API. Therefore, **no configuration changes are needed** in your Vercel `patient-portal` settings.
* **Cloudinary**: No credentials changes are required in your Cloudinary console.
* **Neon**: No firewall changes are needed.

---

## Step 4: Update Paymob Webhooks (If Active)

If you are processing live payments or trial renewals:
1. Log in to your Paymob dashboard.
2. Update the Webhook transaction URL to target your new Render endpoint:
   - Target: `https://<your-render-url>.onrender.com/api/v1/global/subscriptions/webhook`
