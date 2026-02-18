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

## Changelog — Round 5 Fixes (Post-Testing)

### Fix 1: Dad Chat Top Padding — ROOT CAUSE FOUND — ✅ Complete
- Files modified: `app/(tabs)/saythis.tsx`
- **Root cause**: `ProtectedRoute.tsx` wraps ALL tab screens in `<SafeAreaView style={{ flex: 1 }}>`, which already applies safe area top inset. But `saythis.tsx` was ALSO applying `paddingTop: insets.top`, doubling the top padding. This is why every previous fix (Rounds 1-4) failed — they reduced the duplicate padding but never eliminated it.
- **Fix**: Removed `paddingTop: insets.top` entirely from the root `<View>` in saythis.tsx
- Removed `useSafeAreaInsets` import (no longer needed since ProtectedRoute handles it)
- Removed `insets` variable
- **Restructured KeyboardAvoidingView**: Moved to wrap ONLY the chat content (messages + input), NOT the header
- Render tree is now: `ProtectedRoute(SafeAreaView) → View(flex:1) → Header → KeyboardAvoidingView(messages + input)`

### Fix 5: Rename Tab Labels — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- Changed tab pill labels: "Video" → "Videos", "Narration" → "Photos", "Quick Note" → "Notes"

### Fix 6: Video Button as Primary CTA — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- Removed old button layout (gold "Tell a Story" + secondary "Video Story" / "Write a Story")
- New layout: Full-width dark navy `#1B2838` "Record a Video" hero button with gold videocam icon, shadow
- Secondary row: "Photo Story" and "Write a Note" side-by-side with outline styling and icons
- Video is now the dominant action

### Fix 7: Home Screen — No Scroll, One Viewport — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Removed `ScrollView` entirely — replaced with flex `View`
- Layout: Header → Hero CTA → Prompt Slider → Flex Spacer → Legacy Stats
- Stats anchored to bottom via `flex: 1` spacer
- Compact stat cards (no icon circles, smaller text labels: "Stories", "This Month", "Kids")
- Removed `ScrollView` from imports
- Hero CTA slightly compacted (smaller padding, reduced font sizes)
- Everything fits in one viewport without scrolling

### Fix 4: Quick Notes — Fixed Broken Modal — ✅ Complete
- Files modified: `components/NotesModal.tsx`, `app/(tabs)/memories/index.tsx`, `app/(tabs)/index.tsx`
- **Root cause**: `NotesModal` required a `visible` prop but callers used `{...selectedNote}` spread which doesn't include `visible` — the narration object has no `visible` field, so `Modal visible={undefined}` = never shows
- **Fix**: Added `visible = true` default parameter in NotesModal component
- Also added explicit `visible={true}` prop in both callers (memories/index.tsx and index.tsx) for clarity
- Notes should now open correctly when tapped

### Fix 2: Stories Screen Visual Elevation — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- **Background**: Changed from `bg-gray-50` to warm linen `bg-[#F5F3EF]`
- **Title**: Changed from NativeWind `text-4xl font-merriweather` to inline style `fontSize: 28, fontWeight: '700'`, dark navy
- **Section heading**: "Recorded Stories" → "Your Stories", inline style 18px semibold
- **Tab pills redesigned**: Row with icons (videocam, image, create) + labels, active uses dark navy bg with gold icon (dark mode: gold bg with dark icon), rounded 10px
- **Card borders**: Changed to warm `border-[#e8e5e0]`
- **Metadata text**: Changed to `text-[#6B7280]` for consistency
- **Chip styling**: Inactive borders warm `border-[#d1cdc6]`, text dark navy

### Fix 3: Fullscreen Video Swipe-Up Navigation — ✅ Complete
- Files modified: `components/VideoPlayerWithNotes.tsx`, `app/(tabs)/memories/index.tsx`
- **Complete rewrite** to TikTok-style vertical video feed
- New props: `allVideos` (full video list) and `allVideoUrls` (signed URL map)
- **FlatList with pagingEnabled**: Vertical scroll, `snapToInterval={SCREEN_HEIGHT}`, `snapToAlignment="start"`
- **FeedVideoItem component**: Each video fills full screen, auto-play when active, pause when inactive via `useEffect` on `isActive` prop
- **onViewableItemsChanged**: Tracks which video is visible (60% threshold), updates `activeIndex`
- **initialScrollIndex**: Opens feed at the tapped video position
- **End-of-list card**: "You're all caught up" with checkmark icon and message
- **Comments**: Available via "Notes" pill button (top-right), opens same PanResponder slide-up panel
- **Signed URL generation**: `handlePlayVideo` now generates signed URLs for ALL videos in parallel before opening the player
- `allVideoSignedUrls` state added to memories/index.tsx
- Single-video fallback: If `allVideos` is empty, falls back to single-video mode (backward compatible)

## Known Issues
- `kid_love_events` table and `increment_love` RPC must exist in Supabase (created by web repo migration `20260210_kid_love_events.sql`). If the migration hasn't been applied, love events will fail silently.
- `PocketDadCard.tsx` and `PocketDadSignupModal.tsx` are dead code — can be safely deleted if desired.
- `TryThisCard.tsx` is now dead code — only used by the old single-prompt card.
- The kids feed doesn't have audio playback for `audio` type stories — it displays them visually but doesn't auto-play the audio. This could be added as a follow-up.
- Access code validation now uses `.maybeSingle()` for proper error handling. If codes still fail, verify RLS policies on `children` table allow anon select on `access_code`.
- Hero CTA picks a random child name on each render — this means it can change if the component re-renders. If consistent names are desired, use `useMemo` or state to pin it per session.
- Dad Chat padding was caused by double safe area inset: `ProtectedRoute.tsx` wraps in `SafeAreaView` AND `saythis.tsx` added `paddingTop: insets.top`. Fixed in Round 5 by removing the duplicate.
- Home screen no longer scrolls — if content doesn't fit on very small screens (iPhone SE), the flex spacer may collapse to zero and stats may overlap the tab bar. Test on smallest screens.
- Video feed generates signed URLs for ALL videos when opening the player. For users with many videos, this may cause a brief delay on first tap.

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

## Testing Notes — Round 5
- [ ] Dad Chat has NO extra white space above header — "Dad Chat" text sits right below safe area
- [ ] Dad Chat header does not scroll with messages (KeyboardAvoidingView wraps only chat content)
- [ ] Dad Chat keyboard doesn't push header off screen
- [ ] Stories screen tab pills show "Videos", "Photos", "Notes" (not "Video", "Narration", "Quick Note")
- [ ] Tab pills have icons (videocam, image, create) next to labels
- [ ] Active tab pill is dark navy with gold icon (dark mode: gold bg with dark icon)
- [ ] Stories screen has warm linen background (#F5F3EF) in light mode
- [ ] "Record a Video" is the big primary button (full-width dark navy with gold icon)
- [ ] "Photo Story" and "Write a Note" are secondary side-by-side outline buttons
- [ ] Section heading reads "Your Stories" (not "Recorded Stories")
- [ ] Home screen fits entirely in one viewport — no scrolling needed
- [ ] Story prompts still swipe horizontally
- [ ] Legacy stats ("Stories", "This Month", "Kids") are anchored at bottom
- [ ] No ScrollView on home screen
- [ ] Quick Notes modal opens when tapping a note (was broken — now fixed)
- [ ] Quick Notes modal shows clean design with gold accent bar
- [ ] Video player opens in TikTok-style feed — swipe up to see next video
- [ ] Swiping down goes to previous video
- [ ] Active video auto-plays, inactive videos are paused
- [ ] Video feed starts at the tapped video position
- [ ] End-of-list card shows "You're all caught up" message
- [ ] Notes pill button (top-right) opens comments panel from feed
- [ ] Close button exits the entire feed
- [ ] Dark mode renders correctly across all modified screens
- [ ] App works on iPhone SE through iPhone 15 Pro Max

## Changelog — Round 6A (Stories Screen + Record Flow)

### Fix 1: Restructure Stories Screen — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- **Header**: Changed to "Your Stories" — 28px bold, dark navy, LEFT-aligned (was centered "Stories")
- **Deleted**: Entire top button card (Record a Video hero button, Photo Story, Write a Note secondary buttons)
- **Deleted**: "Your Stories" section heading label (redundant since header now says "Your Stories")
- **Tab filters**: Moved directly below header (Videos/Photos/Notes pills with icons)
- **Floating Action Button**: 56px dark navy circle with white "+" icon
  - Position: `right: 20, bottom: insets.bottom + 70` (clears tab bar)
  - `zIndex: 100`, shadow with `shadowOpacity: 0.3, elevation: 6`
  - On tap → navigates to Record a Story screen
- Added `useSafeAreaInsets` import for FAB positioning

### Fix 2: Thumbnail Grid Layout — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- **Complete rewrite** of VideoList, NarrationList, NotesList into VideoGrid, PhotoGrid, NotesGrid
- **FlatList with `numColumns={2}`**: 10px gap, 16px horizontal padding
- **Thumbnail dimensions**: `width = (screenWidth - 42) / 2`, `aspectRatio: 0.8`, `borderRadius: 14`
- **Video thumbnails**: Image fills card, dark gradient overlay at bottom with title (white, bold, 13px), duration badge (dark pill, bottom-right, 11px)
- **Photo thumbnails**: Same grid layout, signed image fills card, gradient overlay with title, duration badge if available
- **Notes tab**: 2-col grid of text preview cards — title (15px bold), ~120 char preview, date at bottom, gold left border accent (3px)
- **No metadata below thumbnails** — everything overlaid or inside card
- **Delete**: Long-press on any thumbnail opens delete modal (replaces old ellipsis button)
- `contentContainerStyle={{ paddingBottom: 80 }}` so FAB doesn't cover last row
- Removed old `ScrollView` based list components, `VideoList`, `NarrationList`, `NotesList`
- Added `Dimensions` import for grid calculations

### Fix 3: Empty States — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`
- **Removed** old empty state component with "Record your first video" text
- **New empty state**: Single centered mock thumbnail card (same size as real thumbnails)
  - `LinearGradient` background (`#2C3E50` to `#1B2838`)
  - Centered icon (videocam/image/create) in translucent white circle
  - White 14px translucent text: "Your first story will appear here" / "Your first photo story..." / "Your first note..."
  - `borderRadius: 14`, tappable → navigates to Record screen
  - Different icon + label for each tab (video/photo/note)

### Fix 4: Record Screen — Bottom Footnote Links — ✅ Complete
- Files modified: `app/(tabs)/memories/capture.tsx`
- Added footnote links at bottom of step 1 content: "Or: Take a Photo · Write a Note"
- 13px text, gray "Or:" label, gold (#D4A853) tappable words
- Dynamically shows only the OTHER two modes (not the current tab)
- Video tab → shows "Take a Photo · Write a Note"
- Audio tab → shows "Record a Video · Write a Note"
- Note tab → shows "Record a Video · Take a Photo"
- Positioned with `marginTop: 24, marginBottom: 16` — feels like footnotes

### Fix 5: Post-Record Navigation — ✅ Complete
- Files modified: `app/(tabs)/memories/capture.tsx`
- Video save: `router.replace({ pathname: '(tabs)/memories', params: { defaultTab: 'video' } })`
- Audio/photo save: `router.replace({ pathname: '(tabs)/memories', params: { defaultTab: 'audio' } })`
- Note save: `router.replace({ pathname: '(tabs)/memories', params: { defaultTab: 'note' } })`
- After saving, user auto-navigates back to Stories screen with the correct tab selected
- New story appears in grid immediately (data refreshes via `useFocusEffect`)

## Known Issues (Round 6A)
- Delete action is now via long-press on thumbnail cards (no visible delete button). Users may not discover this immediately. Could add a swipe-to-delete or visible menu later.
- Empty state thumbnail card is a single card centered in the view — if screen is very wide, it may look small. Acceptable on mobile.
- FAB position uses `insets.bottom + 70` to clear the tab bar. On devices with very tall tab bars or very small bottom insets, positioning may need adjustment.

## Testing Notes — Round 6A
- [ ] Stories screen header reads "Your Stories" — 28px bold, dark navy, LEFT-aligned
- [ ] No button card (Record a Video / Photo Story / Write a Note) anywhere on Stories screen
- [ ] Tab filters (Videos/Photos/Notes) sit directly below header with icons
- [ ] Floating "+" button visible in bottom-right corner (dark navy circle, white + icon)
- [ ] Tapping FAB navigates to Record a Story screen
- [ ] FAB has shadow and sits above content (z-index 100)
- [ ] Videos tab shows 2-column thumbnail grid
- [ ] Each video thumbnail fills card, has dark gradient overlay with title
- [ ] Duration badge shows in bottom-right of each video thumbnail
- [ ] Tapping a video opens fullscreen TikTok-style player
- [ ] Long-pressing a video opens delete confirmation modal
- [ ] Photos tab shows 2-column thumbnail grid with image fills
- [ ] Notes tab shows 2-column text preview cards with gold left border
- [ ] Note cards show title, ~120 char preview, and date
- [ ] Tapping a note opens the NotesModal viewer
- [ ] Empty state (no content) shows single mock thumbnail card with gradient
- [ ] Empty state card is tappable → navigates to Record screen
- [ ] Different empty state icon/text per tab (video/photo/note)
- [ ] Record screen shows footnote "Or: Take a Photo · Write a Note" at bottom (when on video tab)
- [ ] Footnote links switch to the other recording modes
- [ ] Footnote text is gold on tappable words, gray on non-interactive text
- [ ] After saving a video → returns to Stories screen, Videos tab active, new video visible
- [ ] After saving a photo story → returns to Stories screen, Photos tab active
- [ ] After saving a note → returns to Stories screen, Notes tab active
- [ ] Dark mode renders correctly across Stories and Record screens
- [ ] App works on iPhone SE through iPhone 15 Pro Max

## Changelog — Round 6B (Home Screen Enhancements)

### Fix 1: Hero CTA — Animated Child Name — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- **Animated child name**: "Record a video for {name}" where {name} fades in gold `#D4A853`
- Cycle: every 3.5s — fade out (400ms via `Animated.timing`), swap to next child, fade in (400ms)
- Uses `useNativeDriver: true` for performance
- `nameOpacity` ref + `activeChildIndex` state track the animation
- Single child: still pulses (fade out/in same name) for visual interest
- Zero children: static "your kids" in gold, no animation
- Rest of headline ("Record a video for ") stays static white
- Subtext "This will mean the world one day." does NOT animate
- Removed old `Math.random()` child name picker (was causing re-renders)
- Added `Animated` import from react-native, `useRef` import

### Fix 2: "Last Recorded" Line Below Hero CTA — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Single line: 📹 Last story: "Title" · 3 days ago
- Camera emoji in 14px, "Last story:" in `#9CA3AF` 13px, title in navy 13px semibold (truncated at 25 chars), relative time in `#9CA3AF`
- Tappable → opens that story (video opens fullscreen player, note opens NotesModal)
- `marginTop: 12, marginBottom: 20` spacing
- If no stories exist, line is not rendered
- Added `relativeTime()` helper: just now, Xm ago, Xh ago, X days ago, X weeks ago, X months ago
- `lastStory` computed via `useMemo` — merges videos + narrations, sorts by `created_at` desc, picks first
- `handleTapLastStory()` generates signed URL for video or opens note modal

### Fix 3: Legacy Stats — Humanize Zeros — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- **0 stories**: Replaced stat cards with humanized empty card:
  - "You're just getting started." (18px semibold navy)
  - "Record your first story today." (14px gray)
  - Empty progress bar (6px tall, rounded, `#E5E7EB` track, gold fill at 0%)
  - "0/1 this week" (12px gray)
  - Entire card tappable → navigates to Record screen
- **1+ stories**: Stat cards with three changes:
  - "THIS MONTH" changed to "THIS WEEK" — uses `weeklyCount` computed via `useMemo` (7-day window)
  - If weekly count is 0, sublabel reads "Let's add one" in gold `#D4A853` instead of "THIS WEEK"
  - Stories card tappable → navigates to Stories tab (`(tabs)/memories`)
  - Kids card tappable → navigates to Children tab (`(tabs)/children`)
- Added `weeklyCount` and `totalStories` computed values
- Stats bottom padding now uses `insets.bottom + 16` via `useSafeAreaInsets`

### Fix 4: Home Screen — No Scroll Layout — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- Layout remains `View` with `flex: 1` (already no ScrollView from Round 5)
- Flex layout: Header → Hero CTA → Last Recorded → Story Prompts header → Prompts slider → `flex: 1` spacer → Legacy Stats
- Stats anchored to bottom via spacer + `paddingBottom: insets.bottom + 16`
- Added `useSafeAreaInsets` import for safe bottom padding

## Known Issues (Round 6B)
- Animated child name uses `setInterval` — if component unmounts and remounts quickly, the interval restarts which can cause a brief visual jump. Acceptable for tab navigation.
- "Last Recorded" line tapping a narration with audio (not note) does nothing — only videos and text notes are handled. Could add audio playback as follow-up.
- Weekly count uses a rolling 7-day window (not calendar week). If user records on Monday, it still counts by the following Sunday.
- On very small screens (iPhone SE), if content overflows, the flex spacer collapses to zero and stats may touch the prompt slider. The prompt slider itself can still scroll horizontally.

## Testing Notes — Round 6B
- [ ] Hero CTA child name animates: fades out, swaps name, fades in every ~3.5s
- [ ] Child name text is gold (#D4A853), rest of headline is white
- [ ] Single child: name still pulses (fade out/in same name)
- [ ] Zero children: shows static "your kids" in gold, no animation
- [ ] "Last Recorded" line appears below Hero CTA when stories exist
- [ ] Line shows camera emoji + "Last story:" + truncated title + relative time
- [ ] Tapping "Last Recorded" opens the fullscreen video player (for videos)
- [ ] Tapping "Last Recorded" opens NotesModal (for text notes)
- [ ] "Last Recorded" line does NOT appear when no stories exist
- [ ] 0 stories: legacy section shows "You're just getting started" card
- [ ] 0 stories: card shows empty progress bar and "0/1 this week"
- [ ] 0 stories: tapping the card navigates to Record screen
- [ ] 1+ stories: stat cards show "Stories", "This Week", "Kids"
- [ ] 1+ stories, 0 this week: "THIS WEEK" label reads "Let's add one" in gold
- [ ] Stories stat card is tappable → navigates to Stories tab
- [ ] Kids stat card is tappable → navigates to Children tab
- [ ] Home screen fits in one viewport — no scrolling needed
- [ ] Stats anchored to bottom with proper safe area padding
- [ ] Home → Start Recording → Record → save → Stories → video in grid
- [ ] Home → prompt card → Record with pre-filled title
- [ ] Home → tap "Last story" → opens video
- [ ] Home → tap stories stat → Stories tab
- [ ] Dark mode renders correctly
- [ ] App works on iPhone SE through iPhone 15 Pro Max

## Changelog — Round 7 (Final Tweaks — Safe Re-apply)

**Context**: Original Round 7 placed `Audio.setAudioModeAsync()` at module level in `app/_layout.tsx`, which may have disrupted the app initialization order and caused crashes + Google auth errors. All Round 7 changes were reverted and re-applied one at a time with the critical difference: Audio mode is now set inside the video player component only, NOT at app root.

### Fix 1: Record Screen Cleanup — ✅ Complete
- Files modified: `app/(tabs)/memories/capture.tsx`
- **Default tab**: Changed from `"note"` to `"video"` in both `useState` init and `useEffect` on `defaultTab` param
- **Mode switcher removed**: Deleted the 3-tab pill selector (Tell a Story / Video Story / Write a Story) — screen now always opens in video mode
- **Title softened**: "Video Story" title changed from `font-merriweather` bold to inline style `fontSize: 18, fontWeight: '600'`, dark navy `#1B2838`
- **Footnote links added**: "Or: Take a Photo · Write a Note" at bottom of Record screen — dark navy `#1B2838` in light mode, gold `#D4A853` in dark mode
- **Post-record navigation**: Video save → `defaultTab: 'video'`, audio save → `defaultTab: 'audio'`, note save → `defaultTab: 'note'`
- **Did NOT touch**: Auth, Supabase config, or root layout

### Fix 2: Audio Playback on Silent Mode — ✅ Complete (SAFE VERSION)
- Files modified: `components/VideoPlayerWithNotes.tsx`
- **IMPORTANT**: Does NOT touch `app/_layout.tsx` — audio mode is set inside the video player only
- Added `import { Audio, Video } from "expo-av"` (Audio added alongside existing Video import)
- Added `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` inside `FeedVideoItem.useEffect` right before `playAsync()` when `isActive` becomes true
- Added same call inside `handleTapToToggle` before play/pause toggle
- Both calls wrapped in `.catch()` to prevent crashes if audio mode fails
- Audio now plays even when iPhone mute switch is on, but ONLY when video player is active

### Fix 3: All Record Entry Points → Video Mode — ✅ Complete
- Files modified: `app/(tabs)/memories/index.tsx`, `app/(tabs)/index.tsx`
- **FAB button**: Changed from `<Link href>` to `TouchableOpacity` + `router.push({ pathname: '(tabs)/memories/capture', params: { defaultTab: 'video' } })`
- **Empty state thumbnails**: Updated `EmptyThumbnail` `Link` to pass `params: { defaultTab: 'video' }`
- **Home screen prompt cards**: Changed `defaultTab: 'audio'` to `defaultTab: 'video'`
- **Verified already correct**: Home "Start Recording" button (`defaultTab: 'video'`), zero-stories card (`defaultTab: 'video'`)
- Added `useRouter` import and hook in memories/index.tsx

### Fix 4: Home Screen Spacing — Even Distribution — ✅ Complete
- Files modified: `app/(tabs)/index.tsx`
- **Root View**: Added `paddingTop: insets.top + 12` — controls safe area spacing
- **Header**: Removed `paddingTop: 16` (now handled by root), subtitle `marginBottom` reduced from 16 to 0
- **Hero CTA**: Added `marginTop: 16` to wrapper View
- **Last Recorded line**: Changed `marginTop: 12, marginBottom: 20` to `marginTop: 10, marginBottom: 10`
- **Story Prompts header**: Changed `marginTop: lastStory ? 0 : 16` to `marginTop: lastStory ? 10 : 20`
- **Flex spacer**: Added `minHeight: 24` to prevent collapse on small screens
- **Legacy section**: Reduced `paddingBottom` from `insets.bottom + 16` to `insets.bottom + 12`
- **Legacy header**: Reduced `marginBottom` from 12 to 8
- **Stat cards row**: Added `marginTop: 2` for consistent spacing

## Known Issues (Round 7)
- Record screen no longer has a mode switcher — it always opens in video mode. Audio and note modes are accessible via footnote links at the bottom.
- `Audio.setAudioModeAsync` is called each time a video becomes active in the feed. This is intentional and safe — the call is idempotent and wrapped in `.catch()`.
- The `paddingTop: insets.top + 12` on the home screen root View provides explicit safe area control. If `ProtectedRoute.tsx` also applies top inset, there may be double padding. Test on actual devices.
- **CRITICAL**: `app/_layout.tsx` must NOT have any `Audio` import or `setAudioModeAsync` call. The original Round 7 placed it there at module level, which likely disrupted app initialization. Always keep audio mode calls inside components.

## Testing Notes — Round 7
- [ ] App launches without crashing
- [ ] Google sign-in works correctly (no "AuthApiError: Internal Server Error")
- [ ] Record screen opens directly in video mode — no tab selector visible
- [ ] Record screen title reads "Video Story" in 18px semibold (not bold merriweather)
- [ ] Footnote links ("Or: Take a Photo · Write a Note") are dark navy in light mode, gold in dark mode
- [ ] Tapping footnote links switches to the correct recording mode
- [ ] Audio plays through iPhone speakers even when mute/silent switch is on (in video player)
- [ ] FAB "+" button on Stories screen navigates to Record screen in video mode
- [ ] Empty state thumbnails on Stories screen navigate to Record screen in video mode
- [ ] Home screen "Start Recording" button → Record in video mode
- [ ] Home screen prompt card taps → Record in video mode with pre-filled title
- [ ] Zero-stories "getting started" card → Record in video mode
- [ ] Home screen spacing is evenly distributed — no excessive gaps
- [ ] Content fits in one viewport without scrolling
- [ ] Stats section sits at bottom with proper safe area clearance
- [ ] Flex spacer provides at least 24px of breathing room between prompts and stats
- [ ] `app/_layout.tsx` has NO Audio import (verify manually)
- [ ] Dark mode renders correctly across all modified screens
- [ ] App works on iPhone SE through iPhone 15 Pro Max

## Changelog — Round 8 (Record Screen — Warmth & Depth Pass)

### Fix 1: Header — New Subtitle, Remove Labels, Move Ideas Button — ✅ Complete
- Files modified: `app/(tabs)/memories/capture.tsx`, `components/ImageNarration.tsx`
- **Subtitle**: Changed from "Your voice will be there when it matters the most." to italic "Take a breath. Then just talk to them." — `fontStyle: 'italic'`, half-opacity text
- **Removed "Video Story" label** and Ideas button from header row in video tab
- **Removed "Tell a Story" label** and Ideas button from audio tab
- **Removed "Write a Story" label** and Ideas button from note tab
- **Ideas button relocated**: Now appears as "Need ideas?" gold link below the title input on all tabs — gold lightbulb icon + text, right-aligned
- Prompt cards still display when `selectedPrompt` param exists

### Fix 2: Child Selector — Gold Ring, Scale Animation, Opacity, Pre-Select First — ✅ Complete
- Files modified: `components/ImageNarration.tsx`, `app/(tabs)/memories/capture.tsx`
- **Gold ring border**: 3px `#D4A853` ring on selected children (replaces `border-4 border-amber-400`)
- **Scale animation**: `Animated.spring` to 1.08 scale on select, bounces back to 1.0
- **Opacity**: Selected children at full opacity (1), unselected at 0.5
- **Pre-select first child**: Changed from `children.length === 1` to `children.length > 0 && selectedChildren.length === 0` — always pre-selects first child
- **Name text**: Selected shows dark navy (light) / white (dark), unselected shows muted gray
- Applied to both video tab (capture.tsx) and audio/note tabs (ImageNarration.tsx)
- `childScaleAnims` ref stores per-child `Animated.Value` for independent animations

### Fix 3: Title Input — Placeholder Text, Gold Bottom-Border — ✅ Complete
- Files modified: `components/ImageNarration.tsx`, `app/(tabs)/memories/capture.tsx`
- **Placeholder**: Changed from "Give your story a title" + separate "e.g. First Day of Kindergarten" hint to single input with `placeholder="e.g. First Day of Kindergarten"` inside
- **Bottom-border style**: Removed full box border, replaced with bottom-border only — 1px default, 2px gold `#D4A853` on focus
- **Background**: `#FAFAF8` light mode, `#1f2937` dark mode
- **Focus state**: `titleFocused` / `videoTitleFocused` state tracks input focus
- Removed "Story Title" label from video tab (title input is self-explanatory with placeholder)

### Fix 4: Photo Upload Area — Solid Card, Gold Icon, New Text — ✅ Complete
- Files modified: `components/ImageUpload.tsx`
- **Card style**: Replaced dashed border with solid rounded card (`borderRadius: 14`, `backgroundColor: #F5F0E8`)
- **Icon**: Changed from `image-outline` gray to `camera-outline` gold `#D4A853` in warm circle background `#EDE8E0`
- **Text**: Changed from "Add a photo (optional)" to "Add a photo to set the scene" + "Optional" subtitle
- **Shadow**: Added `shadowOpacity: 0.08, shadowRadius: 8, elevation: 3`
- Dark mode: Card background `#1f2937`, icon circle `#374151`

### Fix 5: Microphone Button — Pulsing Gold Ring, Recording State — ✅ Complete
- Files modified: `components/ImageNarration.tsx`
- **Idle state**: Pulsing gold ring (`#D4A853`) around mic button — `Animated.loop` with scale 1.0→1.15, opacity 0.4→0 over 1s cycle
- **Button**: Dark navy `#1B2838` background (replacing slate-800), shadow, 80px diameter
- **Helper text**: "Tap to start recording" in muted gray below timer
- **Recording state**: Button turns red `#E74C3C`, pulsing ring turns red with faster 0.5s cycle
- **Recording text**: "Recording..." in red replaces "Tap to start recording"
- **Timer**: Bold 15px, dark navy text
- Pulse animation stops when recording starts or when audio exists

### Fix 6: Background — Subtle Top Gradient — ✅ Complete
- Files modified: `app/(tabs)/memories/capture.tsx`
- Added `LinearGradient` from `expo-linear-gradient`
- Gradient: `#EDE8E0` to `#F5F3EF` over top 300px of screen (light mode only)
- Gradient is absolute positioned behind content
- Dark mode: no gradient, uses solid `#111827` background
- Removed NativeWind `contentSurface` class from ScrollView and inner View (now uses inline styles)

## Known Issues (Round 8)
- Pulse animation on mic button uses `Animated.loop` — when component unmounts mid-animation, the loop is abandoned but the ref values are garbage collected. No cleanup needed.
- Child scale animations are stored in a ref object — if children list changes dynamically (add/remove), stale animation values may persist but are harmless.
- "Need ideas?" link uses `router.replace` which replaces the current route. User needs to navigate back from Ideas screen manually.
- Title input no longer has a visible label — relies entirely on placeholder text. May be less accessible for screen readers.
- The gradient background only appears in light mode. Dark mode gets a flat solid background.

## Testing Notes — Round 8
- [ ] Record screen subtitle reads "Take a breath. Then just talk to them." in italic, half-opacity
- [ ] No "Video Story" label on video tab (only prompt card if applicable)
- [ ] No "Tell a Story" label on audio tab
- [ ] No "Write a Story" label on note tab
- [ ] "Need ideas?" gold link appears below title input on all tabs
- [ ] Tapping "Need ideas?" navigates to Ideas/prompts browsing screen
- [ ] Child avatars have 3px gold ring when selected
- [ ] Unselected children appear at 50% opacity
- [ ] Selecting a child triggers brief scale-up bounce animation (1.08x)
- [ ] First child is pre-selected by default when screen loads
- [ ] Title input shows "e.g. First Day of Kindergarten" as placeholder
- [ ] Title input has gold bottom-border when focused
- [ ] No "Story Title" label — placeholder serves as hint
- [ ] Photo upload area has solid rounded card with gold camera icon
- [ ] Upload card text reads "Add a photo to set the scene" + "Optional"
- [ ] Upload card has subtle shadow
- [ ] Mic button has pulsing gold ring animation when idle
- [ ] Mic button turns red when recording
- [ ] Red pulse ring appears during recording (faster cycle)
- [ ] "Tap to start recording" text below timer when idle
- [ ] "Recording..." text in red during recording
- [ ] Background has subtle warm gradient at top in light mode
- [ ] Dark mode renders correctly on all sections
- [ ] App works on iPhone SE through iPhone 15 Pro Max
