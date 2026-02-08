# Hey Dad

## Overview

Hey Dad Mobile is an Expo Router–based React Native app that helps fathers capture and preserve family memories. The experience guides new users through onboarding, secure authentication, and a dashboard that surfaces recorded videos, audio narrations, parenting prompts e.t.c. Supabase powers authentication, storage, and relational data (children, memories, comments), while native modules handle camera access, file uploads, and media playback in a polished, dark-mode friendly UI.

## Features at a Glance

- Animated splash screen, email/password authentication, and onboarding checklist gated by `ProtectedRoute`.
- Dashboard that aggregates recent video memories, audio narrations, prompt ideas, and per-child stats with signed Supabase URLs.
- Capture flow for recording or uploading videos, selecting thumbnails, attaching notes, tagging children, and scheduling unlock rules with resumable uploads via TUS.
- Children management with profile photos, birthdays, and age-aware helpers backed by Supabase storage (`child-images`) and tables.
- “Say This” parenting script generator powered by curated JSON data, tone/age filters, and dark-mode aware UI.
- Rich media playback: custom audio player, video player with notes, thumbnail selection, and retry modals for long-running uploads.
- Global theme provider with persisted light/dark preferences, Tailwind (NativeWind) styling, Merriweather fonts, and React Native Reanimated flourishes.

## Tech Stack

- **Core**: Expo SDK 54, React Native 0.81, React 19, Expo Router.
- **State & Data**: Zustand (persisted with AsyncStorage), Supabase JS client, AsyncStorage based onboarding flags.
- **Styling & UI**: NativeWind Tailwind classes, expo-linear-gradient, custom components, Merriweather font family.
- **Media**: expo-camera, expo-av, expo-image-picker, expo-video-thumbnails, tus-js-client for resumable uploads.
- **Tooling**: TypeScript, ESLint, Prettier (with Tailwind plugin), Jest not configured yet.

## Project Structure

| Path | Description |
| ---- | ----------- |
| `app/` | Expo Router routes: splash, auth stack, tab navigator, dashboard, memories flow, children, parenting tools, settings. |
| `components/` | Reusable UI (media players, onboarding modal, upload helpers, Say This widget, thumbnails, etc.). |
| `hooks/` | Stateful logic such as `useAuth`, `useVideoUploadSession`, `useVideoComments`. |
| `providers/` | Theme context with persisted preference and system sync. |
| `utils/` | Supabase client and thumbnail helpers. |
| `data/` | Static prompt and parenting script datasets. |
| `assets/` | App icons, splash screen, logo. |
| `constants/` | Prompt catalog and helpers. |

## Getting Started

### Prerequisites

- Node.js ≥ 18 (Expo SDK 54 requirement) and npm ≥ 9.  
  _Optional_: yarn or pnpm if you prefer.
- Expo CLI tools (`npx expo` works out of the box).
- Xcode + iOS Simulator (for iOS builds) and/or Android Studio + SDK (for Android builds).
- A Supabase project with the schema outlined below.

### Installation

```bash
# Install dependencies
npm install

# Start the Metro bundler (choose iOS, Android, or web from the prompt)
npx expo start
```

Common scripts:

- `npm run ios` – Run on an iOS simulator/device (requires Xcode).
- `npm run android` – Run on an Android emulator/device.
- `npm run web` – Launch Expo for web.
- `npm run lint` / `npm run format` – Check or fix linting + formatting.
- `npm run prebuild` – Generate native projects when you need to customize native code or build with EAS.

## Environment & Services

### Supabase

The current `utils/supabase.ts` contains the keys needed for production 
Expected Supabase resources:

- Tables: `profiles`, `user_settings`, `subscriptions`, `children`, `videos`, `narrations`, `video_children`, `video_comments`, `child_memory_counts`.
- Storage buckets: `videos`, `audio`, `images`, `child-images`.

Key flows rely on Row Level Security policies that allow users to read/write only their own records and media. Ensure service roles are configured accordingly.

### Google Sign-In

Add your client IDs to Expo config (`app.json` or `app.config.ts`) and expose them via `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` when you complete the integration.

### Native Modules & Permissions

- Camera/microphone access via `expo-camera`; remember to update `app.json` permission strings if you change copy.
- File uploads depend on `expo-file-system` and resumable uploads at `https://<your-project>.supabase.co/storage/v1/upload/resumable`.
- For bare builds or EAS submissions, run `npx expo prebuild` and commit any configuration updates under `ios/` or `android/`.

## Development Notes

- **Routing & Auth Guarding**: `ProtectedRoute` redirects based on `useAuth` state; onboarding progress is stored in Zustand + AsyncStorage.
- **Uploads**: `useVideoUploadSession` stages recordings locally, retries via tus-js-client, and posts metadata to Supabase. Ensure the TUS endpoint is reachable from devices (especially on physical hardware or production builds).
- **Children & Memories**: `app/(tabs)/children.tsx` and `app/(tabs)/memories/*` expect signed URLs for media. Configure Supabase Storage policies to allow `SELECT` + `INSERT` for authenticated users.
- **Say This Data**: `data/sayThisData.ts` drives the parenting script tool. Update the dataset to add new scenarios.
- **Styling**: Tailwind utility classes (via NativeWind) power most styles. If you introduce new colors, update `tailwind.config.js`.
- **Theme**: `ThemeProvider` reads system settings by default and persists a user toggle. Reference `useTheme()` in new components to stay consistent.

## Testing & QA

Automated tests are not yet configured. Before shipping, manually verify:

- Authentication flows (sign up, sign in, sign out).
- Video capture/upload across iOS and Android, including retry handling.
- Signed URL access for videos, audio, and child images.
- Onboarding checklist routing and dismissal persistence.
- Dark/light theming and font loading.

Consider adding vitest/Jest-based tests for hooks and utility logic, plus Detox or Maestro for high-value flows.

## Contributing

1. Create a topic branch and keep commits scoped.
2. Run `npm run lint` and `npm run format` before raising PRs.
3. Document any schema or environment changes in this `README.md`.
