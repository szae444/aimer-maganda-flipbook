# Aimer Maganda Flipbook

An interactive scrapbook flipbook where you can edit everything (colors, fonts, words, photos, stickers, tape, pages) right in the browser.

## Run it

```bash
npm install      # first time only
npm run dev      # opens at http://localhost:5173
```

## Using it

- **Read mode**: drag a page corner to turn it, or click or tap a page. You can also use ← / → (Home and End jump to the covers). The grid button opens a contents view with thumbnails.
- **Edit mode** (top right):
  - **Add dock** (left side): text, photo, sticker sheet, washi tape, note paper, ticket, label-maker tape.
  - Click something to select it. Drag it to move it, use the corner squares to resize, and use the round handle to rotate. Hold **Shift** to snap to 15°, and hold **Alt** while dragging to turn off center snapping.
  - **Double-click** text, notes, labels or tickets to type on them. Double-click a photo to swap the image.
  - You can drag image files onto a page, or paste them with Ctrl+V.
  - **Inspector** (right side):
    - **Element**: everything about the selected item.
    - **Page**: the paper color and pattern, plus adding, duplicating, moving and deleting spreads.
    - **Theme**: palette, fonts, paper grain, desk, page size and page-turn speed and sound.
  - Shortcuts: Ctrl+Z / Ctrl+Shift+Z, Delete, Ctrl+D (duplicate), `[` `]` to change layering, arrow keys to nudge (add Shift to move 10px).
  - To turn pages in Edit mode, use the folded corner at the bottom of each page, the arrows at the bottom of the screen, or the arrow keys when nothing is selected.

### Colors
Every element uses **palette tokens** (Paper, Ink, Accent 1–4, Cover…), so if you change a token under Theme → Palette, the whole book updates. To copy a reference palette, go to Theme → Palette → **Copy colors from image**, then click **Apply to palette**. You can fine-tune any token afterwards.

## Saving & publishing

- Edits **autosave in your browser** (IndexedDB).
- To publish your edits, go to Theme → Save & publish → **Download** to get `book.json`. Put that file in `public/`, then run:

  ```bash
  npm run deploy
  ```

  This builds the site and pushes it to the `gh-pages` branch. It goes live at **https://szae444.github.io/aimer-maganda-flipbook/** about a minute later.
- If visitors should only read the book, set `SHOW_EDITOR = false` in `src/config.ts`. You can still open the editor on the live site with `?edit` at the end of the URL.

## Stack

Vite + React + TypeScript, Zustand + Immer for the state and undo history, and idb-keyval for saving. The page-turn engine is custom. Paper pages bend along a moving fold line that follows the pulled corner, with light and shadow along the crease (`src/lib/fold.ts`). The covers swing in 3D like hardcover boards. Pages stay ordinary HTML that you can edit directly. Stickers are hand-drawn inline SVG, and the paper sound is generated with Web Audio, so the site needs no image or audio files.

| Where | What |
| --- | --- |
| `src/theme.ts` | palette presets, font list, theme → CSS variables |
| `src/defaultBook.ts` | the starter scrapbook content |
| `src/components/Book.tsx` | page-turn engine |
| `src/components/PageFace.tsx` | page rendering, drag / resize / rotate |
| `src/components/Inspector.tsx` | editor panels |
| `src/styles/*.css` | all styling |
