# ShareBeat

A browser synthesizer built with Lit, TypeScript, Vite, Web Audio, and native WebRTC. Up to four players share a pattern without accounts or an application backend.

**[Try ShareBeat on GitHub Pages](https://designerzen.github.io/ShareBeat/)**

Click the grid to enable audio and add or remove notes. To play together, open the app on each device and follow the invitation steps below.

Playback starts when you add a note. Open **Share** to invite a friend or join a session. Arrow keys move around the grid; Space or Enter toggles a note.

## Run locally

Install Node.js 22.12+ (Node.js 20.19+ is also supported), then run from the repository root:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Click the grid to enable audio and add or remove notes.

## Build and test

```sh
npm run build       # Type-check and produce dist/
npm run preview     # Serve the production build locally
npm run test:setup  # Install Chromium and Firefox for browser tests
npm test            # Test P2P, desktop/mobile UI, and audio continuity
```

Deploy `dist/` to any static HTTPS host. No backend setup or environment variables are required.

## GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** once. Push to `master` to run the deployment, or run **Deploy to GitHub Pages** manually from the Actions tab.

The workflow installs dependencies, tests four-player sessions and Chrome/Firefox interoperability, builds the site with the correct Pages base path, and deploys `dist/`. No deployment secrets are needed.

The site is published at [designerzen.github.io/ShareBeat/](https://designerzen.github.io/ShareBeat/) after a successful deployment. The deployed URL is also shown in the workflow's `github-pages` environment.

## Play with friends

1. Open **Share**, choose **Copy invitation link**, and send the URL to your friend. Keep your tab open.
2. Your friend opens the URL. ShareBeat prepares a reply automatically. They choose **Copy reply link** and send that URL back to you, keeping their tab open too.
3. Open the reply link in the same browser as your original session. It connects automatically, even if the reply opens in a new tab. Return to the original tab to play.

No codes to paste or Connect buttons are needed. If your messaging app opens the reply in a different browser, use **Share → Paste a link / connection help** in your original tab instead. Invitation links expire after ten minutes. Create a fresh invitation for each friend, up to four players total.

Connection details are compressed into the URL fragment (after `#`), which is not sent to the static web host. Both original tabs must stay open; reloading the host destroys its pending invitation. Opening an invitation in an empty tab joins automatically; an existing pattern or active session is preserved and the app asks you to use a new tab.

WebRTC uses Google’s public STUN service to discover reachable addresses, including for separate browsers on the same computer. Notes and session state still travel directly between peers; STUN does not relay them. There is no application backend, signaling service, TURN relay, or automatic room discovery. If STUN is unavailable, the app can still use local candidates. Restrictive browser privacy settings, local-network permissions, OS firewalls, or NAT can still prevent a direct connection. Use HTTPS or localhost. Guests return to fresh solo sessions if the host leaves. Guest clocks follow the host for approximate beat alignment, rather than sample-accurate audio synchronization.

### Connection problems

Keep both original tabs open and open the reply in the browser that created the invitation. If the connection fails, the dialog shows the error once under **Connection failed**. Check local-network/WebRTC access in both browsers and OS firewall permissions; being on the same machine does not bypass browser restrictions.

Under **Paste a link / connection help**, **Copy connection details** includes connection states, candidate counts, and supported network-permission states. It excludes IP addresses, SDP, and invitation tokens. A browser that exposes no connection addresses is detected before an unusable link is generated.

## Player views

Each connected player gets a separate `<share-beat>` showing their live pattern. Your grid remains editable; other players' grids are read-only. Views appear when a friend connects and disappear when they leave.

Use **Stacked** to overlay all grids in the same space. Each player has a color and a separate quadrant within each cell, so notes at the same position remain visible. **Grid** places player grids side by side in two columns. **Rows** puts each player on a separate row. Switching views preserves your pattern and playback; the extra grids do not create additional audio players.

## Reuse the grid

`<share-beat>` renders only the editable 16 × 16 grid. The app's waveform and sharing controls live in `<share-beat-app>`. Import the grid and attach an external audio controller for each instance that should play:

```html
<share-beat id="lead" oscillator-type="triangle"></share-beat>
<share-beat id="bass" user="2" oscillator-type="sine"></share-beat>
```

```ts
import './src/share-beat';
import { GridAudioController } from './src/audio/grid-audio-controller';
import type { ShareBeat } from './src/share-beat';

for (const grid of document.querySelectorAll<ShareBeat>('share-beat')) {
    new GridAudioController(grid);
}
document.querySelector('#lead')!.setAttribute('oscillator-type', 'square');
```

Supported oscillator types are `sine`, `triangle`, `square`, and `sawtooth`; invalid values play sine. Attribute changes update playback immediately. Optional attributes are `bpm` (default 200), `user` (track 0–3; 1 is drums, 2 is bass), `clock-offset` (milliseconds), and `readonly`. A read-only grid disables its pads and removes them from keyboard navigation. Use `display-user="0"` through `display-user="3"` to show only one player's notes while retaining the full pattern data; the default shows all tracks. Size each grid through its container or CSS width.

Each grid has independent `tracks` (four arrays of 16 row numbers; `-1` is silent), `trackWaveforms`, and `step` properties. The `oscillator-type` attribute configures the active user's track. Editing emits a bubbling `note-change` event with `{ user, step, note }`; playback failures emit `audio-error` from the controller. The controller also emits `step-change` with the current step number, which the app uses to update read-only grids without attaching more audio controllers. Grids without a controller remain visual editors and never create audio contexts or network connections.

Each audio controller owns a `BeatPlayer`, creates audio only after a grid interaction (or explicit `controller.start()`), and closes its context and stops its clock when its grid is removed. Reconnecting a grid lets it start again on the next interaction. The controller and player contain all playback code; the grid contains no sharing or audio lifecycle code.

## Source

- `src/share-beat.ts` — reusable grid, attributes, and note events
- `src/share-beat-app.ts` — application controls and session integration
- `src/audio/beat-player.ts` — independent playback context, voices, and clock
- `src/audio/grid-audio-controller.ts` — opt-in grid playback and lifecycle adapter
- `src/peer-session.ts` — WebRTC sessions, player slots, and shared patterns
- `src/signal-links.ts` — compressed invitation/reply URLs and link validation
- `src/audio/` — instruments and beat timing
- `src/styles.css` — app styling
- `tests/p2p.test.cjs` — four-browser integration test
- `tests/cross-browser.test.cjs` — Chromium ↔ Firefox at a public HTTPS origin and blocked-candidate diagnostics
- `tests/links.test.cjs` — link validation and missing-original-tab recovery
- `tests/ui.test.cjs` — simple grid, keyboard controls, and share dialog
- `tests/audio.test.cjs` — offline bass continuity checks at 44.1 and 48 kHz
- `tests/grid.test.cjs` — multiple grids, live attributes, and independent audio cleanup
- `tests/views.test.cjs` — stacked, side-by-side, and row layouts with read-only remote patterns

Originally made at Music Hack Day London 2013 by @designerzen and @diogomoreda.
