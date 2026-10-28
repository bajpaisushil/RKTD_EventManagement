import { formatCents, formatDayList, type BookingView } from "@rktd/domain";
import { env } from "../env.js";
import { festival } from "../festival.js";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function personLine(person: BookingView["people"][number]): string {
  const extras = [
    person.dinnerDays.length ? `dinner ${formatDayList(person.dinnerDays)}` : "",
    person.workshopDays.length ? `workshop ${formatDayList(person.workshopDays)}` : "",
  ].filter(Boolean);
  return `${person.firstName} ${person.lastName}: ${person.ticket}, ${formatDayList(person.days)}${extras.length ? ` (${extras.join("; ")})` : ""}`;
}

function textVersion(view: BookingView, link: string): string {
  return [
    `You're booked for ${festival.name}.`,
    `Booking reference: ${view.reference}`,
    "",
    ...view.people.map(personLine),
    view.dandiyaPairs ? `Dandiya sticks: ${view.dandiyaPairs} pair(s)` : "",
    "",
    `Total paid: ${formatCents(view.quote.totalCents)}`,
    `Your booking and door QR code: ${link}`,
    "",
    `${festival.venue}. Show your QR code or booking reference at the door.`,
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

function htmlVersion(view: BookingView, link: string): string {
  const people = view.people.map((person) => `<li style="margin:4px 0">${escapeHtml(personLine(person))}</li>`).join("");
  return `<!doctype html>
<html><body style="margin:0;background:#2C2C2C;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#FDF3E4;border-radius:12px;padding:28px;color:#645743">
      <h1 style="margin:0 0 4px;color:#291900;font-family:Georgia,serif;font-size:24px">You're booked for ${escapeHtml(festival.name)}</h1>
      <p style="margin:0 0 20px">${escapeHtml(festival.venue)}</p>
      <p style="margin:0 0 4px;font-size:13px">Booking reference</p>
      <p style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#291900;letter-spacing:1px">${escapeHtml(view.reference)}</p>
      <ul style="padding-left:18px;margin:0 0 20px">${people}</ul>
      ${view.dandiyaPairs ? `<p style="margin:0 0 12px">Dandiya sticks: ${view.dandiyaPairs} pair(s)</p>` : ""}
      <p style="margin:0 0 24px;color:#291900"><strong>Total paid: ${formatCents(view.quote.totalCents)}</strong></p>
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#C99B24;color:#291900;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">View booking and door QR code</a>
      <p style="margin:24px 0 0;font-size:13px">Show your QR code or booking reference at the door. Children may be asked their age.</p>
    </div>
  </div>
</body></html>`;
}

export async function sendConfirmationEmail(view: BookingView, link: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `booking-confirmed-${view.reference}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [view.booker.email],
        subject: `You're booked for ${festival.name} · ${view.reference}`,
        html: htmlVersion(view, link),
        text: textVersion(view, link),
      }),
    });
    if (!response.ok) {
      console.error(`Resend refused the email for ${view.reference}: ${response.status} ${await response.text()}`);
    }
    return response.ok;
  } catch (error) {
    console.error(`Couldn't reach Resend for ${view.reference}`, error);
    return false;
  }
}
