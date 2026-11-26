# Manual Testing Checklist

Load the extension first: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this repo folder.

## 1. Opening a new tab shows the extension

**Steps:** Open a new tab (Cmd+T / Ctrl+T).
**Expected:** The Momentum Lite page loads instead of Chrome's default new tab — you see the greeting, clock, date, and a "Todos" panel in the bottom-right.

## 2. The time matches my system clock / location (Europe/Lisbon)

**Steps:** Compare the clock and date shown to your Mac's menu bar clock. If your system timezone is set to Europe/Lisbon, the displayed time should match it exactly (same hour:minute). Leave the tab open across a minute boundary (e.g. from :59 to :00) without touching it.
**Expected:** Displayed time matches system time. The clock updates to the new minute within a second or two of it turning. The date line shows today's date, matching your system.

## 3. I can add, edit and remove todos (plus tick them off)

**Steps:**
- Click the todo input, type "Buy milk", press Enter.
- Click the checkbox next to it.
- Double-click the text (or click "Edit"), change it, press Enter.
- Click "Delete".
**Expected:** Todo appears immediately after Enter and the input clears. Checking the box strikes through the text. Editing replaces the text with an input pre-filled with the current text; Enter saves the new text. Delete removes the todo immediately.

## 4. Todos persist after refresh and after restarting Chrome

**Steps:** Add 2–3 todos, mark one done. Reload the new tab page (Cmd+R). Then fully quit Chrome and reopen it, and open a new tab.
**Expected:** All todos and their done/not-done state are exactly as left, both after the page refresh and after a full Chrome restart.

## 5. Daily background image, with credit and a way to change it

**Steps:** Open a new tab and note the background photo. Open a second new tab side by side.
**Expected:** Both tabs show the exact same photo. A small "Photo by \<name\> on Unsplash" credit is visible in the bottom-left corner and is a clickable link to the photo's Unsplash page. The photo fades in rather than popping in instantly.

### Next photo button
**Steps:** Click "Next photo" (top-right) a few times. Reload the page (Cmd+R). Open a second new tab.
**Expected:** The background changes each click, cycling through the set. After reloading, the same photo you last picked is still shown (not back to the default). The second tab also shows that same picked photo.

### Next day picks a (likely) different photo
**Steps:** This can't be tested by waiting for tomorrow, so simulate it: open the new tab's service worker/page console via `chrome://extensions` → "Inspect views: newtab.html", then run `chrome.storage.local.set({ background: { date: '2000-01-01', index: 0 } })` and reload the new tab.
**Expected:** Because the stored date isn't today, the page falls back to the normal deterministic pick for today's date instead of index 0.

### Background image fails to load
**Steps:** In DevTools → Network, right-click one of the `images/*.jpg` requests (or use "Block request URL") after loading a new tab, then reload.
**Expected:** The page still looks fine — a plain dark background is shown instead of a broken image icon, and the rest of the page (clock, todos, etc.) still works normally.

## 6. Main focus for today

**Steps:** Open a new tab. If no focus is set, type into "What's your main focus today?" and press Enter.
**Expected:** The input is replaced with your focus text, a checkbox, and Edit/Clear buttons. Checking the box strikes through the text. "Edit" lets you change the text (Enter saves, Escape cancels). "Clear" removes it and brings back the prompt.

### Focus resets on a new day
**Steps:** Set a focus for today. Open the new tab's console (`chrome://extensions` → "Inspect views: newtab.html") and run `chrome.storage.local.get('focus', console.log)` to see the stored value, then run `chrome.storage.local.set({ focus: { text: 'old focus', done: false, date: '2000-01-01' } })` and reload the new tab.
**Expected:** Because the stored date isn't today, the prompt ("What's your main focus today?") is shown again instead of "old focus".

## 7. Focus timer (Pomodoro)

**Steps:** In the timer section, click "Start". Watch it count down from 25:00. Click "Pause", wait a few seconds, click "Resume". Click "Reset".
**Expected:** The countdown updates every second. Pause freezes the display; Resume continues from where it paused (not from 25:00). Reset returns it to 25:00, idle. The browser tab's title shows the live countdown (e.g. "24:58 · Focus") while running.

### Only the right buttons and messages show
**Steps:** Look at the timer when it is idle, while running, and while paused. Also look at the main focus area before and after setting a focus.
**Expected:** Idle shows Start (and "Skip to break" in focus mode); running shows Pause; paused shows Resume. Never two of Start / Pause / Resume at once. The "time's up" banner is not visible until a session ends. Before a focus is set, only the input shows; after, only the focus text with its tick, edit and clear buttons.

### Timer survives refresh and multiple tabs
**Steps:** Start the timer, then reload the page (Cmd+R). Open a second new tab.
**Expected:** After reloading, the countdown continues from roughly the correct remaining time (not reset to 25:00). The second tab shows the same countdown, in sync, and clicking Pause in one tab pauses it in the other after it updates.

### Timer completion (simulated)
**Steps:** Start the timer, then open the console (`chrome://extensions` → "Inspect views: newtab.html") and run `chrome.storage.local.get('timer', console.log)` to see the current state, then run something like `chrome.storage.local.set({ timer: { mode: 'focus', status: 'running', endsAt: Date.now() + 1000, remainingMs: 1000 } })` to fast-forward to 1 second left, and wait.
**Expected:** Within a second, the timer display pulses, a banner reads "Focus session done, take a break.", and the tab title changes to "Time's up ⏱". No sound plays. Clicking "Dismiss" clears the banner; clicking "Start" begins the break countdown and also clears the banner. Confirm the banner also clears if you dismiss it without starting the next phase.

### Skip to break
**Steps:** With the timer idle or running in focus mode, click "Skip to break".
**Expected:** The timer immediately switches to a running 5:00 break countdown. The "Skip to break" button is hidden while in break mode.

## 8. Distraction-free view

**Steps:** Click "Focus view" (top-right). Then press "F" (with focus somewhere on the page body, not in a text field).
**Expected:** Clicking the button hides the todo panel, the NFL panel, the "Next photo" button, the background credit, and the focus Edit/Clear buttons — the background, clock, date, greeting, main focus, and timer remain. Pressing "F" toggles it back off. The button label switches between "Focus view" and "Show controls".

### "F" shortcut is ignored while typing
**Steps:** Click into the todo input or the focus input, type a word containing the letter "f" (e.g. "coffee"), and press "f" as part of typing.
**Expected:** The letter is entered normally into the field; distraction-free view is not toggled.

### Distraction-free state persists
**Steps:** Turn on distraction-free view, reload the page.
**Expected:** It's still active after reload.

## 9. NFL scores widget

**Steps:** Look at the bottom-left panel. Click its header to collapse/expand it.
**Expected:** It shows "Week N results" with one row per game (away @ home, final score, winner bolded, small color chips per team). Collapsing hides the game list but keeps the header visible; clicking again expands it. No team logos are shown.

### Favorite team pins the game
**Steps:** Open the "Favorite team" dropdown and pick a team.
**Expected:** That team's game moves to the top of the list and is visually highlighted. Reload the page — the same favorite is still selected (it's synced via chrome.storage.sync).

### Caching (no refetch within 3 hours)
**Steps:** Open DevTools → Network, filter for "espn", reload the new tab a couple of times within a few minutes.
**Expected:** Only the first load makes a request to `site.api.espn.com`; subsequent reloads shortly after don't re-fetch (no new request in the Network tab) because the cached response is still fresh.

### Offline / fetch failure falls back to cache
**Steps:** Load the new tab once successfully (so a cache exists), then go offline (DevTools → Network → "Offline"), and simulate the cache being stale by running `chrome.storage.local.get('nflScoreboard', console.log)` then re-setting it with an old `fetchedAt` (e.g. `Date.now() - 4 * 60 * 60 * 1000`) via `chrome.storage.local.set`. Reload the new tab while still offline.
**Expected:** The panel still shows the last cached results instead of disappearing or erroring, with a "Last updated …" note. No errors are thrown to the console.

### No cache and fetch fails
**Steps:** Run `chrome.storage.local.remove('nflScoreboard')` in the console, go offline, then reload the new tab.
**Expected:** The NFL panel is simply not shown (no broken UI, no console errors) — the rest of the page still works.

## Edge cases

### Empty input
**Steps:** Click the todo input, press Enter without typing anything. Try typing only spaces, then Enter.
**Expected:** No todo is added either time.

### Empty edit
**Steps:** Start editing an existing todo, clear the text completely, press Enter (or click away to blur).
**Expected:** The edit is discarded and the original text is restored — the todo is not deleted and not left blank.

### HTML in a todo
**Steps:** Add a todo with the text `<b>hi</b>`.
**Expected:** It displays literally as the text `<b>hi</b>` on the page (not bolded, no injected markup) — view the page source/inspector to confirm it's not being rendered as HTML.

### Two tabs open at once
**Steps:** Open two new tabs side by side. In tab A, add a todo. Switch to tab B without reloading it.
**Expected:** The new todo appears in tab B automatically (no manual refresh needed). Repeat by checking a box or deleting in tab B and confirm tab A updates too.

### First-run name prompt
**Steps:** Remove any saved name first (open the extension's service worker/console via `chrome://extensions` → "Inspect views", run `chrome.storage.sync.remove('name')`, then open a new tab). Alternatively, load the extension fresh in a new Chrome profile.
**Expected:** Instead of a greeting, you see an inline "What's your name?" prompt. Typing a name and pressing Enter replaces it with "Good [morning/afternoon/evening/night], <name>." Reopening a new tab afterward shows the greeting directly (no prompt), and clicking the name lets you edit it again (Enter saves, Escape cancels).

## 10. Weather widget

**Steps:** Open a new tab. If no city is set, click the weather widget (top-right) and search for a city (e.g. "Lisbon"), then pick a result.
**Expected:** The widget shows the current temperature and a condition icon for the chosen city. Reload the page — the same city and reading are shown (no re-prompt), refetched only if the cached reading is more than ~30 minutes old.

### °C/°F toggle
**Steps:** Open Settings (gear icon) → Weather → click °F, then °C.
**Expected:** The displayed temperature in the widget updates immediately to match the selected unit, and stays that way after reloading the page.

### Weather fetch fails
**Steps:** With a city already set, go offline (DevTools → Network → "Offline") and reload the new tab.
**Expected:** The last cached reading is still shown (no broken UI, no console errors) rather than the widget disappearing or showing an error state.

## 11. Settings sheet

**Steps:** Click the gear icon (top-right). Then click outside the sheet, and separately press Escape.
**Expected:** A single sheet opens covering General, Background, Weather, NFL and Focus sections. Both clicking outside and pressing Escape close it. Tabbing from the last focusable control wraps back to the first (and Shift+Tab from the first wraps to the last) — focus never escapes the sheet while it's open.
**Expected (name):** Changing the name field and clicking/tabbing away updates the greeting immediately.
**Expected (focus timer lengths):** Changing "Focus minutes" or "Break minutes" and leaving the field updates the values the timer uses next time it's (re)started.

## 12. Custom background photos

### Uploading via file picker and via drag-and-drop
**Steps:** Open Settings → Background. Click the dropzone to open a file picker and select a JPG/PNG/WebP photo. Then drag another image file from Finder directly onto the dropzone.
**Expected:** Both methods add the photo to the "My photos" gallery below, with a thumbnail. The storage usage line (e.g. "1.2 MB used · 2/30 photos") updates after each upload.

### Downscale / re-encode
**Steps:** Upload a very large photo (e.g. a multi-megapixel JPG).
**Expected:** It still uploads successfully and the storage usage shown is far smaller than the original file size (client-side downscale to a 2560px long edge + WebP/JPEG re-encode).

### Reject unsupported types (including HEIC)
**Steps:** Try uploading a `.heic` file (iPhone photo), then try uploading a non-image file (e.g. a `.txt` or `.pdf`).
**Expected:** The HEIC file is rejected with a message telling you to convert to JPG first; the non-image file is rejected with an "unsupported image type" message. Neither appears in the gallery.

### 30-photo limit
**Steps:** Upload photos until the gallery reaches 30 (or check `chrome.storage`/IndexedDB usage line as a shortcut), then try uploading one more.
**Expected:** The extra upload is rejected with a "Limit of 30 photos reached" message; the gallery still shows exactly 30.

### Set as background / Pin / Delete
**Steps:** In the gallery, click "Set as background" on a photo — expect the new tab's background to switch to it immediately (source auto-widens to "Both" if it was "Football photos" only). Click "Pin this photo" on another photo — expect it to become the fixed background regardless of the day, marked as pinned in the gallery; click "Unpin" to release it back to the daily rotation. Click "Delete" on a photo (confirm the dialog) — expect it removed from the gallery and IndexedDB immediately; if it was pinned, the pin clears too.
**Expected:** All three actions take effect immediately without a page reload, and persist after reloading the new tab.

### Background source switching
**Steps:** Open Settings → Background → "Background source" dropdown. Try "Football photos" (bundled only), "My photos" (custom only, requires at least one upload), and "Both".
**Expected:** The background pool used for the daily pick and "Next photo" button matches the selected source. Switching to "My photos" with zero uploads falls back to the bundled photos rather than showing nothing.

## 13. Readability over background photos

**Steps:** Cycle through the bundled photos with "Next photo" (top-right), pausing on the brightest and darkest ones. Also try a custom upload of a near-white and a near-black image via Settings → Background.
**Expected:** In every case, the clock/greeting/focus text and every glass panel's text stay clearly legible — no washed-out white-on-white or low-contrast passages. On brighter photos a soft dark glass plate appears behind the center text stack (in addition to the radial scrim) to keep it readable; on darker photos the scrim alone is enough. Toggling `prefers-reduced-transparency` (DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-transparency") replaces every glass surface with a solid dark panel instead of a blurred/translucent one. Run `python3 tests/contrast_check.py` for the underlying pass/fail numbers across synthetic worst-case fixtures (all-white, all-black, mid-grey, noise, half/half split) — it should print "ALL PASS".
