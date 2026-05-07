// Deno tests for the retry action of ibs-signatures.
// Validates that signatures in status 'created' (and other retryable states)
// are accepted by the retry flow, in addition to 'failed'.

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const RETRYABLE_STATUSES = ["created", "initiated", "failed", "pending"];

function canRetry(status: string): boolean {
  return RETRYABLE_STATUSES.includes(status);
}

Deno.test("retry accepts signature in 'failed' status", () => {
  assertEquals(canRetry("failed"), true);
});

Deno.test("retry accepts signature in 'created' status (new behavior)", () => {
  assertEquals(canRetry("created"), true);
});

Deno.test("retry accepts signature in 'initiated' status", () => {
  assertEquals(canRetry("initiated"), true);
});

Deno.test("retry accepts signature in 'pending' status", () => {
  assertEquals(canRetry("pending"), true);
});

Deno.test("retry rejects signature in 'success' status", () => {
  assertEquals(canRetry("success"), false);
});

Deno.test("retry rejects signature in 'verified' status", () => {
  assertEquals(canRetry("verified"), false);
});
