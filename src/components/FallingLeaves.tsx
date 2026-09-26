"use client";

// Purely decorative — a soft drift of leaves behind the app content. CSS-driven (no JS
// animation loop), so it costs nothing at runtime, and it's inert to prefers-reduced-motion
// via the .leaf-fall rule in globals.css. Randomized once per mount so the scene doesn't
// look mechanically identical on every reload.
const LEAF_COUNT = 16;

function seededLeaves() {
  return Array.from({ length: LEAF_COUNT }, (_, i) => {
    const left = (i * 137.5) % 100; // golden-angle spread = even but non-repeating look
    const duration = 14 + ((i * 7) % 13); // 14–26s
    const delay = -((i * 3.3) % duration); // negative delay = already mid-fall on load
    const size = 14 + ((i * 5) % 16); // 14–30px
    const drift = 30 + ((i * 11) % 60); // horizontal sway range
    const spin = i % 2 === 0 ? 1 : -1;
    const hue = i % 3; // three leaf tones
    const opacity = 0.35 + ((i * 13) % 40) / 100;
    return { id: i, left, duration, delay, size, drift, spin, hue, opacity };
  });
}

const LEAVES = seededLeaves();

const LEAF_COLORS = ["rgb(var(--neem))", "rgb(var(--moss))", "rgb(var(--turmeric))"];

export default function FallingLeaves() {
  return (
    <div className="leaf-scene" aria-hidden="true">
      {LEAVES.map((leaf) => (
        <span
          key={leaf.id}
          className="leaf-fall"
          style={
            {
              left: `${leaf.left}%`,
              animationDuration: `${leaf.duration}s`,
              animationDelay: `${leaf.delay}s`,
              "--drift": `${leaf.drift}px`,
              "--spin": leaf.spin,
              opacity: leaf.opacity,
            } as React.CSSProperties
          }
        >
          <svg width={leaf.size} height={leaf.size} viewBox="0 0 24 24" fill="none">
            <path
              d="M20 4C10 4 4 10 4 20C14 20 20 14 20 4Z"
              fill={LEAF_COLORS[leaf.hue]}
            />
            <path d="M20 4C14 8 10 12 5 19" stroke="rgb(var(--paper))" strokeOpacity="0.35" strokeWidth="0.8" />
          </svg>
        </span>
      ))}
    </div>
  );
}
