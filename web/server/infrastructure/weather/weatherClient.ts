// infrastructure.weather — current weather for the delivery advisor (Open-Meteo, free, no key).
// Falls back to a calm simulated sky when the service cannot be reached, so the demo never breaks.
export type Weather = {
  source: "live" | "simulated";
  description: string;
  rainMm: number;
  windKmh: number;
  tempC: number | null;
};

const CODE_TEXT: [number, string][] = [
  [0, "Trời quang"], [3, "Nhiều mây"], [48, "Sương mù"], [57, "Mưa phùn"], [67, "Mưa"], [77, "Tuyết"], [82, "Mưa rào"], [99, "Dông"]
];

const text = (code: number) => (CODE_TEXT.find(([max]) => code <= max) ?? CODE_TEXT[CODE_TEXT.length - 1])[1];

/** Weather around Ha Noi (where the demo hub is). */
export async function currentWeather(): Promise<Weather> {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=20.98&longitude=105.79&current=temperature_2m,precipitation,weather_code,wind_speed_10m";
    const d = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" }).then((r) => r.json());
    const c = d.current;
    if (c) {
      return {
        source: "live",
        description: text(Number(c.weather_code) || 0),
        rainMm: Number(c.precipitation) || 0,
        windKmh: Number(c.wind_speed_10m) || 0,
        tempC: typeof c.temperature_2m === "number" ? c.temperature_2m : null
      };
    }
  } catch {
    /* use the simulated weather below */
  }
  return { source: "simulated", description: "Trời quang (mô phỏng)", rainMm: 0, windKmh: 12, tempC: null };
}
