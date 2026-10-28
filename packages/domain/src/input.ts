import { z } from "zod";
import { isValidDate } from "./dates.js";
import { normalizePromoCode } from "./promo.js";

// Unknown fields (e.g. a "priceCents" added in dev tools) are dropped by zod.

const DateSchema = z.string().refine(isValidDate, "Use a real date in the form YYYY-MM-DD");

const DaysSchema = z
  .array(DateSchema)
  .max(31)
  .refine((days) => new Set(days).size === days.length, "Each day can only be picked once");

const IdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "IDs may only use letters, numbers, - and _");

export const NameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(60, "Please keep names under 60 characters")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}' ’.-]*$/u, "Use letters, spaces, apostrophes, hyphens or full stops");

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address"));

export const PhoneSchema = z
  .string()
  .trim()
  .max(25)
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return /^\+?[\d\s().-]+$/.test(value) && digits >= 7 && digits <= 15;
  }, "Enter a phone number with 7 to 15 digits");

export const EntrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("DAY_PASS"), days: DaysSchema }),
  z.object({ type: z.literal("ALL_DAY_PASS") }),
  z.object({ type: z.literal("FAMILY_PASS"), familyGroupId: IdSchema }),
  z.object({ type: z.literal("NO_TICKET"), days: DaysSchema }),
]);

const attendeeFields = {
  id: IdSchema,
  dateOfBirth: DateSchema,
  entry: EntrySchema,
  dinnerDays: DaysSchema.default([]),
  workshopDays: DaysSchema.default([]),
};

export const QuoteAttendeeSchema = z.object({
  ...attendeeFields,
  firstName: NameSchema.optional(),
});

export const BookingAttendeeSchema = z.object({
  ...attendeeFields,
  firstName: NameSchema,
  lastName: NameSchema,
});

export const FamilyGroupSchema = z.object({
  id: IdSchema,
  days: DaysSchema,
});

export const BookerSchema = z.discriminatedUnion("attending", [
  z.object({
    attending: z.literal(true),
    attendeeId: IdSchema,
    email: EmailSchema,
    phone: PhoneSchema,
  }),
  z.object({
    attending: z.literal(false),
    firstName: NameSchema,
    lastName: NameSchema,
    dateOfBirth: DateSchema,
    email: EmailSchema,
    phone: PhoneSchema,
  }),
]);

const hasUniqueIds = (items: { id: string }[]) => new Set(items.map((item) => item.id)).size === items.length;

export const QuoteRequestSchema = z.object({
  attendees: z.array(QuoteAttendeeSchema).max(50).refine(hasUniqueIds, "Each person needs a different id"),
  familyGroups: z.array(FamilyGroupSchema).max(20).refine(hasUniqueIds, "Each family pass needs a different id").default([]),
  dandiyaPairs: z.number().int().min(0).max(1000).default(0),
  promoCode: z.string().max(40).nullable().default(null).transform(normalizePromoCode),
});

export const BookingRequestSchema = QuoteRequestSchema.extend({
  attendees: z.array(BookingAttendeeSchema).max(50).refine(hasUniqueIds, "Each person needs a different id"),
  booker: BookerSchema,
  expectedTotalCents: z.number().int().min(0),
});

export type Entry = z.output<typeof EntrySchema>;
export type QuoteAttendee = z.output<typeof QuoteAttendeeSchema>;
export type BookingAttendee = z.output<typeof BookingAttendeeSchema>;
export type FamilyGroup = z.output<typeof FamilyGroupSchema>;
export type Booker = z.output<typeof BookerSchema>;
export type QuoteRequest = z.output<typeof QuoteRequestSchema>;
export type BookingRequest = z.output<typeof BookingRequestSchema>;
export type QuoteRequestBody = z.input<typeof QuoteRequestSchema>;
export type BookingRequestBody = z.input<typeof BookingRequestSchema>;
