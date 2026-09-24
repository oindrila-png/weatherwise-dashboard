const rules = {
  Walking: [15, 30, 8, 85],
  Running: [10, 25, 7, 80],
  Cycling: [12, 28, 9, 80],
  "Outdoor sports": [14, 28, 8, 80],
  Photography: [12, 32, 10, 85],
  Gardening: [15, 30, 8, 85],
  Travel: [12, 32, 10, 90],
  "Outdoor event": [18, 30, 7, 75],
};

let deferredInstallPrompt;
const demoWeather = {
  name: "Chennai", latitude: 13.08, longitude: 80.27, temperature: 28,
  humidity: 68, wind: 3.2, rain: 10, precipitation: 0, aqi: 42,
  weatherCode: 1, dailyMax: [31, 32, 33], dailyRain: [0, 2, 4],
};
let weather = { ...demoWeather };
const $ = (id) => document.getElementById(id);
const supabaseClient = window.SUPABASE_CONFIG && window.supabase
  ? window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    )
  : null;

function calculateScore(activity) {
  const [minimum, maximum, maxWind, maxHumidity] = rules[activity];
  let score = 100;
  if (weather.temperature < minimum || weather.temperature > maximum) {
    score -= Math.min(35, Math.abs(weather.temperature - (weather.temperature < minimum ? minimum : maximum)) * 3);
  }
  if (weather.wind > maxWind) score -= Math.min(20, (weather.wind - maxWind) * 4);
  if (weather.humidity > maxHumidity) score -= Math.min(15, (weather.humidity - maxHumidity) * 0.6);
  if (weather.precipitation > 2 || weather.rain > 60) score -= 20;
  if (weather.aqi > 100) score -= Math.min(20, (weather.aqi - 100) * 0.15);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const rating = score >= 90 ? "Excellent" : score >= 75 ? "Very good" : score >= 60 ? "Good with caution" : score >= 40 ? "Not ideal" : "Avoid if possible";
  return { score, rating };
}

function updateActivity() {
  const activity = $("activity").value;
  const result = calculateScore(activity);
  $("score").textContent = result.score;
  $("rating").textContent = result.rating;
  $("recommendation").textContent = result.score >= 75
    ? `Good conditions for ${activity.toLowerCase()}. Stay hydrated.`
    : `Use caution for ${activity.toLowerCase()} and check conditions before leaving.`;
}

function setText(id, value) { $(id).textContent = value; }
function setStatus(value) {
  setText("status", value);
  setText("save-status", value);
}

function weatherLabel(code) {
  if ([95, 96, 99].includes(code)) return "Stormy conditions";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow in the forecast";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rainy conditions";
  if ([2, 3].includes(code)) return "Cloudy skies";
  return "Comfortable outdoor day";
}

function updateEffects() {
  const scene = $("scene");
  const code = weather.weatherCode || 0;
  const kind = code >= 95 ? "storm" : [71, 73, 75, 77, 85, 86].includes(code) ? "snow" :
    [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) ? "rain" :
    weather.temperature >= 32 ? "heat" : [2, 3].includes(code) ? "clouds" : "sun";
  scene.className = `scene scene-${kind}`;
  scene.innerHTML = Array.from({ length: kind === "sun" || kind === "heat" ? 8 : 18 }, (_, index) =>
    `<i style="--i:${index}"></i>`).join("");
}

function updateAlerts() {
  const alerts = [
    ["cyclone-alert", weather.wind >= 17, "Strong winds detected — postpone exposed coastal plans.", "No cyclone signal in the available forecast."],
    ["storm-alert", [95, 96, 99].includes(weather.weatherCode), "Thunderstorm risk detected — shelter from lightning.", "No thunderstorm signal in the available forecast."],
    ["flood-alert", weather.rain >= 60 || weather.precipitation >= 10, "Heavy rain risk — avoid low-lying and flooded roads.", "No heavy-rain signal in the available forecast."],
    ["heat-alert", (weather.dailyMax || []).filter((value) => value >= 35).length >= 2 || weather.temperature >= 38, "Heatwave conditions possible — hydrate and seek shade.", "No heatwave signal in the available forecast."],
    ["aqi-alert", weather.aqi > 100, `AQI ${weather.aqi}: limit strenuous outdoor activity and wear a mask.`, `AQI ${weather.aqi ?? "--"}: air quality is suitable for most activities.`],
  ];
  alerts.forEach(([id, active, warning, clear]) => {
    const card = $(id);
    card.classList.toggle("is-alert", active);
    card.querySelector("p").textContent = active ? warning : clear;
  });
}

function renderWeather(mode = "live") {
  setText("location", weather.name);
  setText("temperature", Math.round(weather.temperature));
  setText("humidity", `${Math.round(weather.humidity)}%`);
  setText("wind", `${Number(weather.wind).toFixed(1)} m/s`);
  setText("rain", weather.rain >= 60 ? "High" : weather.rain >= 20 ? "Medium" : "Low");
  setText("aqi", weather.aqi == null ? "--" : Math.round(weather.aqi));
  setText("personality", weatherLabel(weather.weatherCode));
  setText("data-label", mode === "live" ? "Live conditions" : "Demo conditions");
  setText("data-status", mode === "live" ? "Live" : "Demo");
  updateAlerts();
  updateEffects();
  updateActivity();
}

async function getLiveWeather(city) {
  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  if (!geoResponse.ok) throw new Error("Location search failed");
  const geo = await geoResponse.json();
  if (!geo.results || !geo.results.length) throw new Error("City not found");
  const place = geo.results[0];
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max&forecast_days=3&timezone=auto`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=us_aqi&timezone=auto`;
  const [forecastResponse, airResponse] = await Promise.all([fetch(forecastUrl), fetch(airUrl)]);
  if (!forecastResponse.ok) throw new Error("Forecast unavailable");
  const forecast = await forecastResponse.json();
  const air = airResponse.ok ? await airResponse.json() : {};
  const current = forecast.current || {};
  return {
    name: [place.name, place.country_code].filter(Boolean).join(", "),
    latitude: place.latitude, longitude: place.longitude,
    temperature: current.temperature_2m ?? demoWeather.temperature,
    humidity: current.relative_humidity_2m ?? demoWeather.humidity,
    wind: (current.wind_speed_10m ?? 0) / 3.6,
    precipitation: current.precipitation ?? 0,
    rain: (forecast.daily?.precipitation_sum || [0])[0] ?? 0,
    aqi: air.current?.us_aqi ?? null,
    weatherCode: current.weather_code ?? 0,
    dailyMax: forecast.daily?.temperature_2m_max || [],
    dailyRain: forecast.daily?.precipitation_sum || [],
  };
}

async function checkWeather() {
  const city = $("city").value.trim();
  if (!city) { setStatus("Enter a city name."); return; }
  setStatus($("live-mode").checked ? "Finding live weather…" : "Showing demo weather.");
  if (!$("live-mode").checked) {
    weather = { ...demoWeather, name: city };
    renderWeather("demo");
    setStatus("Demo weather displayed. Turn on live mode to use Open-Meteo.");
    return;
  }
  try {
    weather = await getLiveWeather(city);
    renderWeather("live");
    setStatus("Live weather and air quality updated from Open-Meteo.");
  } catch (error) {
    weather = { ...demoWeather, name: city };
    renderWeather("demo");
    setStatus(`Live data unavailable (${error.message}). Showing demo mode instead.`);
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("install").hidden = false;
});

$("install").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("install").hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {
    setStatus("Offline support could not be enabled in this browser.");
  });
}

$("check-weather").addEventListener("click", checkWeather);
$("live-mode").addEventListener("change", checkWeather);
$("activity").addEventListener("change", updateActivity);
$("save-search").addEventListener("click", async () => {
  if (!supabaseClient) {
    setStatus("Database is not connected yet. Complete the Supabase setup first.");
    return;
  }
  const activity = $("activity").value;
  const result = calculateScore(activity);
  const { error } = await supabaseClient.from("weather_plans").insert({
    city: $("city").value.trim(),
    activity,
    temperature_c: weather.temperature,
    humidity_pct: weather.humidity,
    wind_speed_mps: weather.wind,
    suitability_score: result.score,
    rating: result.rating,
  });
  setStatus(error
    ? `Could not save plan: ${error.message}`
    : "Activity plan saved successfully.");
});
renderWeather("live");
checkWeather();
