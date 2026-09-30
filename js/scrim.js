// Adaptive readability scrim: samples the loaded background photo's
// luminance (center-weighted, plus the four corners) on a small downscaled
// canvas and maps it to a radial dark-scrim strength exposed as the
// --scrim-opacity CSS custom property, so foreground text stays readable
// over both bright and dark photos. Runs entirely client-side against
// already-loaded local/bundled images; never touches network or storage.
// Fails soft (falls back to a mid-strength scrim) if sampling isn't
// possible for any reason.

const SAMPLE_SIZE = 32;
const MIN_OPACITY = 0.25;
const MAX_OPACITY = 0.55;
const FALLBACK_OPACITY = (MIN_OPACITY + MAX_OPACITY) / 2;
// Even at MAX_OPACITY, a flat radial scrim alone can't hold 4.5:1 for
// secondary/tertiary (text-72/text-55) center-stack text once the photo's
// sampled luminance climbs much past mid-grey (see tests/contrast_check.py
// for the exact crossover math) - so the glass-plate fallback has to kick
// in well before "near-white", not just for extreme cases.
const PLATE_LUMINANCE_THRESHOLD = 0.35;

// Center region gets more weight since that's where the clock/greeting/
// focus text sits; corners are sampled too so an image that's dark in the
// middle but blown out at the edges still gets some scrim.
const REGIONS = [
  { x: 0.3, y: 0.28, w: 0.4, h: 0.4, weight: 3 },
  { x: 0, y: 0, w: 0.25, h: 0.25, weight: 1 },
  { x: 0.75, y: 0, w: 0.25, h: 0.25, weight: 1 },
  { x: 0, y: 0.75, w: 0.25, h: 0.25, weight: 1 },
  { x: 0.75, y: 0.75, w: 0.25, h: 0.25, weight: 1 },
];

function relativeLuminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function sampleLuminance(imgEl) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(imgEl, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    let total = 0;
    let weightSum = 0;
    for (const region of REGIONS) {
      const x0 = Math.floor(region.x * SAMPLE_SIZE);
      const y0 = Math.floor(region.y * SAMPLE_SIZE);
      const x1 = Math.max(x0 + 1, Math.floor((region.x + region.w) * SAMPLE_SIZE));
      const y1 = Math.max(y0 + 1, Math.floor((region.y + region.h) * SAMPLE_SIZE));

      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * SAMPLE_SIZE + x) * 4;
          sum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
          count++;
        }
      }
      if (count === 0) continue;
      total += (sum / count) * region.weight;
      weightSum += region.weight;
    }

    return weightSum ? total / weightSum : null;
  } catch {
    return null;
  }
}

// Applies the adaptive scrim for a fully-loaded <img> or Image element.
// Sets --scrim-opacity on the document root (a registered animatable custom
// property, see styles.css, so it cross-fades on change) and toggles a
// "scrim-plate" body class once the photo is bright enough that the scrim
// alone can't guarantee readable secondary/tertiary text, which adds a
// glass plate behind the center text stack.
export function applyAdaptiveScrim(imgEl) {
  const luminance = sampleLuminance(imgEl);
  const root = document.documentElement;

  if (luminance === null) {
    root.style.setProperty("--scrim-opacity", String(FALLBACK_OPACITY));
    document.body.classList.remove("scrim-plate");
    return;
  }

  const opacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * luminance;
  root.style.setProperty("--scrim-opacity", opacity.toFixed(3));
  document.body.classList.toggle("scrim-plate", luminance > PLATE_LUMINANCE_THRESHOLD);
}
