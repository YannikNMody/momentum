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
