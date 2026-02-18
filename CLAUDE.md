# Hey Dad Mobile

## Project Structure
```
heydad-mobile-main/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Auth screens (sign-in, sign-up)
│   ├── (tabs)/                   # Main bottom tab navigator (5 tabs)
│   │   ├── index.tsx             # Home screen (prompts grid, record buttons)
│   │   ├── children.tsx          # Children management
│   │   ├── saythis.tsx           # Dad Chat AI
│   │   ├── settings.tsx          # Settings
│   │   └── memories/             # Dad Stories sub-group
│   │       ├── index.tsx         # Stories list
│   │       ├── capture.tsx       # Record video/audio/note
│   │       └── ideas.tsx         # Browse story prompts
│   ├── kids/                     # Kids portal screens (NEW)
│   │   ├── _layout.tsx           # Kids Stack navigator
│   │   ├── code-entry.tsx        # Access code entry (6-char PIN input)
│   │   └── feed.tsx              # TikTok-style video feed
│   ├── _layout.tsx               # Root Stack (index, auth, tabs, kids)
│   └── index.tsx                 # Splash screen
├── components/                   # Reusable components
├── constants/                    # Prompts data (100+ prompts, 9 categories)
├── data/                         # Onboarding, prompts, sayThis data
├── hooks/                        # useAuth, useProfileAccess, etc.
├── providers/                    # ThemeProvider (light/dark/system)
├── utils/                        # supabase client, accessCode, etc.
└── assets/                       # Images, logos
```

## Tech Stack
- **Expo** ~54.0.32 with Expo Router ~6.0.22
- **React Native** 0.81.5, React 19.1.0
- **Supabase** @supabase/supabase-js ^2.57.2
- **State Management**: Zustand ^5.0.8 (useAuth store)
- **Styling**: NativeWind (Tailwind for RN) + react-native-reanimated ~4.1.1
- **Video**: expo-av ~16.0.8
- **Navigation**: Expo Router (file-based, Stack + Tabs)
- **Auth**: Email/password, Apple (expo-apple-authentication), Google (@react-native-google-signin)
- **Fonts**: Merriweather (400, 600, 700) via @expo-google-fonts

## Web Repo Reference
- GitHub: justinleffew/heydad (same Supabase backend)
- Kids portal login: `api/kids-login.js` — queries `children.access_code` column
- Kids content: `api/kids-content.js` — fetches narrations + videos for child
- Kids love: `api/kids-love.js` — calls `increment_love` RPC function
- Feed UI: `src/pages/KidsPage.tsx` — TikTok-style vertical feed
- Key tables from web repo: `kid_love_events`, `dad_notifications`

## Supabase Config
- URL: `https://extfuvnhdbmpcxeecnqc.supabase.co`
- Client: `utils/supabase.ts`
- Key tables: `children`, `videos`, `narrations`, `video_children`, `profiles`, `subscriptions`, `kid_love_events`, `dad_notifications`
- Storage buckets: `videos`, `audio`, `images`, `child-images`
- Access code column: `children.access_code` (text, unique index)
- Love RPC: `increment_love(p_kid_id, p_memory_id, p_memory_type, p_increment)`

## Key Files
- Navigation root: `app/_layout.tsx`
- Tab navigator: `app/(tabs)/_layout.tsx`
- Auth store: `hooks/useAuth.ts` (Zustand with AsyncStorage persistence)
- Profile access: `hooks/useProfileAccess.ts`
- Theme: `providers/ThemeProvider.tsx`
- Supabase client: `utils/supabase.ts`
- Access code utils: `utils/accessCode.ts`
- Kids session storage key: `kids_session` (AsyncStorage)

## Conventions
- NativeWind className for styling (Tailwind classes)
- Inline styles used alongside NativeWind where needed
- Ionicons from @expo/vector-icons for icons
- Dark mode support via useTheme() hook
- File-based routing with Expo Router
- AsyncStorage for local persistence
- Video playback via expo-av Video component with `resizeMode="cover"` (string, not enum)

## Color Palette
- Gold accent: `#c4a471`, `#C2A16C`, `#D4B996`, `#c59a5f`
- Dark navy: `#1a2332`, `#061426`, `#031329`
- Light bg: `#f8fafc`, `#f3f4f6`
- Dark bg: `#1f2937`, `#111827`
- Text primary light: `#1e293b` (slate-800)
- Text muted: `#94a3b8` (slate-400)
- Success green: `#10b981`

## Changelog — UX Overhaul

### Change 3: Remove Pocket Dad from Home Screen — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed `import PocketDadCard from 'components/PocketDadCard'`
- Removed `<PocketDadCard onPressCta={...} />` JSX block from Home screen
- `components/PocketDadCard.tsx` and `components/PocketDadSignupModal.tsx` are now dead code (not deleted, just unused)
- The Dad Chat tab (`saythis.tsx`) still calls the Pocket Dad API — that's the feature itself, just the promo card was removed

### Change 2: Fix Dad Chat Whitespace — ✅ Complete
- Files modified: `app/(tabs)/saythis.tsx`
- Changed header padding from `py-3` (12px) to `py-2` (8px) on the header View
- The screen uses `SafeAreaView edges={['top']}` which correctly handles notch/Dynamic Island
- Reduced gap between safe area inset and "Dad Chat" title text

### Change 6: Overall UX Polish — ✅ Complete
- Files modified: `app/(auth)/sign-in.tsx`, `components/ChildrenGrid.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`
- **Sign-in button**: Changed from gray `bg-slate-800` to gold `#c4a471` when form is filled. Disabled state is still gray.
- **Access code font**: Changed to monospace (`Menlo` on iOS, `monospace` on Android), increased to `text-3xl`, letterSpacing 8
- **Screen transitions**: Added `animation: 'fade'` to root Stack screenOptions
- **Tab bar labels**: Increased fontWeight from `'500'` to `'600'` for better active tab distinction (active color already `#c4a471`)

### Change 4: Redesign Home Screen Story Prompts — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed `TryThisCard` component usage and import
- Removed `getAllCategories`, `getPromptsByCategory` imports from constants
- Removed single-prompt state: `prompt`, `shufflesLeft`, `promptCategory`, `shufflePrompt()`, initial prompt useEffect
- Added `STORY_PROMPTS` constant (10 prompts with emoji, title, subtitle) outside the component
- Added `pickRandomPrompts(count)` utility function
- Added `activePrompts` state initialized with 4 random picks
- Prompts refresh on each screen focus via `useFocusEffect`
- 2x2 grid layout with white card backgrounds, rounded corners (14px), subtle shadow, border
- Each card navigates to capture screen with `selectedPrompt: p.title`
- "Story Prompts" section title added above the grid

### Change 1: Kids Portal Login on Login Screen — ✅ Complete
- Files modified: `app/(auth)/sign-in.tsx`
- Files created: `app/kids/_layout.tsx`, `app/kids/code-entry.tsx`
- Added "Are you a kid?" divider below "Sign up here" link
- Added dark navy "Enter Kid's Code" button with play-circle icon
- Button navigates to `/kids/code-entry` via Expo Router Link
- **KidsCodeEntry screen**:
  - Logo (smaller), "Enter Your Code" header, "Ask your dad" subtext
  - 6-character PIN input with individual rounded boxes (48x58px)
  - Active box border is gold `#c4a471`, error state is red
  - Auto-advance on input, auto-submit when all 6 filled
  - Paste support (first box accepts full code)
  - Backspace moves to previous box
  - Validates against `children.access_code` column in Supabase
  - On success: stores kid session in AsyncStorage (`kids_session` key) and navigates to `/kids/feed`
  - On failure: shake animation (react-native-reanimated), inline error message, clears inputs
  - Back button returns to sign-in screen
- Decision: Used 6-char code length to match `generateChildAccessCode(length = 6)` default

### Change 5: Kids TikTok-Style Feed — ✅ Complete
- Files created: `app/kids/feed.tsx`
- **Fullscreen vertical feed**: FlatList with `pagingEnabled`, `snapToInterval={SCREEN_HEIGHT}`
- **Video playback**: expo-av Video component, auto-play active item, pause inactive, loop enabled
- **Tap to play/pause**: Single tap toggles with brief play icon overlay animation
- **Double-tap hearts**: Detects double-tap (300ms window), renders animated heart at tap location (scale up + fade out over 650ms)
- **Love batching**: Accumulates double-tap counts per memory, flushes via `increment_love` RPC after 750ms debounce
- **Memory type detection**: Checks both `videos` and `narrations` tables to determine type before calling RPC
- **Content fetching**:
  - Loads kid session from AsyncStorage
  - Queries `children` table for child info
  - Queries `video_children` for video assignments, then `videos` for video records
  - Queries `narrations` filtered by `selected_children` containing child ID
  - Generates signed URLs for video files, thumbnails, audio, and images from Supabase Storage
  - Filters by unlock status (now/date/age/milestone logic matching web repo)
  - Sorts newest first
- **Locked content**: Shows lock icon with "More stories are coming!" at end of feed
- **Empty state**: Shows Hey Dad logo with "Dad hasn't recorded any stories yet"
- **Audio stories**: Display with background image and gradient overlay, "Audio Story" label
- **Exit flow**: Three-dot menu (top-right) → "Exit" clears AsyncStorage session → navigates to sign-in
- **Menu**: Popover with backdrop dismiss, positioned below menu button
- Decision: Used direct Supabase queries from client (no server API) since the web repo uses server-side JWT sessions but mobile stores session locally
- Decision: Did NOT create new `kid_love_events` table — assumes it already exists from web repo migrations

## Known Issues
- `kid_love_events` table and `increment_love` RPC must exist in Supabase (created by web repo migration `20260210_kid_love_events.sql`). If the migration hasn't been applied, love events will fail silently.
- `PocketDadCard.tsx` and `PocketDadSignupModal.tsx` are dead code — can be safely deleted if desired.
- `TryThisCard.tsx` is now dead code — only used by the old single-prompt card.
- The kids feed doesn't have audio playback for `audio` type stories — it displays them visually but doesn't auto-play the audio. This could be added as a follow-up.
- Access code validation uses direct Supabase query (no RLS policy check). Ensure the `children` table has appropriate RLS policies or that the anon key has select access on `children.access_code`.

## Testing Notes
- [ ] Dad can log in via email/password, Apple, and Google — all still work
- [ ] Kid can enter a valid code and see the feed
- [ ] Kid entering an invalid code gets a clear error (shake + inline message)
- [ ] Kid feed auto-plays videos, pauses on swipe
- [ ] Kid feed double-tap shows heart animation
- [ ] Kid can exit the feed via three-dot menu
- [ ] Home screen shows 4 random prompts from the pool of 10
- [ ] Home screen has no Pocket Dad references anywhere
- [ ] Dad Chat has no excess whitespace above the header
- [ ] All screens have consistent typography, spacing, and colors
- [ ] Sign-in button shows gold color when form is filled
- [ ] Access codes display in monospace font on Children screen
- [ ] App works on iPhone SE through iPhone 15 Pro Max
- [ ] No "Pocket Dad" string appears in the UI (still exists in Dad Chat API calls, which is expected)
