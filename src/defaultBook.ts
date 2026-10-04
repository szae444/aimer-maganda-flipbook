import type { Book } from './types';
import { DEFAULT_FONTS, PALETTE_PRESETS } from './theme';
import { at, label, note, page, photo, sticker, tape, text, ticket } from './factories';

/** The starter scrapbook. Every word, color and position here is editable in the app. */
export function createDefaultBook(): Book {
  const mono = (t: string, size = 12, color = '@ink', align: 'left' | 'center' = 'left') =>
    text({ text: t, font: '@mono', size, color, align, spacing: 0.28, upper: true, leading: 1.3 });

  return {
    version: 1,
    title: 'Aimer Maganda Flipbook',
    theme: {
      colors: { ...PALETTE_PRESETS[0].colors },
      fonts: { ...DEFAULT_FONTS },
      grain: 0.35,
      pageWidth: 480,
      pageHeight: 640,
      desk: 'linen',
      flipSound: true,
      flipDuration: 900,
    },
    pages: [
      /* 0 — front cover */
      page('cover', { color: '@cover', pattern: 'linen', patternColor: '@coverInk', patternScale: 4 }, [
        at(label({ text: 'VOL. 01', color: '@coverInk', ink: '@cover' }), 40, 44, -3, 104, 32),
        at(text({ text: 'the', font: '@accent', size: 40, color: '@coverInk' }), 46, 98, -4, 120, 50),
        at(text({ text: 'Aimer', font: '@display', size: 132, color: '@coverInk', leading: 0.9 }), 30, 138, -3, 430, 140),
        at(text({ text: 'maganda', font: '@hand', size: 104, color: '@accent2', leading: 0.9 }), 120, 252, -7, 360, 110),
        at(sticker('sparkle', { color: '@accent2' }), 396, 120, 12, 54, 54),
        at(sticker('postmark', { color: '@coverInk', text: 'AIMER · MAGANDA · FLIPBOOK · ' }), 34, 396, -14, 156, 156),
        at(photo({ caption: 'us, lately' }), 258, 378, 5, 178, 210),
        at(tape({ pattern: 'gingham', color: '@accent1', color2: '@paper' }), 300, 366, -6, 100, 30),
        at(mono('a scrapbook of small,\nlovely things', 12, '@coverInk'), 40, 572, 0, 230, 40),
      ]),

      /* 1 — inside front cover */
      page('endpaper', { color: '@accent4', pattern: 'gingham', patternColor: '@paper', patternScale: 28 }, [
        at(
          note({
            paper: 'lined',
            size: 27,
            text: 'hi, you.\n\nthis book is yours to fill.\ntap EDIT up top, then\ndouble-click any words,\ndrag things around,\nadd photos, tape & stickers.\n\nevery color & font lives\nin the THEME panel.\n\n— love, A.',
          }),
          62,
          104,
          -2,
          356,
          450,
        ),
        at(sticker('bow'), 196, 60, 4, 96, 84),
      ]),

      /* 2 — chapter opener */
      page('page', { color: '@paper' }, [
        at(text({ text: '01', font: '@display', size: 230, color: '@accent1', leading: 0.85 }), 36, 36, 0, 300, 210),
        at(mono('chapter one'), 330, 150, 90, 180, 22),
        at(text({ text: 'little things', size: 74, color: '@ink' }), 54, 226, -4, 390, 90),
        at(sticker('squiggle'), 66, 304, -2, 230, 50),
        at(
          text({
            text: 'a running list of moments worth keeping — the ordinary days that turned out to be the good ones.',
            font: '@body',
            italic: true,
            size: 20,
            leading: 1.45,
          }),
          60,
          378,
          0,
          300,
          110,
        ),
        at(ticket({ title: 'Admit One', sub: 'the very first date', num: 'No. 0001' }), 168, 502, 4, 270, 108),
      ]),

      /* 3 — collage, left */
      page('page', { color: '@paper', pattern: 'grid', patternColor: '@accent3', patternScale: 22 }, [
        at(photo({ caption: 'saturday, 4pm' }), 44, 58, -5, 220, 262),
        at(tape({ pattern: 'stripes', color: '@accent2' }), 104, 42, 3, 110, 30),
        at(photo({ caption: 'the good light' }), 214, 300, 6, 220, 262),
        at(tape({ pattern: 'dots', color: '@accent1', color2: '@paper' }), 290, 286, -8, 110, 30),
        at(sticker('heart'), 372, 86, 12, 70, 64),
        at(text({ text: '← you, laughing at\nsomething i said', size: 30 }), 280, 170, -3, 180, 80),
        at(sticker('sparkle'), 60, 520, 0, 46, 46),
        at(text({ text: 'keep these', font: '@hand', size: 34, color: '@accent1' }), 60, 400, -6, 150, 50),
      ]),

      /* 4 — collage, right */
      page('page', { color: '@paperAlt', pattern: 'dots', patternColor: '@muted', patternScale: 20 }, [
        at(photo({ frame: 'film', frameColor: '#1E1A18' }), 36, 46, -1, 408, 170),
        at(note({ paper: 'sticky', color: '@accent2', text: 'remember\nthis one.', size: 38 }), 56, 262, -4, 200, 190),
        at(sticker('arrow'), 262, 292, 14, 120, 80),
        at(photo({ frame: 'deckle', caption: '' }), 248, 372, 4, 192, 222),
        at(label({ text: 'BEST DAY', color: '@accent1', ink: '@paper' }), 56, 494, -3, 160, 34),
        at(sticker('star'), 196, 540, 8, 56, 56),
      ]),

      /* 5 — list, left */
      page('page', { color: '@paper' }, [
        at(text({ text: 'things i love\nabout you', font: '@display', size: 52, leading: 0.95 }), 46, 44, 0, 390, 120),
        at(sticker('heart', { color: '@accent1' }), 352, 34, 10, 52, 48),
        at(
          note({
            paper: 'index',
            size: 27,
            text: '1. the way you hum while cooking\n2. your terrible puns\n3. how you remember small stuff\n4. sunday mornings\n5. everything, honestly',
          }),
          44,
          186,
          -1,
          392,
          270,
        ),
        at(photo({ frame: 'arch', frameColor: '@paperAlt' }), 286, 420, 3, 150, 190),
        at(sticker('flower'), 56, 500, -10, 84, 84),
        at(sticker('cherry'), 160, 528, 6, 70, 70),
      ]),

      /* 6 — quote, right */
      page('page', { color: '@accent1' }, [
        at(sticker('star', { color: '@accent2' }), 70, 58, -8, 48, 48),
        at(
          text({ text: 'you are my\nfavorite\nchapter.', font: '@display', italic: true, size: 70, color: '@paper', leading: 0.95 }),
          40,
          120,
          0,
          410,
          210,
        ),
        at(sticker('scribble', { color: '@accent2' }), 26, 178, -3, 290, 100),
        at(text({ text: '— from the notes app, 2am', size: 30, color: '@paper' }), 40, 430, -3, 230, 70),
        at(photo({ frame: 'stamp' }), 270, 396, 7, 160, 192),
      ]),

      /* 7 — places, left */
      page('page', { color: '@paperAlt', pattern: 'kraft', patternColor: '@muted', patternScale: 24 }, [
        at(text({ text: 'places we\nwandered', font: '@display', size: 58, leading: 0.92 }), 44, 40, 0, 400, 130),
        at(ticket({ title: 'Boarding Pass', sub: 'MNL → anywhere', num: 'Seat 14A', color: '@accent3' }), 48, 190, -4, 262, 104),
        at(ticket({ title: 'Cinema 3', sub: 'late show, row F', num: 'No. 0213', color: '@accent4' }), 176, 302, 5, 262, 104),
        at(photo({ frame: 'stamp' }), 48, 420, -6, 150, 180),
        at(sticker('postmark', { text: 'POSTED WITH LOVE · POSTED · ' }), 214, 432, 10, 140, 140),
        at(label({ text: 'SOUVENIR', color: '@ink', ink: '@paper' }), 300, 588, -2, 140, 30),
      ]),

      /* 8 — hero photo, right */
      page('page', { color: '@paper', pattern: 'grid', patternColor: '@muted', patternScale: 16 }, [
        at(photo({ frame: 'plain', filter: 'warm' }), 40, 40, 0, 400, 300),
        at(tape({ pattern: 'solid', color: '@accent2' }), 14, 34, -38, 104, 30),
        at(tape({ pattern: 'solid', color: '@accent2' }), 362, 34, 38, 104, 30),
        at(text({ text: 'the view from the top —\nworth every step.', size: 36 }), 50, 356, -2, 390, 90),
        at(
          text({
            text: 'A place, a date, a tiny story. Everything on this page can be moved, rotated, recolored or deleted.',
            font: '@body',
            size: 16,
            color: '@muted',
            leading: 1.5,
          }),
          50,
          470,
          0,
          260,
          90,
        ),
        at(sticker('sun'), 348, 470, 0, 92, 92),
      ]),

      /* 9 — the end, left */
      page('page', { color: '@paper' }, [
        at(sticker('bow', { color: '@accent1' }), 190, 96, -4, 100, 88),
        at(text({ text: 'the end', font: '@accent', size: 92, align: 'center' }), 40, 200, 0, 400, 120),
        at(text({ text: '(for now)', size: 46, color: '@accent1', align: 'center' }), 140, 312, -4, 200, 60),
        at(sticker('cherry'), 366, 500, 12, 74, 74),
        at(sticker('heart', { color: '@accent4' }), 64, 470, -14, 56, 52),
        at(mono('to be continued…', 12, '@muted', 'center'), 120, 578, 0, 240, 20),
      ]),

      /* 10 — inside back cover */
      page('endpaper', { color: '@accent4', pattern: 'gingham', patternColor: '@paper', patternScale: 28 }, [
        at(note({ paper: 'torn', color: '@paper', size: 30, text: 'p.s. you can always\nflip back to the start.' }), 86, 236, 3, 308, 150),
        at(tape({ pattern: 'stripes', color: '@accent2' }), 186, 222, -4, 110, 30),
      ]),

      /* 11 — back cover */
      page('cover', { color: '@cover', pattern: 'linen', patternColor: '@coverInk', patternScale: 4 }, [
        at(text({ text: 'A·M', font: '@display', size: 72, color: '@coverInk', align: 'center' }), 120, 250, 0, 240, 90),
        at(sticker('heart', { color: '@accent2' }), 214, 344, 0, 52, 48),
        at(mono('aimer maganda flipbook — vol. 01', 11, '@coverInk', 'center'), 80, 576, 0, 320, 20),
      ]),
    ],
  };
}
