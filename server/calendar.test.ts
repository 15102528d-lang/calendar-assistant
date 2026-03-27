import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helper: create a mock authenticated context ────────────────────────────

function createMockContext(userId = 1): TrpcContext {
  const clearedCookies: any[] = [];
  return {
    user: {
      id: userId,
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── ICS Generation Tests ───────────────────────────────────────────────────

describe("calendar.generateICS", () => {
  it("generates valid ICS content with correct structure", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.generateICS({
      events: [
        {
          date: "2026-03-28",
          startTime: "09:00",
          endTime: "11:00",
          title: "Team Meeting",
          location: "Room A",
          notes: "Weekly sync",
        },
      ],
    });

    expect(result.icsContent).toBeDefined();
    expect(result.shareId).toBeDefined();
    expect(result.shareId.length).toBeGreaterThan(0);

    // Validate ICS structure
    const ics = result.icsContent;
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Calendar Assistant//CN");
    expect(ics).toContain("SUMMARY:Team Meeting");
    expect(ics).toContain("LOCATION:Room A");
    expect(ics).toContain("DESCRIPTION:Weekly sync");
    expect(ics).toContain("DTSTART:20260328T090000");
    expect(ics).toContain("DTEND:20260328T110000");
  });

  it("handles multiple events", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.generateICS({
      events: [
        {
          date: "2026-03-28",
          startTime: "09:00",
          endTime: "10:00",
          title: "Event 1",
        },
        {
          date: "2026-03-29",
          startTime: "14:00",
          endTime: "15:00",
          title: "Event 2",
        },
      ],
    });

    const ics = result.icsContent;
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
    expect(ics).toContain("SUMMARY:Event 1");
    expect(ics).toContain("SUMMARY:Event 2");
  });

  it("handles events without optional fields", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.generateICS({
      events: [
        {
          date: "2026-04-01",
          startTime: "08:00",
          endTime: "09:00",
          title: "Simple Event",
        },
      ],
    });

    const ics = result.icsContent;
    expect(ics).toContain("SUMMARY:Simple Event");
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("escapes special characters in ICS fields", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.generateICS({
      events: [
        {
          date: "2026-04-01",
          startTime: "10:00",
          endTime: "11:00",
          title: "Meeting; with, special\\chars",
          location: "Room A, Floor 2",
          notes: "Note with\nnewline",
        },
      ],
    });

    const ics = result.icsContent;
    expect(ics).toContain("SUMMARY:Meeting\\; with\\, special\\\\chars");
    expect(ics).toContain("LOCATION:Room A\\, Floor 2");
    expect(ics).toContain("DESCRIPTION:Note with\\nnewline");
  });
});

// ─── Auth Tests ─────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Calendar Share Retrieval ───────────────────────────────────────────────

describe("calendar.getShare", () => {
  it("throws NOT_FOUND for non-existent share", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.calendar.getShare({ shareId: "nonexistent-id" })
    ).rejects.toThrow();
  });
});
