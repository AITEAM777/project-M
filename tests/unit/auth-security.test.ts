import { describe, expect, it } from "vitest";
import { isAdminHost, parseAdminEmails } from "@/lib/admin-host";
import { isDisposableEmail } from "@/server/disposable";
import { verifySchema } from "@/lib/validation";

describe("admin host", () => {
  it("recognises only the admin subdomain", () => {
    expect(isAdminHost("admin.noderamind.com")).toBe(true);
    expect(isAdminHost("admin.localhost:3000")).toBe(true);
    expect(isAdminHost("www.noderamind.com")).toBe(false);
    expect(isAdminHost("noderamind.com")).toBe(false);
    expect(isAdminHost("myadmin.noderamind.com")).toBe(false);
    expect(isAdminHost(null)).toBe(false);
  });
  it("parses ADMIN_EMAILS loosely but exactly", () => {
    expect(parseAdminEmails(" Owner@Gmail.com , second@x.com,,")).toEqual(["owner@gmail.com", "second@x.com"]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
});

describe("sign-up hygiene", () => {
  it("refuses throwaway inboxes, including subdomains", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@foo.yopmail.com")).toBe(true);
    expect(isDisposableEmail("x@gmail.com")).toBe(false);
    expect(isDisposableEmail("x@ukr.net")).toBe(false);
  });
  it("accepts a 6-digit code with an optional space", () => {
    expect(verifySchema.parse({ email: "A@b.co", code: "123 456" })).toEqual({ email: "a@b.co", code: "123456" });
    expect(verifySchema.safeParse({ email: "a@b.co", code: "12345" }).success).toBe(false);
    expect(verifySchema.safeParse({ email: "a@b.co", code: "12a456" }).success).toBe(false);
  });
});
