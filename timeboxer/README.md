# Timeboxer

Plan your day in 15-minute blocks. One HTML file, no dependencies, no build step,
works offline.

## Run it

Open `timeboxer/index.html` in a browser. That's it.

## How it works

- **Add tasks** in the sidebar (Enter to save). Each gets a colour.
- **Click a task, then drag across the grid** to block out time. A drag fills every
  quarter-hour between where you pressed and where you released, so you can sweep
  roughly and still get a clean span.
- **Drag across blocks that already hold the selected task** to clear them, or use
  the Eraser.
- The **NOW bar** shows what you're supposed to be doing and how long is left in
  that block — and mirrors it into the tab title, so it's readable from another tab.
- Days are navigable (`←` / `→`, `T` for today) and each day is stored separately.
  **Copy previous day** clones yesterday's plan.
- **Day hours…** changes the visible range (default 07:00–22:00).

### Keyboard

| Key | Action |
| --- | --- |
| `1`–`9` | select the Nth task |
| `E` | toggle eraser |
| `←` / `→` | previous / next day |
| `T` | jump to today |

Double-click a task to rename it.

## Storage

Everything lives in `localStorage` under `jato.timeboxer.v1` — per browser, per
device, never sent anywhere. Clearing site data clears your plans.

## Testing

`test/smoke.mjs` drives the page with Playwright (freezing the clock at 10:07 so
the NOW bar is deterministic) and checks grid construction, drag-painting,
erasing, per-task totals, the countdown, persistence across reload, day
navigation, and keyboard shortcuts.

```
npm i -D playwright   # or use a global install
node test/smoke.mjs
```
