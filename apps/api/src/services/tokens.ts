import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

// The secret link to a booking. It's derived from the reference, so nothing has to be stored,
// and a double-clicked "Pay" gets the same link back.
export function accessTokenFor(reference: string): string {
  return createHmac("sha256", env.BOOKING_TOKEN_SECRET).update(reference).digest("base64url");
}

export function isValidAccessToken(reference: string, token: string): boolean {
  const expected = Buffer.from(accessTokenFor(reference));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
