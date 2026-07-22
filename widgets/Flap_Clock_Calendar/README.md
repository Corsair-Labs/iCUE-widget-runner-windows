# Flap Clock Calendar

Custom iCUE widget for Xeneon Edge dashboard LCD screens. It shows a local split-flap clock with a configurable calendar/date line.

## Supported Device

- Xeneon Edge (`dashboard_lcd`)
- Tested against S, M, L, and XL horizontal and vertical slot sizes.

## Settings

- Show Seconds: switches between per-second updates and minute-aligned updates.
- 24-Hour Time: toggles 12-hour time with AM/PM and 24-hour time.
- Black-on-White Display: swaps the configured text and background colors.
- Date Format: chooses from common long, short, slash, and ISO date formats.
- Classic Mechanical Style: on uses a beveled split-flap look; off uses flatter modern tiles.
- Font Scale: adjusts clock and date sizing from 70% to 150%.
- Font Family: selects from common local/system font stacks.
- Text Color, Accent Color, Background Color: controls display colors.
- Background Image: selects a local image or GIF via iCUE media selector.
- Glass Blur: toggles blur for the selected background media.
- Background Transparency: fades the background layer while keeping clock text opaque.

## Runtime Notes

- No external API, account, or network connection is required.
- Time and date come from the local system clock.
- If seconds are hidden, the widget schedules updates on the next minute boundary.
- If a selected background cannot load, the widget continues showing the clock with the solid background color.

## Marketplace Notes

- The manifest currently uses `author: "Custom"` and `id: "com.custom.flapclockcalendar"`. Update these before Marketplace submission if you want publisher-specific naming.
- The included SVG icon and preview are simple placeholders suitable for private use. Marketplace submission may require final branded PNG screenshots/assets depending on the current submission checklist.
