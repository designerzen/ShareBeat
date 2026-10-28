# ShareBeat

A browser synthesizer built with Lit, TypeScript, Vite, Web Audio, and native WebRTC. Up to four players share a pattern without accounts or an application backend.

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
npm test            # Test four-player P2P sessions in Chromium
```

Deploy `dist/` to any static HTTPS host. No backend setup or environment variables are required.

## GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** once. Push to `master` to run the deployment, or run **Deploy to GitHub Pages** manually from the Actions tab.

The workflow installs dependencies, tests four-player sessions in Chromium, builds the site with the correct Pages base path, and deploys `dist/`. No deployment secrets are needed.

After the first successful deployment, try the app at [designerzen.github.io/ShareBeat/](https://designerzen.github.io/ShareBeat/). The deployed URL is also shown in the workflow's `github-pages` environment.

## Play with friends

1. The host selects **Create invitation** and sends the code to one friend.
2. The friend pastes it into **Received code**, selects **Join invitation**, and sends their answer code back.
3. The host pastes the answer and selects **Host: apply answer**.
4. Repeat with a new invitation for each friend, up to four players total.

Invitations expire after two minutes. Cancel unused invitations to release their instrument. Joining replaces your solo pattern with the host's pattern. Guests return to fresh solo sessions if the host leaves. Guest clocks follow the host for approximate beat alignment, rather than sample-accurate audio synchronization.

Connections use WebRTC data channels with manually exchanged connection details. There is no signaling service, STUN, TURN, or automatic room discovery. Peers need a direct network path, typically on the same local network; firewalls, VPNs, and NAT can prevent connections. Use HTTPS or localhost.

## Source

- `src/share-beat.ts` — Lit sequencer and connection controls
- `src/peer-session.ts` — WebRTC sessions, player slots, and shared patterns
- `src/audio/` — instruments and beat timing
- `src/styles.css` — app styling
- `tests/p2p.test.cjs` — four-browser integration test

Originally made at Music Hack Day London 2013 by @designerzen and @diogomoreda.
