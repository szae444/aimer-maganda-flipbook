/**
 * Site switches.
 *
 * SHOW_EDITOR — set to false before publishing if visitors should only read the book.
 * You can still open the editor on a published site by adding ?edit to the URL,
 * and hide it locally with ?view.
 */
export const SHOW_EDITOR = true;

const params = new URLSearchParams(window.location.search);
export const EDITOR_ENABLED = params.has('edit') || (SHOW_EDITOR && !params.has('view'));
