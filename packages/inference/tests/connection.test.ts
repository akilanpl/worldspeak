// @vitest-environment node
import { it, expect } from "vitest";
import {
  workerDatabaseOptions,
  assertWorldSpeakStorageUrl,
  WORLD_PROJECT_REF,
} from "../src/connection";
it("requires verified TLS for the exact project even with an insecure URI sslmode", () => {
  const o = workerDatabaseOptions(
    `postgres://worldspeak_worker@db.${WORLD_PROJECT_REF}.supabase.co/postgres?sslmode=disable`,
  );
  expect(o.ssl).toEqual({ rejectUnauthorized: true });
  expect(
    workerDatabaseOptions(
      `postgres://worldspeak_worker.${WORLD_PROJECT_REF}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    ).ssl,
  ).toEqual({ rejectUnauthorized: true });
});
it("rejects foreign projects and administrative connection identities without logging URLs", () => {
  for (const value of [
    "postgres://worldspeak_worker@db.other.supabase.co/postgres",
    `postgres://postgres@db.${WORLD_PROJECT_REF}.supabase.co/postgres`,
    "invalid",
  ])
    expect(() => workerDatabaseOptions(value)).toThrow(
      "Invalid or unauthorized inference database configuration",
    );
});
it("allows only explicitly named local scratch databases for local worker tests", () => {
  expect(
    workerDatabaseOptions(
      "postgres://worldspeak_worker@127.0.0.1/worldspeak_phase2_release",
    ).ssl,
  ).toBe(false);
  expect(() =>
    workerDatabaseOptions(
      "postgres://worldspeak_worker@127.0.0.1/production",
    ),
  ).toThrow();
});
it("restricts privileged Storage access to the correct HTTPS project URL", () => {
  expect(() =>
    assertWorldSpeakStorageUrl(`https://${WORLD_PROJECT_REF}.supabase.co`),
  ).not.toThrow();
  for (const url of [
    `http://${WORLD_PROJECT_REF}.supabase.co`,
    "https://other.supabase.co",
    `https://${WORLD_PROJECT_REF}.supabase.co/extra`,
  ])
    expect(() => assertWorldSpeakStorageUrl(url)).toThrow();
});
