const rules = {
  Walking: [15, 30, 8, 85],
  Running: [10, 25, 7, 80],
  Cycling: [12, 28, 9, 80],
  "Outdoor sports": [14, 28, 8, 80],
  Photography: [12, 32, 10, 85],
  Gardening: [15, 30, 8, 85],
  Travel: [12, 32, 10, 90],
  "Outdoor event": [18, 30, 7, 75],
  Yoga: [16, 30, 6, 80], "Bird watching": [12, 30, 7, 85],
  Fishing: [12, 30, 8, 85], Picnic: [18, 30, 6, 80],
  Swimming: [22, 35, 8, 75], "Dog walking": [12, 30, 8, 85],
  Commute: [8, 34, 12, 95], Shopping: [10, 35, 14, 95],
  Laundry: [18, 34, 10, 70], Farming: [12, 34, 10, 85],
  Construction: [10, 32, 9, 75], Stargazing: [5, 30, 5, 70],
};

const bestTimes = {
  Walking: "06:30–09:00 or 17:00–19:00", Running: "05:30–08:00",
  Cycling: "06:00–09:00 or 16:30–19:00", "Outdoor sports": "07:00–10:00",
  Photography: "06:00–09:00 or 16:00–18:30", Gardening: "06:00–09:00",
  Travel: "08:00–18:00", "Outdoor event": "17:00–20:00", Yoga: "06:00–08:00",
  "Bird watching": "05:30–08:30", Fishing: "05:30–09:00", Picnic: "11:00–16:00",
  Swimming: "10:00–16:00", "Dog walking": "06:30–09:00 or 17:00–19:00",
  Commute: "07:00–09:00 or 17:00–19:00", Shopping: "10:00–18:00",
  Laundry: "10:00–15:00", Farming: "06:00–10:00", Construction: "07:00–16:00",
  Stargazing: "21:00–23:30",
};

let deferredInstallPrompt;
const demoWeather = {
  name: "Chennai", latitude: 13.08, longitude: 80.27, temperature: 28,
  humidity: 68, wind: 3.2, rain: 10, precipitation: 0, aqi: 42,
  weatherCode: 1, dailyMax: [31, 32, 33], dailyRain: [0, 2, 4],
};
let weather = { ...demoWeather };
const $ = (id) => document.getElementById(id);
const HISTORY_KEY = "weatherwise-weather-history";
const CHECKLIST_KEY = "weatherwise-emergency-checklist";
const CHALLENGE_KEY = "weatherwise-challenge";

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
  $("best-time").textContent = bestTimes[activity] || "Check local conditions";
}

function formatTime(value) {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateInsights() {
  const feels = weather.feelsLike ?? weather.temperature + (weather.humidity > 70 ? 2 : 0) - (weather.wind > 5 ? 1 : 0);
  const uv = weather.uvIndex ?? null;
  const comfort = Math.max(0, Math.min(100, Math.round(100 - Math.abs(feels - 23) * 2 - Math.max(0, weather.wind - 8) * 2 - (weather.rain >= 20 ? 15 : 0) - (weather.aqi > 100 ? 15 : 0))));
  const rainRisk = weather.rain >= 60 ? "rain & shelter" : weather.rain >= 20 ? "a passing shower" : "dry spells";
  const profile = $("health-mode").value;
  const health = profile === "sensitive" && (feels >= 30 || weather.aqi > 100)
    ? "Keep exertion light, seek shade, and consider an indoor plan."
    : profile === "child" && (feels >= 32 || weather.rain >= 60)
      ? "Keep outings short, pack a change of clothes, and stay close to shelter."
      : profile === "senior" && (feels >= 30 || feels <= 12)
        ? "Prefer a gentler window and take regular breaks in a comfortable place."
        : "Conditions look manageable; take normal breaks and listen to your body.";
  setText("feels-like", `${Math.round(feels)}°C`);
  setText("uv-index", uv == null ? "Not available" : `${Math.round(uv)} (${uv >= 6 ? "high" : uv >= 3 ? "moderate" : "low"})`);
  setText("comfort-score", `${comfort}`);
  setText("hydration-tip", feels >= 30 || weather.humidity >= 75 ? "Drink often" : "Water nearby");
  setText("clothing-tip", feels >= 30 ? "Light & breathable" : feels <= 16 ? "Layer up" : "Light layers");
  setText("health-advisory", "");
  $("health-advisory").innerHTML = `<strong>Health-aware mode</strong><span>${health}</span>`;
  setText("daily-story", `${weather.name} is offering ${weatherLabel(weather.weatherCode).toLowerCase()} around ${Math.round(weather.temperature)}°C. Your best plan is to enjoy the ${rainRisk} and keep ${feels >= 30 ? "water and shade" : "a light layer"} close.`);
  setText("briefing-window", bestTimes[$("activity").value] || "Flexible");
  setText("briefing-watch", weather.aqi > 100 ? "Air quality" : weather.rain >= 20 ? "Rain chance" : feels >= 32 ? "Heat" : "Wind & sun");
  setText("briefing-mood", comfort >= 75 ? "Easy-going" : comfort >= 50 ? "Plan lightly" : "Take it gently");
  setText("briefing-badge", `${comfort}/100 comfort`);
  renderPacking();
  renderAstronomy();
}

function renderPacking() {
  const items = ["Water bottle", weather.rain >= 20 ? "Umbrella or rain shell" : "Sunglasses", weather.temperature <= 18 ? "Warm layer" : "Breathable top", "Phone charger", "Any required medicines"];
  $("packing-list").innerHTML = items.map((item, index) => `<label><input type="checkbox" data-pack="${index}"> ${item}</label>`).join("");
}

function renderAstronomy() {
  const sunrise = weather.sunrise?.[0];
  const sunset = weather.sunset?.[0];
  setText("sunrise", formatTime(sunrise));
  setText("sunset", formatTime(sunset));
  setText("golden-hour", sunrise && sunset ? `${formatTime(new Date(new Date(sunset).getTime() - 60 * 60 * 1000))}–${formatTime(sunset)}` : "Unavailable");
  const phase = weather.moonPhase || "Moon data unavailable";
  setText("moon-phase", phase);
  setText("astronomy-date", sunrise ? "Today" : "Fallback");
}

function renderEmergencyChecklist() {
  const defaults = ["Check official weather alerts", "Charge phone and carry a power bank", "Pack water and essential medicines", "Share your route with someone", "Know the nearest safe shelter"];
  const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "[]");
  $("emergency-list").innerHTML = defaults.map((item, index) => `<label><input type="checkbox" data-emergency="${index}" ${saved[index] ? "checked" : ""}> ${item}</label>`).join("");
  $("emergency-list").querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    const state = [...$("emergency-list").querySelectorAll("input")].map((box) => box.checked);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
  }));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  $("weather-history").innerHTML = history.length ? `<p class="eyebrow">Recent weather history</p>${history.slice().reverse().map((item) => `<article class="history-note"><time>${new Date(item.date).toLocaleString()} · ${item.city}</time><span>${Math.round(item.temperature)}°C · ${item.condition} · comfort ${item.comfort}/100</span></article>`).join("")}` : "";
}

function renderChallenge() {
  const options = [
    { label: "Take water and choose a cooler time", answer: "warm" },
    { label: "Wear a heavy winter coat", answer: "cold" },
    { label: "Expect a snowstorm", answer: "snow" },
  ];
  const answer = weather.temperature >= 30 ? "warm" : weather.temperature <= 16 ? "cold" : "mild";
  const prompt = answer === "warm" ? "It feels warm today. What is the wisest plan?" : answer === "cold" ? "It feels cool today. What is the wisest plan?" : "The temperature is comfortable today. What is a good plan?";
  $("challenge-question").textContent = `${prompt} (${Math.round(weather.temperature)}°C)`;
  const choices = answer === "mild" ? [
    { label: "Enjoy normal outdoor plans", answer: "mild" },
    ...options.slice(0, 2),
  ] : options;
  $("challenge-options").innerHTML = choices.map((choice) => `<button type="button" data-challenge-answer="${choice.answer}">${choice.label}</button>`).join("");
  const state = JSON.parse(localStorage.getItem(CHALLENGE_KEY) || '{"date":"","score":0,"streak":0,"best":0}');
  $("challenge-score").textContent = `${state.score} points`;
  $("challenge-streak").textContent = `${state.streak} day${state.streak === 1 ? "" : "s"}`;
  $("challenge-best").textContent = state.best;
  const today = new Date().toISOString().slice(0, 10);
  if (state.date === today) {
    $("challenge-feedback").textContent = "Today's challenge is complete. Come back tomorrow for a new one!";
    $("challenge-options").querySelectorAll("button").forEach((button) => { button.disabled = true; });
  } else {
    $("challenge-options").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
      const correct = button.dataset.challengeAnswer === answer;
      const nextState = { date: today, score: state.score + (correct ? 10 : 0), streak: state.streak + 1, best: Math.max(state.best, state.score + (correct ? 10 : 0)) };
      localStorage.setItem(CHALLENGE_KEY, JSON.stringify(nextState));
      $("challenge-feedback").textContent = correct ? "Great thinking! You earned 10 points." : `Good try! The best answer was: ${choices.find((choice) => choice.answer === answer).label}.`;
      renderChallenge();
    }));
  }
}

function setText(id, value) { $(id).textContent = value; }
function setStatus(value) {
  setText("status", value);
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

function updateTheme() {
  const hour = new Date().getHours();
  const theme = hour >= 5 && hour < 11 ? "morning" : hour >= 11 && hour < 17 ? "noon" : hour >= 17 && hour < 20 ? "evening" : "night";
  document.body.dataset.theme = theme;
  const details = {
    morning: ["Morning glow", "A soft sunrise palette for a calm start.", "Sunrise"],
    noon: ["Noon clarity", "A bright, focused palette that keeps outdoor plans easy to read.", "Peak daylight"],
    evening: ["Golden hour", "A warm sunset palette for relaxed travel and outdoor moments.", "Sunset"],
    night: ["Midnight calm", "A low-glare starry palette designed for comfortable night viewing.", "Night mode"],
  }[theme];
  setText("theme-title", details[0]);
  setText("theme-description", details[1]);
  setText("theme-badge", details[2]);
}

function addAssistantMessage(text, type) {
  const item = document.createElement("div");
  item.className = `assistant-message ${type}`;
  const name = document.createElement("strong");
  name.textContent = type === "user" ? "You" : "Skyla";
  const content = document.createElement("span");
  content.textContent = text;
  item.append(name, content);
  $("assistant-messages").appendChild(item);
  item.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function answerQuestion(question) {
  const text = question.toLowerCase();
  const rainToday = Number(weather.rain || 0);
  const activity = $("activity").value;
  const score = calculateScore(activity);
  if (text.includes("pack") || text.includes("bring")) return `Pack ${weather.temperature >= 30 ? "breathable clothes and water" : "a light layer"}, ${weather.rain >= 20 ? "an umbrella or rain shell" : "sunglasses"}, and any medicines you need.`;
  if (text.includes("golden") || text.includes("sunset") || text.includes("sunrise")) return `Sunrise is ${formatTime(weather.sunrise?.[0])} and sunset is ${formatTime(weather.sunset?.[0])}. Golden hour begins about an hour before sunset.`;
  if (text.includes("health") || text.includes("sensitive")) return $("health-advisory").querySelector("span").textContent;
  if (text.includes("travel") || text.includes("destination") || text.includes("depart")) return `${$("departure-guidance").textContent}. ${$("destination-weather").textContent}.`;
  if (text.includes("emergency") || text.includes("safe")) return "Use the emergency checklist, check official local alerts, and do not travel through flooded roads.";
  if (text.includes("challenge") || text.includes("quiz") || text.includes("game")) return "Today's Skyla challenge is on the page. Choose the answer that best matches the current weather to earn points.";
  if (text.includes("rain") || text.includes("umbrella")) {
    return rainToday >= 10 || weather.rain >= 60
      ? `Rain is a real possibility in ${weather.name}. Carry an umbrella and avoid low-lying roads.`
      : `Rain risk is currently low in ${weather.name}. I would still keep a light layer nearby if you are out for several hours.`;
  }
  if (text.includes("wear") || text.includes("clothes") || text.includes("dress")) {
    if (weather.temperature >= 32) return `It is warm at ${Math.round(weather.temperature)}°C. Choose light, breathable clothing, sunglasses, and water.`;
    if (weather.temperature <= 16) return `It is cool at ${Math.round(weather.temperature)}°C. Wear a light jacket and closed shoes.`;
    return `A comfortable outfit should work at ${Math.round(weather.temperature)}°C. Bring a light layer because conditions can change.`;
  }
  if (text.includes("walk") || text.includes("run") || text.includes("outdoor") || text.includes("go out")) {
    return `${activity} suitability is ${score.score}/100 (${score.rating}). The best suggested time is ${bestTimes[activity]}.`;
  }
  if (text.includes("air") || text.includes("aqi") || text.includes("pollution")) {
    return weather.aqi == null ? "Air-quality data is not available yet." : `The current AQI is ${Math.round(weather.aqi)}. ${weather.aqi <= 50 ? "Air quality is good for most people." : weather.aqi <= 100 ? "Sensitive people should consider shorter intense activities." : "Limit strenuous outdoor activity and consider a mask."}`;
  }
  if (text.includes("temperature") || text.includes("hot") || text.includes("cold")) {
    return `It is ${Math.round(weather.temperature)}°C in ${weather.name}, with ${Math.round(weather.humidity)}% humidity and wind around ${Number(weather.wind).toFixed(1)} m/s.`;
  }
  if (text.includes("hello") || text.includes("hi")) return "Hello! Ask me about rain, clothing, air quality, temperature, or today's best activity time.";
  return `In ${weather.name}, conditions are ${weatherLabel(weather.weatherCode).toLowerCase()} at ${Math.round(weather.temperature)}°C. Try asking “Can I go for a walk now?”`;
}

function askSkyla(question) {
  const trimmed = question.trim();
  if (!trimmed) return;
  addAssistantMessage(trimmed, "user");
  window.setTimeout(() => addAssistantMessage(answerQuestion(trimmed), "assistant"), 220);
}

function formatHour(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric" });
}

function renderHourly() {
  const list = $("hourly-list");
  if (!weather.hourly?.time?.length) {
    list.innerHTML = '<p class="muted">Hourly data is available after a live weather check.</p>';
    return;
  }
  const now = Date.now();
  let startIndex = weather.hourly.time.findIndex((time) => new Date(time).getTime() >= now);
  if (startIndex < 0) startIndex = 0;
  const endIndex = Math.min(startIndex + 24, weather.hourly.time.length);
  list.innerHTML = weather.hourly.time.slice(startIndex, endIndex).map((time, offset) => {
    const index = startIndex + offset;
    const code = weather.hourly.codes[index];
    const icon = code >= 95 ? "⛈️" : [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) ? "🌧️" : [2, 3].includes(code) ? "☁️" : "☀️";
    const label = offset === 0 ? "Now" : formatHour(time);
    const rain = Math.round(weather.hourly.rain[index] || 0);
    return `<div class="hour-item ${offset === 0 ? "current-hour" : ""}"><strong>${label}</strong><span class="weather-icon" aria-hidden="true">${icon}</span><b>${Math.round(weather.hourly.temperatures[index])}°C</b><small>${rain}% chance of rain</small></div>`;
  }).join("");
}

function renderDaily() {
  const list = $("daily-list");
  if (!weather.daily?.time?.length) {
    list.innerHTML = '<p class="muted">Daily history and forecast are available after a live weather check.</p>';
    return;
  }
  list.innerHTML = weather.daily.time.map((date, index) => {
    const past = index < 10;
    const today = index === 10;
    const code = weather.daily.codes[index];
    const icon = code >= 95 ? "⛈️" : [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code) ? "🌧️" : [2, 3].includes(code) ? "☁️" : "☀️";
    const dayLabel = today ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const stateLabel = today ? "Now" : past ? "Past" : "Next";
    return `<div class="day-item ${past ? "past" : today ? "today" : "future"}"><span class="day-name">${dayLabel}</span><b>${stateLabel}</b><span class="weather-icon" aria-hidden="true">${icon}</span><strong>${Math.round(weather.daily.max[index])}° / ${Math.round(weather.daily.min[index])}°C</strong><small>${Math.round(weather.daily.rain[index] || 0)} mm rain</small></div>`;
  }).join("");
  const todayCard = list.querySelector(".today");
  if (todayCard) window.requestAnimationFrame(() => todayCard.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" }));
}

function previewWeather(kind) {
  const previews = {
    rain: { weatherCode: 63, temperature: 24, rain: 80, precipitation: 8, personality: "Rain animation preview" },
    sun: { weatherCode: 0, temperature: 31, rain: 0, precipitation: 0, personality: "Sun animation preview" },
    storm: { weatherCode: 95, temperature: 27, rain: 70, precipitation: 12, personality: "Storm animation preview" },
  };
  weather = { ...weather, ...previews[kind], name: "Animation preview" };
  renderWeather("demo");
  setStatus(`${kind[0].toUpperCase()}${kind.slice(1)} animation preview is active.`);
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
  const feelsLike = weather.feelsLike ?? weather.temperature + (weather.humidity > 70 ? 2 : 0) - (weather.wind > 5 ? 1 : 0);
  setText("feels-like-top", `${Math.round(feelsLike)}°C`);
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
  renderHourly();
  renderDaily();
  updateInsights();
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const comfort = Math.max(0, Math.min(100, Math.round(100 - Math.abs((weather.feelsLike ?? weather.temperature) - 23) * 2)));
  history.push({ date: new Date().toISOString(), city: weather.name, temperature: weather.temperature, condition: weatherLabel(weather.weatherCode), comfort });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
  renderHistory();
  renderChallenge();
  updateTheme();
}

async function planDestination() {
  const destination = $("destination").value.trim();
  if (!destination) return;
  $("travel-result").textContent = "Looking up destination weather…";
  try {
    const placeResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`);
    if (!placeResponse.ok) throw new Error("Destination lookup failed");
    const result = await placeResponse.json();
    if (!result.results?.length) throw new Error("Destination not found");
    const place = result.results[0];
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,precipitation&hourly=precipitation_probability&timezone=auto`);
    if (!response.ok) throw new Error("Destination forecast unavailable");
    const forecast = await response.json();
    const current = forecast.current || {};
    const rainChance = Math.max(...(forecast.hourly?.precipitation_probability || [0]).slice(0, 8));
    setText("destination-weather", `${Math.round(current.temperature_2m ?? 0)}°C · ${weatherLabel(current.weather_code)} · ${rainChance}% rain`);
    setText("departure-guidance", weather.rain >= 20 ? "Leave extra time for weather" : "Current departure looks smooth");
    $("travel-result").textContent = `Planning ${[place.name, place.country_code].filter(Boolean).join(", ")}. ${rainChance >= 60 ? "Pack rain protection." : "Conditions look manageable."}`;
  } catch (error) {
    $("travel-result").textContent = `Travel lookup unavailable (${error.message}). You can still use the local plan.`;
  }
}

async function getLiveWeather(city) {
  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  if (!geoResponse.ok) throw new Error("Location search failed");
  const geo = await geoResponse.json();
  if (!geo.results || !geo.results.length) throw new Error("City not found");
  const place = geo.results[0];
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&past_days=10&forecast_days=10&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code,uv_index&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,sunrise,sunset,uv_index_max&timezone=auto`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=us_aqi&timezone=auto`;
  const [forecastResponse, airResponse] = await Promise.all([fetch(forecastUrl), fetch(airUrl)]);
  if (!forecastResponse.ok) throw new Error("Forecast unavailable");
  const forecast = await forecastResponse.json();
  const air = airResponse.ok ? await airResponse.json() : {};
  const current = forecast.current || {};
  setText("timezone-label", forecast.timezone || "Local time");
  return {
    name: [place.name, place.country_code].filter(Boolean).join(", "),
    latitude: place.latitude, longitude: place.longitude,
    temperature: current.temperature_2m ?? demoWeather.temperature,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m ?? demoWeather.humidity,
    wind: (current.wind_speed_10m ?? 0) / 3.6,
    precipitation: current.precipitation ?? 0,
    rain: (forecast.daily?.precipitation_sum || [0])[0] ?? 0,
    aqi: air.current?.us_aqi ?? null,
    weatherCode: current.weather_code ?? 0,
    uvIndex: current.uv_index,
    sunrise: forecast.daily?.sunrise || [],
    sunset: forecast.daily?.sunset || [],
    moonPhase: "Use the clear sky to spot the moon",
    dailyMax: forecast.daily?.temperature_2m_max || [],
    dailyRain: forecast.daily?.precipitation_sum || [],
    hourly: {
      time: forecast.hourly?.time || [], temperatures: forecast.hourly?.temperature_2m || [],
      rain: forecast.hourly?.precipitation_probability || [], codes: forecast.hourly?.weather_code || [],
    },
    daily: {
      time: forecast.daily?.time || [], max: forecast.daily?.temperature_2m_max || [],
      min: forecast.daily?.temperature_2m_min || [], rain: forecast.daily?.precipitation_sum || [],
      codes: forecast.daily?.weather_code || [],
    },
  };
}

async function useCurrentLocation() {
  if (!navigator.geolocation) { setStatus("Location is not supported. Enter a city instead."); return; }
  setStatus("Requesting your location permission…");
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      weather = await getLiveWeatherByCoordinates(coords.latitude, coords.longitude);
      renderWeather("live");
      setStatus("Using your current location for live weather and AQI.");
    } catch (error) { setStatus(`Could not load your location (${error.message}). Enter a city instead.`); }
  }, () => setStatus("Location permission was not granted. Enter a city instead."));
}

async function getLiveWeatherByCoordinates(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&past_days=10&forecast_days=10&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code,uv_index&hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max,sunrise,sunset,uv_index_max&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather service unavailable");
  const forecast = await response.json();
  const air = await (await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi&timezone=auto`)).json();
  return mapForecast(forecast, air, "Current location", latitude, longitude);
}

function mapForecast(forecast, air, name, latitude, longitude) {
  const current = forecast.current || {};
  return {
    name, latitude, longitude, temperature: current.temperature_2m ?? 28, feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m ?? 68, wind: (current.wind_speed_10m ?? 0) / 3.6,
    precipitation: current.precipitation ?? 0, rain: (forecast.daily?.precipitation_sum || [0])[10] ?? 0,
    aqi: air.current?.us_aqi ?? null, weatherCode: current.weather_code ?? 0, uvIndex: current.uv_index,
    sunrise: forecast.daily?.sunrise || [], sunset: forecast.daily?.sunset || [],
    moonPhase: "Use the clear sky to spot the moon",
    dailyMax: forecast.daily?.temperature_2m_max || [],
    dailyRain: forecast.daily?.precipitation_sum || [],
    hourly: { time: forecast.hourly?.time || [], temperatures: forecast.hourly?.temperature_2m || [], rain: forecast.hourly?.precipitation_probability || [], codes: forecast.hourly?.weather_code || [] },
    daily: { time: forecast.daily?.time || [], max: forecast.daily?.temperature_2m_max || [], min: forecast.daily?.temperature_2m_min || [], rain: forecast.daily?.precipitation_sum || [], codes: forecast.daily?.weather_code || [] },
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
$("use-location").addEventListener("click", useCurrentLocation);
$("live-mode").addEventListener("change", checkWeather);
$("activity").addEventListener("change", updateActivity);
$("health-mode").addEventListener("change", updateInsights);
$("check-destination").addEventListener("click", planDestination);
const skylaToggle = $("skyla-toggle");
const skylaPanel = $("skyla-panel");
skylaToggle.addEventListener("click", () => {
  const isOpen = skylaToggle.getAttribute("aria-expanded") === "true";
  skylaToggle.setAttribute("aria-expanded", String(!isOpen));
  skylaPanel.hidden = isOpen;
  skylaToggle.closest(".assistant-card").classList.toggle("is-open", !isOpen);
  if (!isOpen) $("assistant-input").focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && skylaToggle.getAttribute("aria-expanded") === "true") {
    skylaToggle.setAttribute("aria-expanded", "false");
    skylaPanel.hidden = true;
  }
});
document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => askSkyla(button.dataset.question));
});
$("assistant-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("assistant-input");
  askSkyla(input.value);
  input.value = "";
});
document.querySelectorAll("[data-preview]").forEach((button) => {
  button.addEventListener("click", () => previewWeather(button.dataset.preview));
});
renderEmergencyChecklist();
renderHistory();
renderChallenge();
renderWeather("live");
checkWeather();
setInterval(updateTheme, 60000);
