#!/usr/bin/env python3
"""Computes WCAG contrast ratios for every (surface x fixture) combination
used by the glass design system, using the exact floor colors/opacities
defined in styles.css. This models flat-color fixtures analytically instead
of rendering a browser, which is exact for the white/black/grey/split
fixtures (uniform or two-tone colors) and uses the fixture's average
luminance for the noise fixture (a conservative approximation, since the
scrim+glass blur further evens out high-frequency noise in practice).

Checks two situations for every surface:
  1. Text placed directly on the photo + adaptive scrim, no glass panel
     behind it (the center clock/greeting/focus stack).
  2. Text placed on a glass panel/pill/sheet (elevation 1/2/3), which sits
     on top of the photo + scrim.

Thresholds (WCAG 2.1): body text >= 4.5:1, large text (>=24px or bold
>=19px, which covers the clock/timer/greeting) >= 3:1.

Run with: python3 tests/contrast_check.py
"""

MIN_SCRIM = 0.25
MAX_SCRIM = 0.55

# Matches js/scrim.js: above this sampled luminance, a glass plate renders
# behind the center text stack in addition to the radial scrim.
PLATE_LUMINANCE_THRESHOLD = 0.35
PLATE_ALPHA = 0.58
PLATE_RGB = (0, 0, 0)

FIXTURES = {
    "white": (255, 255, 255),
    "black": (0, 0, 0),
    "grey": (128, 128, 128),
    # High-frequency black/white noise averages to mid-grey; local contrast
    # is further reduced by the scrim + any backdrop blur.
    "noise": (128, 128, 128),
    # Worst of the two halves is what matters for readability.
    "split-white-half": (255, 255, 255),
    "split-black-half": (0, 0, 0),
}

# Matches the --e1-bg/--e2-bg/--e3-bg tokens in styles.css.
SURFACES = {
    "e1-pill": {"rgb": (28, 28, 30), "alpha": 0.34},
    "e2-panel": {"rgb": (28, 28, 30), "alpha": 0.66},
    "e3-sheet": {"rgb": (28, 28, 30), "alpha": 0.78},
    "reduced-transparency": {"rgb": (28, 28, 30), "alpha": 0.96},
}

# text-55 is never placed on an e1 pill in the markup (only text-100/
# text-72 appear there - see the comment on --e1-bg in styles.css), so it's
# excluded from that combination here rather than requiring e1 to be as
# opaque as e2.
SURFACE_TEXT_EXCLUSIONS = {
    "e1-pill": {"text-55"},
}

TEXT_OPACITIES = {"text-100": 1.0, "text-72": 0.72, "text-55": 0.55}

TEXT_RGB = (255, 255, 255)


def srgb_to_linear(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(rgb):
    r, g, b = (srgb_to_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(rgb_a, rgb_b):
    la = relative_luminance(rgb_a) + 0.05
    lb = relative_luminance(rgb_b) + 0.05
    return max(la, lb) / min(la, lb)


def composite(fg_rgb, fg_alpha, bg_rgb):
    return tuple(fg_alpha * f + (1 - fg_alpha) * b for f, b in zip(fg_rgb, bg_rgb))


def luminance_0_1(rgb):
    return sum(rgb) / 3 / 255


def scrim_opacity_for(rgb):
    lum = luminance_0_1(rgb)
    return MIN_SCRIM + (MAX_SCRIM - MIN_SCRIM) * lum


def photo_plus_scrim(rgb):
    scrim_alpha = scrim_opacity_for(rgb)
    return composite((0, 0, 0), scrim_alpha, rgb)


def photo_plus_scrim_plus_plate(rgb):
    base = photo_plus_scrim(rgb)
    if luminance_0_1(rgb) <= PLATE_LUMINANCE_THRESHOLD:
        return base, False
    return composite(PLATE_RGB, PLATE_ALPHA, base), True


def main():
    rows = []
    all_pass = True

    for fixture_name, fixture_rgb in FIXTURES.items():
        scrim_base = photo_plus_scrim(fixture_rgb)
        center_base, plate_active = photo_plus_scrim_plus_plate(fixture_rgb)

        # 1. Center-stack text: directly on the photo + scrim, plus the
        # glass plate once the photo is bright enough to need it (matches
        # js/scrim.js's actual runtime behavior).
        surface_label = "scrim+plate" if plate_active else "scrim-only"
        for text_name, text_alpha in TEXT_OPACITIES.items():
            effective_text = composite(TEXT_RGB, text_alpha, center_base)
            ratio = contrast_ratio(effective_text, center_base)
            threshold = 3.0 if text_name == "text-100" else 4.5
            ok = ratio >= threshold
            all_pass &= ok
            rows.append((fixture_name, surface_label, text_name, ratio, threshold, ok))

        # 2. Text on each glass surface sitting on top of the photo + scrim
        # (panels/sheet always use their own opaque tint regardless of the
        # center-stack plate).
        for surface_name, surface in SURFACES.items():
            panel_bg = composite(surface["rgb"], surface["alpha"], scrim_base)
            excluded = SURFACE_TEXT_EXCLUSIONS.get(surface_name, set())
            for text_name, text_alpha in TEXT_OPACITIES.items():
                if text_name in excluded:
                    continue
                effective_text = composite(TEXT_RGB, text_alpha, panel_bg)
                ratio = contrast_ratio(effective_text, panel_bg)
                threshold = 3.0 if text_name == "text-100" else 4.5
                ok = ratio >= threshold
                all_pass &= ok
                rows.append((fixture_name, surface_name, text_name, ratio, threshold, ok))

    header = f"{'fixture':<20}{'surface':<24}{'text':<10}{'ratio':>8}{'needs':>8}  ok"
    print(header)
    print("-" * len(header))
    for fixture_name, surface_name, text_name, ratio, threshold, ok in rows:
        mark = "PASS" if ok else "FAIL"
        print(f"{fixture_name:<20}{surface_name:<24}{text_name:<10}{ratio:>8.2f}{threshold:>8.1f}  {mark}")

    print()
    print("ALL PASS" if all_pass else "SOME FAILED")
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
