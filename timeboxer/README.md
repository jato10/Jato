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
- **Shift-drag any block** to slide the whole run to another time. The grab point
  stays under the cursor, so grabbing the middle of a 2-hour block moves it from
  the middle.
- The **NOW bar** shows what you're supposed to be doing and how long is left in
  that block — and mirrors it into the tab title, so it's readable from another tab.
- The **week strip** shows Mon–Sun of the week you're looking at, with how much
  each day has planned. Click any day to jump to it.
- Days are navigable (`←` / `→`, `T` for today) and each day is stored separately.
  **Copy previous day** clones yesterday's plan.
- **Export** downloads every task and day as JSON; **Import** loads one back.
- **Day hours…** changes the visible range (default 07:00–22:00).

### Keyboard

| Key | Action |
| --- | --- |
| `1`–`9` | select the Nth task |
| `E` | toggle eraser |
| `←` / `→` | previous / next day |
| `T` | jump to today |
| `Shift`-drag | move an existing block |

Double-click a task to rename it.

## Storage

Everything lives in `localStorage` under `jato.timeboxer.v1` — per browser, per
device, never sent anywhere. Clearing site data clears your plans, so use
**Export** if you want a copy that outlives the browser.

## Testing

`test/smoke.mjs` drives the real page with Playwright (freezing the clock at
10:07 so the NOW bar is deterministic). 40 checks covering grid construction,
drag-painting, erasing, shift-drag moves, per-task totals, the countdown in both
its busy and free branches, persistence across reload, the week strip, day
navigation, keyboard shortcuts, and export/import round-tripping — including
that a junk file is rejected without destroying existing state.

```
npm install
npm test
```
