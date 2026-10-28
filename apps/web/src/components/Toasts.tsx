import type { CSSProperties } from "react";
import { Toaster } from "sonner";

const BRAND: CSSProperties & Record<`--${string}`, string> = {
  fontFamily: "inherit",
  "--normal-bg": "#fdf3e4",
  "--normal-border": "#bc9226",
  "--normal-text": "#291900",
  "--info-bg": "#fdf3e4",
  "--info-border": "#bc9226",
  "--info-text": "#291900",
  "--success-bg": "#edf7ee",
  "--success-border": "#28a736",
  "--success-text": "#1e7a2a",
  "--warning-bg": "#fbf1d9",
  "--warning-border": "#8a6a12",
  "--warning-text": "#291900",
  "--error-bg": "#fdecea",
  "--error-border": "#ef1f1f",
  "--error-text": "#b3261e",
};

export function Toasts() {
  return <Toaster position="top-center" theme="light" richColors closeButton duration={6000} style={BRAND} />;
}
