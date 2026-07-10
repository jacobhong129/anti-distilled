import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useDialogA11y(onClose) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousActive = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = () =>
      Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) =>
        element instanceof HTMLElement && !element.hidden && element.getAttribute("aria-hidden") !== "true"
      );

    const initialFocus = dialog.querySelector("[data-dialog-initial-focus]") || focusableElements()[0] || dialog;
    const focusFrame = window.requestAnimationFrame(() => initialFocus.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = focusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousActive instanceof HTMLElement && previousActive.isConnected) previousActive.focus();
    };
  }, []);

  return dialogRef;
}
