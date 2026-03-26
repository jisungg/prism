# Changelog

## 2026-03-25

### Repo state

- Branch: `main`
- Last commit before this working session: `f3974b6` (`feat: auth pages complete. redirects into \login on rip. local sql db connected.`)
- Current state: uncommitted working tree changes are present
- No new git commit was created in this session

### High-level summary

This session did three major things:

1. Finished the first pass of user-to-player identity wiring after auth.
2. Iterated the dashboard shell into a minimal, mono, single-screen tabbed layout.
3. Built a new temporary public `/chess` route and a production-oriented custom chessboard component system for isolated board work.

### Files added

- `CHANGELOG.md`
- `src/app/chess/page.tsx`
- `src/components/chessboard-demo.tsx`
- `src/components/chessboard.tsx`
- `src/components/chessboard-system/pieces.tsx`
- `src/components/chessboard-system/types.ts`
- `src/components/chessboard-system/use-board-size.ts`
- `src/components/chessboard-system/utils.ts`

### Files modified

- `src/app/dashboard/page.tsx`
- `src/components/auth-flow.tsx`
- `src/lib/auth.ts`

### Auth and player identity work

#### `src/lib/auth.ts`

- Added `PlayerIdentity` typing.
- Added `getPrimaryPlayerForUser(userId)`.
- Added `requireCurrentPlayer()`.
- Changed `createUser()` so signup now creates:
  - a `users` row
  - a `players` row
  - a primary `user_player_links` row with relationship type `self`
- Wrapped user creation in a DB transaction.
- Added quiet rollback handling.

#### Result

After signup, a user now has a corresponding primary player identity instead of only an auth account.

### Login/auth flow UI updates

#### `src/components/auth-flow.tsx`

- Added `hasMounted` state so the success overlay does not appear incorrectly during mount/hydration timing.
- Explicitly clears the success overlay before redirecting to `/dashboard`.
- Updated login copy from:
  - `Welcome back to Prism. Continue your prep.`
  - to `Welcome back. Log in to continue your prep.`

### Dashboard work

#### `src/app/dashboard/page.tsx`

The dashboard was reworked several times in this session and is currently a minimal single-screen tabbed shell.

Current structure:

- Query-param tab routing via `/dashboard?tab=...`
- Tabs:
  - `overview`
  - `imports`
  - `reports`
  - `opponents`
  - `account`
- Uses `requireUser()` and `requireCurrentPlayer()`
- `Account` tab contains the player/account identity surface
- `Chess.com` and `Lichess` are shown as placeholder, not-connected profile slots
- Overview includes a placeholder board area and minimal adjacent context
- The page is explicitly viewport-locked:
  - `h-screen`
  - `overflow-hidden`
  - intended to be non-scrollable

#### Important dashboard design constraints from the user

These constraints matter for next session and should be preserved:

- Keep it minimal and mono.
- No pill buttons / no extra shapes when text weight can do the job.
- The page should be usable in one screen and should not scroll.
- Tab selection should swap content instead of extending the page.
- Account/player identity belongs in its own tab.
- Remove generic/product-fluff copy.
- Think more like furniture / room layout:
  - clear place for a chessboard
  - avoid unnecessary meta information like `active tab`
- Visual direction requested:
  - Apple
  - Linear
  - Notion

#### Current dashboard status

- It is still a shell, not a finished product dashboard.
- The layout is intentionally sparse and placeholder-like.
- This area is still likely to change again.

### Chess route and chessboard system

#### `src/app/chess/page.tsx`

- Added a temporary public `/chess` route.
- Important: the file includes an explicit comment noting that this route is intentionally non-protected.
- This route is now the isolated sandbox for board work.

#### `src/components/chessboard.tsx`

The previous simple board was replaced with a more production-oriented board component.

Implementation was done in two stages:

##### Stage 1

Built the smallest focused core first:

- 8x8 board rendering
- external position input
  - accepts FEN or normalized board object
- controlled selected square support
- board orientation
- coordinates
- click-to-select
- click-to-move
- drag-to-move
- legal move highlights from parent
- last move highlight
- right-click square callback
- optional keyboard navigation
- responsive sizing
- custom piece rendering
- piece component map support

##### Stage 2

Only after Stage 1 passed build verification:

- added `renderSquare`
- added `renderSquareOverlay`

These are the only Stage 2 square extension hooks currently wired in.

#### Architecture notes

The board is UI/interactions only. It does not own chess rules.

Core split:

- `types.ts`: public types
- `utils.ts`: board math, FEN parsing, move helpers
- `use-board-size.ts`: responsive sizing hook
- `pieces.tsx`: default SVG pieces
- `chessboard.tsx`: main component
- `chessboard-demo.tsx`: controlled external-state example

#### Performance decisions

These are important to preserve:

- Squares are memoized.
- Pieces are memoized.
- Board math is memoized.
- Drag preview position is not stored in React state on every pointer move.
- Pointer move updates the drag preview DOM node directly via ref/style updates.
- This avoids rerendering the full board every frame while dragging.
- Square interactions use event delegation on the grid rather than 64 separate per-square handlers.
- Pieces render in their own absolute-position layer above the square grid.

#### Current public board API direction

Current public types include:

- `SquareName`
- `ChessPiece`
- `ChessMove`
- `BoardPosition`
- `ChessPieceRendererProps`
- `SquareRenderProps`
- `ChessboardProps`

#### Custom piece support

The board now supports:

- `renderPiece`
- `pieceComponents`

Custom piece render props include:

- `piece`
- `square`
- `color`
- `type`
- `isDragging`
- `size`
- `boardOrientation`

Default pieces are custom SVGs in `src/components/chessboard-system/pieces.tsx`.

#### Demo component

`src/components/chessboard-demo.tsx` is a controlled example that currently demonstrates:

- external position ownership
- external selected-square ownership
- external legal target generation
- external move validation
- orientation toggle
- coordinate toggle
- custom piece renderer toggle

Note: the demo uses a simple external pseudo-legal move generator for demonstration only. The board itself remains rules-agnostic.

### Validation completed

The following command passed after the current board/system work:

- `pnpm build`

This means the current app compiles and type-checks successfully in its present state.

### Open threads / likely next work

1. Dashboard refinement is still unfinished.
   - Most likely next dashboard work is improving the layout around the chessboard / workspace metaphor.
2. The `/chess` route is now the safest place to continue board work without touching protected app flow.
3. Next likely chessboard tasks:
   - move animations
   - square overlays beyond the current hook
   - richer custom piece set
   - touch polish
   - cleaner custom square content examples
4. If product work resumes on account identity:
   - `Account` tab is the intended place for chess site profile linking (`Chess.com`, `Lichess`, etc.)

### Important reminders for next session

- Do not reintroduce dashboard fluff copy.
- Keep dashboard controls mono and text-led.
- Keep the dashboard non-scrollable unless the requirement explicitly changes.
- Keep chess rules outside the board component.
- Continue board work primarily on `/chess` first, then port stable pieces into dashboard/product surfaces.
