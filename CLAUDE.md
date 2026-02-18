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

## Changelog — Round 2 Fixes (Post-Testing)

### Fix 1: Kids Code Entry Validation Bug — ✅ Complete
- Files modified: `app/kids/code-entry.tsx`
- **Root cause**: Used `.single()` which throws `PGRST116` error when no rows found, making it indistinguishable from real DB/RLS errors
- Changed `.single()` to `.maybeSingle()` — returns `null` instead of an error when no rows match
- Split error handling: DB/RLS errors now show "Something went wrong" vs invalid code shows "That code didn't work"
- Added `console.error` logging for real errors to aid debugging
- Catch block now also shows "Something went wrong" instead of masking JS errors as invalid codes
- Note: `toUpperCase()` normalization is correct — access code alphabet (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`) is all uppercase
- **Important**: If codes still fail, check RLS policies on `children` table — anon key needs select access on `access_code` column

### Fix 6: Update Home Screen Subtitle — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Changed subtitle from "Record something now. Talk about a photo, add a quick note, or record a video" to "One day, this will mean everything."

### Fix 3: Remove "Record Your Own Thing" Section — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed entire "Record Your Own Thing" section (title + 3 icon buttons: Tell a Story, Video Story, Write a Story)
- These actions are still accessible via the prompt cards and the hero CTA button

### Fix 2: Replace Subscription Banner with Personalized Hero CTA — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed `LinearGradient` import (no longer used)
- Removed old gold gradient banner showing subscription/trial status and "Get Story Pack" button
- Added new hero CTA card with:
  - "TODAY'S STORY" label with videocam icon in gold
  - Personalized title: "Record a video for {child_name}" (uses first child's name, or "Record your first story" if no children)
  - Warm subtitle: "They'll thank you for this someday."
  - Gold "Start Recording" button navigating to video capture
- Dark mode support with appropriate background/text colors
- Card has white background, rounded corners, subtle border and shadow

### Fix 4: "Your Legacy So Far" Stats Section — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Added new section between Story Prompts and modals area
- Three stat cards in a row:
  - **Total Stories**: `videos.length + narrations.length`
  - **This Month**: count of videos + narrations created in current calendar month
  - **Kids Watching**: `children.length`
- Each card has: icon in warm circle background, large number, uppercase label
- Gold accent icons (`#c4a471`), consistent card styling with border and shadow
- Dark mode support

### Fix 5: Visual Depth Pass — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- **Background**: Changed light mode from `bg-gray-100` (#f3f4f6) to warm gray `#F8F7F5`
- **Card borders**: Changed from `#e5e7eb` to warmer `#e8e5e0` in light mode
- **Hero CTA shadows**: Increased from `shadowOpacity: 0.08, shadowRadius: 8` to `0.10, 12`
- **Prompt card shadows**: Increased from `shadowOpacity: 0.05, shadowRadius: 3` to `0.08, 6`
- **Prompt cards**: Added gold left border (`borderLeftWidth: 3, borderLeftColor: '#c4a471'`)
- **Emoji circles**: Wrapped prompt emojis in warm-toned circles (`#FBF7F0` light, `#374151` dark)
- **Stat card shadows**: Increased to match prompt cards
- **Stat icon backgrounds**: Changed to warm `#FBF7F0` (light mode)
- **Bottom spacing**: Added 32px bottom padding to ScrollView content
- All elevation values increased from 2 to 3–4 for Android depth

## Changelog — Round 3 Fixes (Post-Testing)

### Fix 7: Hero CTA Copy — Remove Pronouns — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed all pronoun-based subtext ("They'll thank you for this someday.")
- New subtext: "This will mean the world one day." — always the same, no pronouns
- Headline now picks a random child name on each render (or "Record a video for your kids" if none)
- No `getPronoun()` or gender references existed in codebase — confirmed clean
- No gender column on `children` table — confirmed

### Fix 1: Legacy Section Scroll Bug — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed `stickyHeaderIndices={[1]}` from ScrollView (was causing layout calculation issues)
- Added `contentContainerStyle={{ paddingBottom: 100 }}` to ScrollView to clear tab bar
- Added `minHeight: 120` and `justifyContent: 'center'` to stat cards to prevent collapse
- Changed legacy section container from NativeWind classes to explicit `style` for reliable layout
- Removed old `<View style={{ height: 32 }} />` bottom spacer (now handled by contentContainerStyle)

### Fix 3: Convert Prompts to Horizontal Slider — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Replaced 2x2 grid with horizontal `FlatList` (`RNFlatList`)
- Added `Dimensions` and `FlatList as RNFlatList` imports
- Card sizing: 160x180px fixed, shows ~2.2 cards at a time
- Shows all 10 prompts in order (no longer randomly picks 4)
- Removed `pickRandomPrompts()` function and `activePrompts` state
- Added "See All Prompts" card at end — navigates to existing `(tabs)/memories/ideas` screen
- `snapToInterval={PROMPT_CARD_WIDTH + 12}` with `decelerationRate="fast"` for snapping
- Reduced "Story Prompts" header to 16px semibold to save vertical space

### Fix 2: Bold Masculine Color Overhaul — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`, `app/(tabs)/_layout.tsx`
- **Background**: Changed from `#F8F7F5` to warm linen `#F5F3EF`
- **Hero CTA**: Replaced flat white card with dark gradient `LinearGradient` from `#1B2838` to `#2C3E50`
  - Gold `#D4A853` for label, button, and accents
  - White headline on dark background — premium feel
  - Button has gold glow shadow: `shadowColor: '#D4A853', shadowOpacity: 0.3`
  - Button text is dark navy on gold (reversed contrast)
- **Prompt cards**: Stronger shadow (`shadowOpacity: 0.12, shadowRadius: 12`), 4px gold left border with `#D4A853`, dark navy `#1B2838` title text
- **Stat cards**: Light navy tint background `#F0F2F5`, numbers at 32px bold, labels with `letterSpacing: 1`, icon backgrounds `#E8E5DF`
- **Section headers**: Dark navy `#1B2838`, semibold 20px
- **Home title**: 24px bold dark navy (was text-3xl NativeWind class)
- **Tab bar**: Active `#D4A853` (richer gold), inactive `#9CA3AF`
- Restored `LinearGradient` import from `expo-linear-gradient`

### Fix 4: Dad Chat Whitespace + Kids Photos — ✅ Complete
- Files modified: `app/(tabs)/saythis.tsx`
- Replaced `SafeAreaView edges={['top']}` with `<View style={{ paddingTop: insets.top + 8 }}>` using `useSafeAreaInsets()`
- Header now uses `pb-2` only (no `py-2`), removing top padding entirely — snug to safe area
- Removed "Chatting about {name}" subtitle line from header to save space
- Added `Image` import from react-native
- Added `childAvatars` state with signed URL fetching from `child-images` storage bucket
- Updated children query to include `image_path` column
- Child selector chips now show circular profile photos (28px diameter) + name
- Placeholder initial (dark navy circle, white letter) when no photo
- Active chip has gold border `#D4A853` with subtle gold background tint
- Inactive chip has gray border, no fill

### Fix 5: Dad Chat UX Personality — ✅ Complete
- Files modified: `app/(tabs)/saythis.tsx`
- **Empty state redesigned**:
  - Replaced generic `chatbubbles-outline` icon with Hey Dad logo (`assets/logo.png`) in warm 80px circle
  - Header changed from "Dad Chat" to "What's on your mind, Dad?" — left-aligned, 22px semibold, dark navy
  - Subtitle left-aligned, 14px gray
  - Content positioned at top ~20% (not vertically centered)
- **Suggestion pills redesigned**:
  - Left-aligned with warm gold tint background `#FBF7F0`
  - 2px gold left border accent on each pill
  - Dark navy text, 14px
- **Input bar redesigned**:
  - Added subtle top shadow (`shadowOpacity: 0.05, shadowRadius: 4`)
  - White background with border separation
  - Send button: gold `#D4A853` background when active (text entered), gray when empty
  - White arrow icon on gold background

### Fix 6: Dad Chat Input Placeholder Text — ✅ Complete
- Files modified: `app/(tabs)/saythis.tsx`
- Changed from "Ask me anything about being a dad..." to "What's on your mind?"

## Changelog — Round 4 Fixes (Post-Testing)

### Fix 5: Rename "Dad Stories" Tab to "Stories" — ✅ Complete
- Files modified: `app/(tabs)/_layout.tsx`, `app/(tabs)/memories/index.tsx`
- Changed tab bar label from "Dad Stories" to "Stories" in `_layout.tsx` (line 129)
- Changed screen title from "Dad Stories" to "Stories" in `memories/index.tsx`
- Searched codebase — no other user-facing "Dad Stories" strings found

### Fix 6: Stories Screen — Prioritize Video Content — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- **Default tab**: Changed from `'audio'` to `'video'` in both `useState` and `useEffect`
- **Tab order**: Reordered from Narration → Video → Quick Note to **Video → Narration → Quick Note**
- **Video card play button**: Replaced flat `bg-black/20` overlay with semi-transparent white circle (56px, `rgba(255,255,255,0.85)`) with dark navy play icon and shadow
- **Video card shadows**: Added `shadowOpacity: 0.1, shadowRadius: 8, elevation: 3` to video cards
- **Delete buttons softened**: Replaced red trash icon + "Delete" text with muted gray ellipsis (`ellipsis-horizontal`) icon across all three tabs (Video, Narration, Quick Note) — less destructive feel, still triggers delete modal
- Removed unused `setSelectedVideo` prop from `VideoPlayerWithNotes` usage

### Fix 4: Dad Chat — Eliminate Top Padding, Bigger Header — ✅ Complete
- Files modified: `app/(tabs)/saythis.tsx`
- **Nuclear padding fix**: Changed `paddingTop: insets.top + 8` to `paddingTop: insets.top` — zero extra padding above safe area
- **Header title**: Changed from NativeWind `text-xl font-merriweather` to inline style `fontSize: 28, fontWeight: '700'`, color dark navy `#1B2838` (light) / `#f3f4f6` (dark)
- Header now sits immediately at safe area edge with no extra whitespace

### Fix 2: Quick Note Viewer — Mature Redesign — ✅ Complete
- Files modified: `components/NotesModal.tsx`
- **Complete rewrite** — removed all yellow/amber/birthday-card styling
- Removed: `LinearGradient`, `FontAwesome` star icons, heart icon, amber borders, orange gradient, decorative blobs
- Added: `useTheme()` hook for dark mode support
- **New design**:
  - Clean white background (dark: `#0f172a`) with rounded corners (16px)
  - Gold accent bar (40x3px, `#D4A853`) above title — subtle brand mark
  - Left-aligned title (24px bold, dark navy), formatted date (long format with weekday)
  - Clean body text (16px, 26px line height) in a simple ScrollView
  - Close button: small circle in top-right corner
  - Footer: full-width dark navy close button with 12px border radius
  - No decorative elements — dignified letter-like reading experience

### Fix 1: Record a Story Screen — Brand Identity — ✅ Complete
- Files modified: `app/(tabs)/memories/capture.tsx`
- **Background**: Changed light mode from `bg-gray-50` to warm linen `bg-[#F5F3EF]`
- **Content surface**: Changed from `bg-gray-100` to `bg-[#F5F3EF]`
- **Section cards**: Changed borders from `border-gray-300` to warm `border-[#e8e5e0]`
- **Headings**: Changed from `text-slate-600` to dark navy `text-[#1B2838]`
- **Tab pills**: Active state changed from `bg-gray-800` to `bg-[#1B2838]`, inactive borders to `border-[#d1cdc6]`
- **CTA buttons**: "Start Camera" and "Save Video" now use gold `#D4A853` background with dark navy text and gold glow shadow
- **Unlock selector**: Pills changed from `bg-[#c59a5f]` to `bg-[#D4A853]` with warmer inactive borders
- **Ideas button**: Changed from `bg-slate-800` to `bg-[#1B2838]`
- **Title**: Changed from NativeWind `text-3xl font-merriweather` to inline style `fontSize: 28, fontWeight: '700'`, dark navy
- **Save Your Story (step 2)**: Updated heading to inline style 24px bold dark navy
- **Upload accent**: Changed from green to gold `text-[#D4A853]`

### Fix 3: Video Playback — Fullscreen TikTok-Style — ✅ Complete
- Files modified: `components/VideoPlayerWithNotes.tsx`
- **Complete rewrite** — replaced split-view modal with fullscreen immersive player
- **Fullscreen video**: `Video` component fills entire screen (`SCREEN_WIDTH x SCREEN_HEIGHT`), `resizeMode="cover"`, auto-play, looping
- **Tap to play/pause**: Single tap toggles playback, shows brief play/pause icon overlay (72px circle, fades after 600ms)
- **Top overlay**: LinearGradient from black to transparent, contains:
  - Close button (40px circle, `rgba(0,0,0,0.4)`) — top-left
  - "Notes" pill button with comment count — top-right
- **Bottom overlay**: LinearGradient from transparent to black, contains:
  - Story title (22px bold white)
  - Date (formatted long date, semi-transparent white)
  - Gold progress bar (`#D4A853`) showing playback position
  - Time labels (current / total)
- **Details panel**: Slides up from bottom (65% screen height) with:
  - Drag handle bar at top
  - PanResponder for swipe-down-to-dismiss (threshold: 120px or velocity > 0.5)
  - Backdrop dismiss on tap
  - Title, comment count, close button in header
  - Comment input with gold send button (`#D4A853`)
  - Timestamped comments with gold accent colors
  - Reply functionality preserved
- Removed dependencies on: old split-view layout, `md:` responsive classes, square aspect ratio video
- Uses `PanResponder` from react-native core (no additional gesture handler dependency needed)
- Added `LinearGradient` import from `expo-linear-gradient`

## Known Issues
- `kid_love_events` table and `increment_love` RPC must exist in Supabase (created by web repo migration `20260210_kid_love_events.sql`). If the migration hasn't been applied, love events will fail silently.
- `PocketDadCard.tsx` and `PocketDadSignupModal.tsx` are dead code — can be safely deleted if desired.
- `TryThisCard.tsx` is now dead code — only used by the old single-prompt card.
- The kids feed doesn't have audio playback for `audio` type stories — it displays them visually but doesn't auto-play the audio. This could be added as a follow-up.
- Access code validation now uses `.maybeSingle()` for proper error handling. If codes still fail, verify RLS policies on `children` table allow anon select on `access_code`.
- Hero CTA picks a random child name on each render — this means it can change if the component re-renders. If consistent names are desired, use `useMemo` or state to pin it per session.
- The `SafeAreaView` import in `saythis.tsx` is replaced with `useSafeAreaInsets` — the `react-native-safe-area-context` package is still a dependency.

## Testing Notes — Round 3
- [ ] Home screen scrolls all the way to the bottom — legacy stats fully visible above tab bar
- [ ] Hero CTA has dark navy gradient background with gold button
- [ ] Hero CTA shows random child name (or "your kids" if none)
- [ ] Hero CTA subtext reads "This will mean the world one day." (no pronouns)
- [ ] Story prompts are a horizontal slider showing ~2 cards at a time
- [ ] Swiping through prompts shows all 10 + "See All Prompts" card at end
- [ ] "See All Prompts" navigates to the ideas/prompts browsing screen
- [ ] Stat numbers are large (32px), cards have light navy tint background
- [ ] Tab bar active icon is richer gold (#D4A853), inactive is medium gray
- [ ] Background color is warm linen (#F5F3EF) in light mode
- [ ] Dad Chat header is snug to safe area — no excessive white space
- [ ] Child chips show profile photos (or initial placeholders)
- [ ] Selected chip has gold border/tint treatment
- [ ] Dad Chat empty state shows Hey Dad logo, left-aligned content, warm suggestion pills
- [ ] Dad Chat input placeholder reads "What's on your mind?"
- [ ] Send button turns gold when text is entered
- [ ] Dark mode still renders correctly across all screens
- [ ] No pronoun references (he'll/she'll/they'll) in any CTA copy
- [ ] App works on iPhone SE through iPhone 15 Pro Max

## Testing Notes — Round 4
- [ ] Tab bar shows "Stories" instead of "Dad Stories"
- [ ] Stories screen defaults to Video tab on first load
- [ ] Tab order is: Video → Narration → Quick Note
- [ ] Video cards have white circle play button overlay with shadow
- [ ] Video cards have subtle shadow elevation
- [ ] Delete buttons are muted gray ellipsis icons (not red trash icons) on all three tabs
- [ ] Tapping ellipsis still opens the delete confirmation modal
- [ ] Dad Chat header has zero extra padding above safe area
- [ ] Dad Chat title is 28px bold dark navy
- [ ] Quick Note viewer has clean white/dark background with gold accent bar
- [ ] Quick Note viewer shows long-format date with weekday
- [ ] Quick Note viewer has no yellow, hearts, stars, or decorative elements
- [ ] Record a Story screen has warm linen background (#F5F3EF) in light mode
- [ ] Record a Story CTA buttons are gold with dark navy text
- [ ] Unlock selector pills use gold (#D4A853) for active state
- [ ] Video player opens in fullscreen (fills entire screen)
- [ ] Tapping video toggles play/pause with brief icon overlay
- [ ] Video player shows title and date at bottom with gradient overlay
- [ ] Gold progress bar shows playback position
- [ ] "Notes" button in top-right opens slide-up details panel
- [ ] Details panel can be swiped down to dismiss
- [ ] Tapping backdrop also closes details panel
- [ ] Comments/notes work correctly in the details panel
- [ ] Close button in top-left closes the video player
- [ ] Dark mode renders correctly across all modified screens
- [ ] App works on iPhone SE through iPhone 15 Pro Max
