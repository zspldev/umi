# UMI — Improvement Backlog

## Previously Suggested

### #5 — Replay Button
Each completed turn in the session view should have a small replay icon that re-plays the translated audio. Useful when someone misses what was said or the room is noisy. The PCM audio data can be stored transiently (not persisted) in a ref during the turn and discarded after the session ends.

### #9 — Turn Nudge
A gentle visual or haptic cue (subtle pulse or tooltip) to remind the other speaker it is their turn after translation finishes playing. Currently the active-speaker indicator switches automatically but there is no signal directed at the *other* person holding the phone.

### #13 — Auto-Detect Source Language
Add an "Auto" option to both speaker language selectors. When selected, the Realtime API session instructions are updated to detect the spoken language itself, removing the need to configure languages up front. Useful for casual or multilingual conversations.

---

## Recommended Additions

### #14 — Silence / No-Speech Guard
If the user taps the mic and says nothing for more than ~4 seconds, the session should auto-cancel the turn and return to idle with a quiet "Nothing heard — tap again" message. Right now a silent recording submits an empty turn and wastes an API round-trip.

### #15 — Session Title / Label
On the setup screen, add an optional "Session name" field (e.g. "Doctor visit", "Meeting with Priya"). It defaults to "Speaker 1 & Speaker 2" today. A meaningful title makes the history list far more scannable, especially after a few sessions accumulate.

### #16 — Connection Quality Indicator
Show a small signal-strength or latency badge next to "Live Session" in the header that reflects the WebSocket round-trip time. Tap it to see a tooltip with the current latency in milliseconds. Helps users diagnose when translation feels slow (poor cellular vs. API delay).
