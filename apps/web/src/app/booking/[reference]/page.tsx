import type { Metadata } from "next";
import { Confirmation } from "@/confirmation/Confirmation";

export const metadata: Metadata = {
  title: "Your booking · Sharad Utsav 2026",
  robots: { index: false },
};

type Props = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookingPage({ params, searchParams }: Props) {
  const { reference } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  return <Confirmation reference={reference} token={token} justPaid={query.paid === "1"} />;
}
