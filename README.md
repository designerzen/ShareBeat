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
npm run test:setup  # Install Chromium once for browser tests
npm test            # Test P2P, desktop/mobile UI, and audio continuity
```

Deploy `dist/` to any static HTTPS host. No backend setup or environment variables are required.

## GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** once. Push to `master` to run the deployment, or run **Deploy to GitHub Pages** manually from the Actions tab.

The workflow installs dependencies, tests four-player sessions in Chromium, builds the site with the correct Pages base path, and deploys `dist/`. No deployment secrets are needed.

The site is published at [designerzen.github.io/ShareBeat/](https://designerzen.github.io/ShareBeat/) after a successful deployment. The deployed URL is also shown in the workflow's `github-pages` environment.

## Play with friends

1. Both players open **Share**. The host selects **Invite a friend**, then **Copy code**, and sends it to one friend.
2. The friend selects **Join a session**, pastes the invitation, and selects **Create reply code**. They copy the reply and send it back.
3. The host pastes the reply into **Their reply code** and selects **Connect**.
4. Repeat with a new invitation for each friend, up to four players total.

Invitations expire after two minutes. Cancel unused invitations to release their instrument. Joining replaces your solo pattern with the host's pattern. Guests return to fresh solo sessions if the host leaves. Guest clocks follow the host for approximate beat alignment, rather than sample-accurate audio synchronization.

Connections use WebRTC data channels with manually exchanged connection details. There is no signaling service, STUN, TURN, or automatic room discovery. Peers need a direct network path, typically on the same local network; firewalls, VPNs, and NAT can prevent connections. Use HTTPS or localhost.

## Source

- `src/share-beat.ts` — Lit sequencer and connection controls
- `src/peer-session.ts` — WebRTC sessions, player slots, and shared patterns
- `src/audio/` — instruments and beat timing
- `src/styles.css` — app styling
- `tests/p2p.test.cjs` — four-browser integration test
- `tests/ui.test.cjs` — simple grid, keyboard controls, and share dialog
- `tests/audio.test.cjs` — offline bass continuity checks at 44.1 and 48 kHz

Originally made at Music Hack Day London 2013 by @designerzen and @diogomoreda.
