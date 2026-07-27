# MeetMind Mobile

React Native (Expo, managed workflow) client for MeetMind, talking to the backend in `../backend`.

This is Phase 2 of the project — the backend (auth, teams, meetings, AI, tasks, real-time, notifications, search, analytics, export, calendar) is already built and tested; see `../backend/README.md`. This app covers the **core flow**: auth, teams, meetings (including audio/transcript upload and AI summary/action-items/sentiment/Q&A), a Kanban task board, real-time updates, and notifications. Calendar sync UI, semantic-search UI, the analytics dashboard, and a dark-mode toggle are intentionally deferred to a later pass.

## Stack

- Expo (managed) + TypeScript, React Navigation (native-stack + bottom-tabs)
- Redux Toolkit — RTK Query for all server state (one `baseApi` with per-domain injected endpoints), a small `authSlice` for session state
- `expo-secure-store` for token persistence, `socket.io-client` for real-time, `expo-audio`/`expo-document-picker` for uploads, `expo-notifications` for push
- No third-party UI kit — a small hand-rolled component set in `src/components`

## Getting started

1. Make sure the backend is running (`cd ../backend && npm run dev`) and reachable.
2. ```bash
   cp .env.example .env
   ```
   If you're testing on a **physical device** via Expo Go, `localhost` in the default `.env` refers to the phone itself, not your computer — change `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL` to your dev machine's LAN IP (e.g. `http://192.168.1.20:4000`). Simulators/emulators can keep `localhost`.
3. ```bash
   npm install
   npx expo start
   ```
   Scan the QR code with Expo Go (iOS/Android), or press `a`/`i` for an emulator/simulator.

## Project structure

```
src/
  api/          RTK Query: baseApi (auth + reauth-on-401) and per-domain endpoint files
  store/        Redux store + typed hooks (named "store", not "app", to avoid colliding with Expo Router's "app" directory convention)
  features/auth/ authSlice (tokens, current user, bootstrap-from-secure-storage)
  navigation/   Auth ⇄ Main tab switch, one stack navigator per tab
  screens/      auth/, teams/, meetings/, tasks/, notifications/, profile/
  components/   Shared UI primitives (Button, Input, Card, Badge, SelectModal, ...)
  services/     socket.ts, secureStorage.ts, pushNotifications.ts
  hooks/        useMeetingLiveTranscript, useTaskBoardSocket, useNotificationSocket
  theme/        colors, spacing, typography
  types/api.ts  TS types mirroring the backend's Prisma models / response shapes
```

## Notable behavior

- **Auth**: access token (15m) + refresh token (7d) are persisted in `expo-secure-store`. `baseApi`'s `baseQueryWithReauth` transparently refreshes on a 401 and retries once; if refresh fails, it logs out and the root navigator falls back to the auth stack.
- **Real-time**: on login, a Socket.IO connection opens (`services/socket.ts`), authenticated with the access token. The meeting detail screen can join a meeting's live room and accumulate near-real-time transcript chunks; the Kanban board joins its team's room and invalidates its RTK Query cache on `task:*` events; a global listener refreshes the notifications badge on `notification:new`.
- **Push tokens**: `services/pushNotifications.ts` requests the *native* FCM/APNs device token (`Notifications.getDevicePushTokenAsync`), not an Expo push token — the backend's push service uses `firebase-admin` directly against raw device tokens.
- **Team invitations**: since this app doesn't handle the web deep-link the invite email points at, `TeamsListScreen` has a "Have an invite?" action where a user can paste the invitation link/token directly.

## Known limitations

- No simulator/emulator was available in the environment this was built in, so it's been verified with `tsc --noEmit`, ESLint, and a successful Metro bundle — not an interactive device walkthrough. Please run it yourself and report anything that doesn't match expectations.
- Push notification **delivery** requires a physical device (and, for production, an EAS build with FCM/APNs credentials) — permission + token registration works in this build, but end-to-end delivery wasn't (couldn't be) verified here.
- Kanban task moves are done via a status-picker sheet (long-press or the "Move →" link on a card), not native drag gestures.
