import { SHARAD_UTSAV_2026, formatCents, type IsoDate } from "@rktd/domain";
import { point, type Vec3 } from "./vectors";

export type Orbit = { azimuth: number; up: number; down: number; near: number; far: number };

export type Stop = {
  id: string;
  name: string;
  title: string;
  fact: string;
  body: string;
  camera: Vec3;
  target: Vec3;
  via?: Vec3;
  orbit?: Partial<Orbit>;
  reach?: number;
};

const { catalog, agePolicy, days } = SHARAD_UTSAV_2026;

function dayAndDate(date: IsoDate, withMonth: boolean): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    ...(withMonth ? { month: "short" } : {}),
  });
}

const firstDay = dayAndDate(days[0], false);
const lastDay = dayAndDate(days[days.length - 1], true);
const year = days[0].slice(0, 4);
const sessions = catalog.garbaWorkshop.sessionDays.map((day, index, all) => dayAndDate(day, index === all.length - 1)).join(" and ");
const { familyPass } = catalog;

export const START: Pick<Stop, "camera" | "target"> = { camera: point(-38, 30, 118), target: point(0, 6, 20) };

export const STOPS: Stop[] = [
  {
    id: "arrival",
    name: "Arrival",
    title: "Welcome to Sharad Utsav",
    fact: `${firstDay} – ${lastDay} ${year} · ${SHARAD_UTSAV_2026.venue}`,
    body: "Come in under the marigold gateway on any day of the festival. Volunteers at the door find your booking by its QR code or reference and check your family in.",
    camera: point(0, 2.4, 74),
    target: point(0, 6.5, 16),
    orbit: { azimuth: 0.55, up: 0.3 },
    reach: 1.1,
  },
  {
    id: "staircase",
    name: "Grand staircase",
    title: "The grand staircase",
    fact: `Day Pass from ${formatCents(catalog.dayPass.CHILD.priceCents)} · Family Pass ${formatCents(familyPass.priceCents)} · under-${agePolicy.childFromAge}s free`,
    body: `White marble stairs, flanked by carved wing walls and two elephants, rise to the main hall. Everyone needs a pass for the days they come: a Day Pass, an All-Day Pass for all ${days.length} days, or a Family Pass for ${familyPass.adults} adults and ${familyPass.children} children.`,
    camera: point(0.6, 2.3, 21.3),
    target: point(0, 4.7, 7.0),
    orbit: { azimuth: 0.7, up: 0.35, far: 1.12 },
    reach: 1.25,
  },
  {
    id: "mandir",
    name: "Inside the mandir",
    title: "Inside the mandir",
    fact: "Darshan of Radha and Krishna",
    body: "Life-size murtis of Radha and Krishna stand at the heart of the hall, lit by rows of diyas. Take darshan before you join the celebrations outside.",
    camera: point(0, 4.9, 2.1),
    target: point(0, 4.85, -3.8),
    via: point(0, 4.9, 10.5),
    orbit: { azimuth: 0.5, up: 0.18, down: 0.18, near: 0.6, far: 1.06 },
    reach: 1,
  },
  {
    id: "garba",
    name: "Garba",
    title: "Garba under the moon",
    fact: `${catalog.dandiyaSticks.label} ${formatCents(catalog.dandiyaSticks.priceCents)} · collected at the festival`,
    body: "Join the circles of dancers around the glowing garbo while the band plays. Add dandiya sticks to your booking and pick them up when you arrive.",
    camera: point(6.5, 8.5, 54),
    target: point(-1, 1.5, 29),
    orbit: { azimuth: 1.5, up: 0.45, near: 0.45, far: 1.2 },
  },
  {
    id: "dinner",
    name: "Dinner",
    title: "Dinner and stalls",
    fact: `${catalog.dinnerPlate.label} ${formatCents(catalog.dinnerPlate.priceCents)} ${catalog.dinnerPlate.priceUnit}`,
    body: `Add a dinner plate for anyone in your booking on the days they're coming, under-${agePolicy.childFromAge}s included. Plates are booked ahead with your tickets.`,
    camera: point(-8.5, 4.4, 45),
    target: point(-24, 1.4, 30.5),
    orbit: { azimuth: 0.9 },
  },
  {
    id: "workshop",
    name: "Workshop",
    title: "Garba workshop",
    fact: `${sessions} · ${formatCents(catalog.garbaWorkshop.priceCents)} ${catalog.garbaWorkshop.priceUnit}`,
    body: "New to garba? Learn the steps with a teacher before the main circle. Places are limited, so add the workshop when you book.",
    camera: point(10.5, 3.8, 43),
    target: point(22, 1.3, 30.5),
    orbit: { azimuth: 0.9 },
  },
];
