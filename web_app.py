from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import requests
import streamlit as st
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

st.set_page_config(page_title="WeatherWise", page_icon="🌤️", layout="wide")

@dataclass
class Weather:
    city: str
    country: str
    temperature: float
    humidity: int
    wind: float
    condition: str
    description: str


def live_weather(city: str) -> Weather:
    key = os.getenv("OPENWEATHER_API_KEY", "").strip()
    if not key:
        raise ValueError("OPENWEATHER_API_KEY is not configured.")
    response = requests.get("https://api.openweathermap.org/data/2.5/weather", params={"q": city, "appid": key, "units": "metric"}, timeout=10)
    if response.status_code in (401, 403):
        raise ValueError("The OpenWeatherMap API key was rejected.")
    if response.status_code == 404:
        raise ValueError(f"City not found: {city}")
    response.raise_for_status()
    item = response.json()
    return Weather(item["name"], item.get("sys", {}).get("country", ""), float(item["main"]["temp"]), int(item["main"]["humidity"]), float(item.get("wind", {}).get("speed", 0)), item["weather"][0]["main"], item["weather"][0]["description"].capitalize())


def history() -> pd.DataFrame:
    path = Path("data/historical_weather.csv")
    if path.exists():
        data = pd.read_csv(path)
        needed = {"date", "temperature_c", "humidity_pct", "wind_speed_mps", "rainfall_mm"}
        if needed.issubset(data.columns):
            data["date"] = pd.to_datetime(data["date"], errors="coerce")
            return data.dropna().sort_values("date")
    dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=365, freq="D")
    day = dates.dayofyear.to_numpy()
    rng = np.random.default_rng(42)
    seasonal = 12 * np.sin(2 * math.pi * (day - 80) / 365)
    humidity = np.clip(65 - seasonal * .7 + rng.normal(0, 7, len(dates)), 25, 98)
    wind = np.clip(rng.normal(3.5, 1.2, len(dates)), .1, 15)
    rain = np.clip(rng.gamma(1.2, 2, len(dates)) * humidity / 100, 0, None)
    temperature = 20 + seasonal - .06 * (humidity - 65) - .35 * wind + rng.normal(0, 1.8, len(dates))
    data = pd.DataFrame({"date": dates, "temperature_c": temperature, "humidity_pct": humidity, "wind_speed_mps": wind, "rainfall_mm": rain})
    path.parent.mkdir(exist_ok=True)
    data.to_csv(path, index=False)
    return data


def model_forecast(days: int):
    data = history().copy()
    data["day_sin"] = np.sin(2 * np.pi * data.date.dt.dayofyear / 365.25)
    data["day_cos"] = np.cos(2 * np.pi * data.date.dt.dayofyear / 365.25)
    features = ["humidity_pct", "wind_speed_mps", "rainfall_mm", "day_sin", "day_cos"]
    train_x, test_x, train_y, test_y = train_test_split(data[features], data.temperature_c, test_size=.2, random_state=42)
    model = LinearRegression().fit(train_x, train_y)
    predictions = model.predict(test_x)
    future_dates = pd.date_range(data.date.max() + pd.Timedelta(days=1), periods=days)
    recent = data.tail(30)
    future = pd.DataFrame({"date": future_dates, "humidity_pct": recent.humidity_pct.median(), "wind_speed_mps": recent.wind_speed_mps.median(), "rainfall_mm": recent.rainfall_mm.median()})
    future["day_sin"] = np.sin(2 * np.pi * future.date.dt.dayofyear / 365.25)
    future["day_cos"] = np.cos(2 * np.pi * future.date.dt.dayofyear / 365.25)
    future["predicted_temperature_c"] = model.predict(future[features])
    data["model_temperature_c"] = model.predict(data[features])
    return data, future, mean_absolute_error(test_y, predictions), r2_score(test_y, predictions)


def activity_score(activity: str, weather: Weather):
    rules = {"Walking": (15, 30, 8, 85), "Running": (10, 25, 7, 80), "Cycling": (12, 28, 9, 80), "Outdoor sports": (14, 28, 8, 80), "Photography": (12, 32, 10, 85), "Gardening": (15, 30, 8, 85), "Travel": (12, 32, 10, 90), "Outdoor event": (18, 30, 7, 75)}
    low, high, max_wind, max_humidity = rules[activity]
    score = 100
    reasons = []
    if not low <= weather.temperature <= high: score -= min(35, abs(weather.temperature - (low if weather.temperature < low else high)) * 3); reasons.append("Temperature is outside the preferred range.")
    else: reasons.append("Temperature is comfortable.")
    if weather.wind > max_wind: score -= min(20, (weather.wind - max_wind) * 4); reasons.append("Wind may be uncomfortable.")
    else: reasons.append("Wind speed is manageable.")
    if weather.humidity > max_humidity: score -= min(15, (weather.humidity - max_humidity) * .6); reasons.append("High humidity may cause discomfort.")
    score = max(0, min(100, int(score)))
    rating = "Excellent" if score >= 90 else "Very good" if score >= 75 else "Good with caution" if score >= 60 else "Not ideal" if score >= 40 else "Avoid if possible"
    return score, rating, reasons

st.markdown("# 🌤️ WeatherWise")
st.caption("Live conditions, machine-learning forecasts, and practical activity recommendations.")
if "weather" not in st.session_state: st.session_state.weather = None

overview, live, planner, forecast_tab, data_tab = st.tabs(["Overview", "Live weather", "Activity planner", "ML forecast", "Data explorer"])
with overview:
    st.info("Choose Live weather to fetch current conditions, then use Activity planner for a personalized recommendation. ML forecast works without an API key.")
    a, b, c = st.columns(3); a.metric("Forecast horizon", "1–30 days"); b.metric("Model", "Linear Regression"); c.metric("Activities", "8")
with live:
    st.subheader("Live weather")
    city = st.text_input("City", placeholder="Mumbai, London, New York")
    if st.button("Get current weather", type="primary"):
        try: st.session_state.weather = live_weather(city.strip())
        except Exception as exc: st.error(str(exc))
    w = st.session_state.weather
    if w:
        st.markdown(f"### {w.city}, {w.country}"); st.caption(w.description)
        a, b, c, d = st.columns(4); a.metric("Temperature", f"{w.temperature:.1f} °C"); b.metric("Humidity", f"{w.humidity}%"); c.metric("Wind", f"{w.wind:.1f} m/s"); d.metric("Condition", w.condition)
with planner:
    st.subheader("Activity planner")
    w = st.session_state.weather
    if not w: st.info("Fetch live weather first.")
    else:
        activity = st.selectbox("Activity", ["Walking", "Running", "Cycling", "Outdoor sports", "Photography", "Gardening", "Travel", "Outdoor event"])
        score, rating, reasons = activity_score(activity, w); a, b = st.columns(2); a.metric("Suitability", f"{score}/100"); b.metric("Rating", rating)
        st.success(f"Good time for {activity.lower()}" if score >= 75 else f"Use caution for {activity.lower()}")
        for reason in reasons: st.write("• " + reason)
with forecast_tab:
    st.subheader("Machine-learning forecast")
    days = st.slider("Forecast days", 1, 30, 7)
    if st.button("Train model and forecast", type="primary"):
        try:
            data, future, mae, r2 = model_forecast(days); a, b = st.columns(2); a.metric("Test MAE", f"{mae:.2f} °C"); b.metric("Test R²", f"{r2:.3f}")
            table = future[["date", "predicted_temperature_c"]].copy(); table["date"] = table.date.dt.strftime("%Y-%m-%d"); table["predicted_temperature_c"] = table.predicted_temperature_c.round(2); st.dataframe(table, hide_index=True, use_container_width=True)
            fig, ax = plt.subplots(figsize=(12, 5)); ax.plot(data.date, data.temperature_c, label="Historical"); ax.plot(data.date, data.model_temperature_c, label="Model fit"); ax.plot(future.date, future.predicted_temperature_c, "o-", label="Future forecast"); ax.set_ylabel("Temperature (°C)"); ax.legend(); ax.grid(alpha=.25); st.pyplot(fig); plt.close(fig)
        except Exception as exc: st.error(str(exc))
with data_tab:
    st.subheader("Data explorer"); data = history(); st.dataframe(data.tail(100), hide_index=True, use_container_width=True); st.line_chart(data.set_index("date")[['temperature_c', 'humidity_pct']])

st.caption("Educational forecast only; do not use for safety-critical decisions.")
