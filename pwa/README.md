# WeatherWise PWA

This is a separate installable companion app. The existing Streamlit WeatherWise
website is unchanged.

## Test locally

From the `pwa` folder, run a local static server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

The app uses the public, keyless Open-Meteo geocoding, forecast, and air-quality
APIs for live mode. It automatically falls back to demo data when a request
fails, so the planner remains usable offline or during API outages. The alert
cards are advisory heuristics, not official emergency warnings; follow local
authority guidance for cyclone, flood, heat, storm, and pollution decisions.

The mode switch controls live/demo behavior. Live weather includes current
temperature, humidity, wind, precipitation, a three-day forecast summary, and
US AQI. Animated rain, sun/heat, clouds, snow, and storm effects are rendered
locally with CSS and DOM (no external UI packages).

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
