import type { Metadata, Viewport } from "next";
import { VirtualTour } from "@/tour/VirtualTour";

export const metadata: Metadata = {
  title: "Virtual tour · Sharad Utsav 2026",
  description: "Walk through Radha Krishna Temple in 3D before you book: the grand staircase, the mandir, the garba circle, dinner and the Garba workshop.",
};

export const viewport: Viewport = {
  themeColor: "#0d0a1c",
};

export default function TourPage() {
  return <VirtualTour />;
}
