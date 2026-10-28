import type { Metadata, Viewport } from "next";
import { AdminPage } from "@/admin/AdminPage";

export const metadata: Metadata = {
  title: "Admin · Sharad Utsav 2026",
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
};

export default function Admin() {
  return <AdminPage />;
}
