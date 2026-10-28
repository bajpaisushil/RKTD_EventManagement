import { readFileSync } from "node:fs";

// Integration tests run against the real database, inside a throwaway schema, so
// test bookings never touch real stock. Needs the direct (non-pooled) Neon host,
// because the pooler doesn't pass the search_path option through.
for (const line of readFileSync(new URL("../../../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const index = line.indexOf("=");
  if (index > 0 && !process.env[line.slice(0, index)]) process.env[line.slice(0, index)] = line.slice(index + 1).trim();
}

const schema = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
const url = new URL(process.env.DATABASE_URL ?? "");
url.hostname = url.hostname.replace("-pooler", "");
url.searchParams.set("options", `-c search_path=${schema},public`);

process.env.TEST_SCHEMA = schema;
process.env.DATABASE_URL = url.toString();
process.env.RESEND_API_KEY = "";
