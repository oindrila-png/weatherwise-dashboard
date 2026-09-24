# WeatherWise PWA

This is a separate installable companion app. The existing Streamlit WeatherWise
website is unchanged.

## Test locally

From the `pwa` folder, run a local static server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

The app uses demo weather values in this first safe version. Do not place the
OpenWeatherMap API key in browser JavaScript: it would be visible to every
visitor. Live weather will be connected through a secure backend in the next
phase.

## Connect Supabase

1. In Supabase, open **SQL Editor**, paste `supabase-schema.sql`, and click
   **Run**.
2. Copy `supabase-config.example.js` to `supabase-config.js`.
3. In Supabase, open **Project Settings -> API** and copy the **Project URL**
   and the publishable/anon key into `supabase-config.js`.
4. Never use or paste the `service_role` key into this folder.
5. Restart the local server and click **Save this plan** in the PWA.

## Publish free

Upload the contents of this folder to a separate GitHub Pages repository, or
deploy the folder with Netlify or Vercel. HTTPS is required for installation,
except on localhost.
