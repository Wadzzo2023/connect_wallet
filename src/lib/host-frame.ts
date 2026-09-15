/**
 * ── Host frame detection ───────────────────────────────────────────────────
 *
 * This package is shared across multiple projects (wadzzoAR and others) via
 * a single git submodule — there is one copy of this file's history, and any
 * commit pushed to it is a commit every consumer can pull. Nothing here may
 * assume it's only ever rendered inside wadzzoAR's phone-shaped device
 * frame; a desktop-capable host (like the main Wadzzo web app) needs this
 * package's original behaviour untouched.
 *
 * `AR_APP_FRAME_SELECTOR` is how both the dialog's portal (`shadcn/ui/dialog.tsx`)
 * and its layout (`connect_dialog.tsx`) detect, at runtime, whether they
 * happen to be mounted inside that specific frame — rendering the
 * phone-fitted layout only when the attribute is actually present, and
 * falling back to this component's original desktop behaviour everywhere
 * else. One exported constant so both call sites can't drift apart on the
 * literal string.
 */
export const AR_APP_FRAME_SELECTOR = "[data-ar-app-frame]";
