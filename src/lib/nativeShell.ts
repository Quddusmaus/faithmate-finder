import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

/**
 * Open Radix overlays (dialogs, sheets, drawers, dropdowns, popovers, selects).
 * They all close on Escape, so the Android back button can close them the same
 * way instead of navigating away underneath them.
 */
const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
].join(", ");

export function hasOpenOverlay(root: ParentNode = document): boolean {
  return root.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

export function closeTopOverlay(doc: Document = document) {
  const target = doc.activeElement ?? doc.body;
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
  );
}

export type BackAction = "close-overlay" | "history-back" | "exit";

/** What the Android back button should do right now. */
export function backAction(overlayOpen: boolean, canGoBack: boolean): BackAction {
  if (overlayOpen) return "close-overlay";
  if (canGoBack) return "history-back";
  return "exit";
}

/** Native only: status bar text colour and the Android back button. */
export async function setupNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  // Dark status-bar text on the app's light background (also set in
  // capacitor.config.ts for Android; iOS needs it at runtime).
  SystemBars.setStyle({ style: SystemBarsStyle.Light }).catch(() => undefined);

  if (Capacitor.getPlatform() !== "android") return;
  const { App } = await import("@capacitor/app");
  await App.addListener("backButton", ({ canGoBack }) => {
    switch (backAction(hasOpenOverlay(), canGoBack)) {
      case "close-overlay":
        closeTopOverlay();
        break;
      case "history-back":
        window.history.back();
        break;
      case "exit":
        App.exitApp();
        break;
    }
  });
}
