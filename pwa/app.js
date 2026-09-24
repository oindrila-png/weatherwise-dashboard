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
const weather = { temperature: 28, humidity: 68, wind: 3.2 };
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

function checkWeather() {
  const city = $("city").value.trim();
  if (!city) {
    $("status").textContent = "Enter a city name.";
    return;
  }
  $("location").textContent = city;
  $("status").textContent = "Demo weather displayed. Open the full dashboard for live conditions.";
  updateActivity();
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
    $("status").textContent = "Offline support could not be enabled in this browser.";
  });
}

$("check-weather").addEventListener("click", checkWeather);
$("activity").addEventListener("change", updateActivity);
$("save-search").addEventListener("click", async () => {
  if (!supabaseClient) {
    $("status").textContent = "Database is not connected yet. Complete the Supabase setup first.";
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
  $("status").textContent = error
    ? `Could not save plan: ${error.message}`
    : "Activity plan saved successfully.";
});
updateActivity();
