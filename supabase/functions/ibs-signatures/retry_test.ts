// Deno tests for the retry action of ibs-signatures.
// iBS only allows retry when the provider status is 'created' or 'failed'.
// Any other status (pending, success, verified, initiated, etc.) must be rejected.

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const RETRYABLE_STATUSES = ["created", "failed"];

function canRetry(status: string): boolean {
  return RETRYABLE_STATUSES.includes(status);
}

Deno.test("retry accepts 'failed'", () => {
  assertEquals(canRetry("failed"), true);
});

Deno.test("retry accepts 'created'", () => {
  assertEquals(canRetry("created"), true);
});

Deno.test("retry rejects 'pending' (user already submitted)", () => {
  assertEquals(canRetry("pending"), false);
});

Deno.test("retry rejects 'success'", () => {
  assertEquals(canRetry("success"), false);
});

Deno.test("retry rejects 'verified'", () => {
  assertEquals(canRetry("verified"), false);
});

Deno.test("retry rejects 'initiated'", () => {
  assertEquals(canRetry("initiated"), false);
});
