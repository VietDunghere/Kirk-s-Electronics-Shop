"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Slide = {
  title: string;
  text: string;
  image: string;
  alt: string;
  badge?: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
  note: string;
  credit?: string;
};

const SLIDES: Slide[] = [
  {
    title: "Everything tech at Kirk's Ecommerce Shop.",
    text: "Laptops, phones, gaming gear & accessories — simulated checkout with card or e-wallet.",
    image: "/kirk_bia.jpg",
    alt: "Kirk's Ecommerce Shop store",
    primary: { href: "/products", label: "Shop products" },
    secondary: { href: "/track-order", label: "Track order" },
    note: "Demo login: customer@example.com / 123456 · Test card 4111 1111 1111 1111"
  },
  {
    title: "New: drone delivery is here.",
    text: "Your order takes off from the Kirk Drone Hub and flies straight to your door. Follow it live on the map, DHL-style.",
    image: "/delivery_drone.jpg",
    alt: "Delivery drone flying over a city",
    badge: "🚁 NEW SERVICE",
    primary: { href: "/products", label: "Shop & choose Drone" },
    secondary: { href: "/track-order", label: "Track order" },
    note: "Flat fee 49,000 VND · ETA ~3 minutes (demo simulation)",
    credit: "Photo: HadasBandel, Wikimedia Commons (CC BY-SA 4.0)"
  },
  {
    title: "New: self-driving electric delivery.",
    text: "Zero-emission autonomous vehicles deliver your package on the street grid. Watch every turn on the live map.",
    image: "/delivery_robot.jpg",
    alt: "Autonomous electric delivery vehicles on a campus path",
    badge: "🚙 NEW SERVICE",
    primary: { href: "/products", label: "Shop & choose Autonomous car" },
    secondary: { href: "/track-order", label: "Track order" },
    note: "Flat fee 29,000 VND · ETA ~4 minutes (demo simulation)",
    credit: "Photo: Mbrickn, Wikimedia Commons (CC BY-SA 4.0)"
  }
];

const INTERVAL_MS = 5000;

/** Home page hero as an auto-playing slideshow: store banner + drone / autonomous-car delivery ads. */
export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i: number) => setIndex((i + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A3161] via-[#B31942] to-[#0A3161] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {SLIDES.map((s, i) => (
          <div key={s.title} className="w-full shrink-0" aria-hidden={i !== index}>
            <div className="grid gap-6 p-8 pb-14 sm:grid-cols-2 sm:p-12 sm:pb-14">
              <div>
                {s.badge && (
                  <span className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold tracking-wide text-[#B31942]">{s.badge}</span>
                )}
                <h1 className="text-3xl font-extrabold sm:text-5xl">{s.title}</h1>
                <p className="mt-3 text-white/90">{s.text}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={s.primary.href} tabIndex={i === index ? 0 : -1} className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#0A3161] hover:bg-red-50">
                    {s.primary.label}
                  </Link>
                  <Link href={s.secondary.href} tabIndex={i === index ? 0 : -1} className="rounded-lg border border-white/40 px-5 py-3 text-sm font-bold hover:bg-white/10">
                    {s.secondary.label}
                  </Link>
                </div>
                <p className="mt-4 text-xs text-white/80">{s.note}</p>
              </div>
              <div className="hidden flex-col items-center justify-center sm:flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={s.alt} className="h-72 w-full rounded-2xl object-cover shadow-lg" />
                {s.credit && <p className="mt-1 self-end text-[10px] text-white/60">{s.credit}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => go(index - 1)} aria-label="Previous slide"
        className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-lg hover:bg-black/50 sm:flex">‹</button>
      <button onClick={() => go(index + 1)} aria-label="Next slide"
        className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-lg hover:bg-black/50 sm:flex">›</button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((s, i) => (
          <button key={s.title} onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${i === index ? "w-7 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`} />
        ))}
      </div>
    </section>
  );
}
