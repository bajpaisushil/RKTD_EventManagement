import type { ProductCode } from "./catalog.js";

export type IssueCode =
  | "PARTY_EMPTY"
  | "PARTY_TOO_LARGE"
  | "NOTHING_TO_BOOK"
  | "DATE_OF_BIRTH_IN_FUTURE"
  | "DATE_OF_BIRTH_UNLIKELY"
  | "TICKET_NOT_NEEDED"
  | "TICKET_REQUIRED"
  | "DAYS_REQUIRED"
  | "NOT_A_FESTIVAL_DAY"
  | "DAY_ALREADY_PASSED"
  | "ALL_DAY_PASS_OFF_SALE"
  | "FAMILY_PASS_NOT_FOUND"
  | "FAMILY_PASS_EMPTY"
  | "FAMILY_PASS_COMPOSITION"
  | "EXTRA_ON_DAY_NOT_ATTENDING"
  | "WORKSHOP_NOT_RUNNING"
  | "DANDIYA_LIMIT"
  | "CHILDREN_WITHOUT_ADULT"
  | "BOOKER_NOT_IN_PARTY"
  | "BOOKER_TOO_YOUNG"
  | "DUPLICATE_PERSON"
  | "SOLD_OUT"
  | "NOT_ENOUGH_STOCK";

export type IssueTarget =
  | { kind: "BOOKING" }
  | { kind: "BOOKER" }
  | { kind: "ATTENDEE"; attendeeId: string }
  | { kind: "FAMILY_PASS"; familyGroupId: string }
  | { kind: "PRODUCT"; productCode: ProductCode };

export type Issue = {
  code: IssueCode;
  severity: "error" | "warning";
  message: string;
  target: IssueTarget;
};

export function error(code: IssueCode, message: string, target: IssueTarget = { kind: "BOOKING" }): Issue {
  return { code, severity: "error", message, target };
}

export function warning(code: IssueCode, message: string, target: IssueTarget = { kind: "BOOKING" }): Issue {
  return { code, severity: "warning", message, target };
}

export function attendee(attendeeId: string): IssueTarget {
  return { kind: "ATTENDEE", attendeeId };
}

export function familyPass(familyGroupId: string): IssueTarget {
  return { kind: "FAMILY_PASS", familyGroupId };
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
