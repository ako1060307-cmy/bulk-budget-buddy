import { describe, expect, it } from "vitest";
import { dailyBurnRate, monthInfo, safeDailyAllowance, thresholdStatus } from "./metrics";

describe("metrics", () => {
  it("burn rate = month spend / days elapsed", () => {
    expect(dailyBurnRate(3000, 10)).toBe(300);
  });
  it("safe allowance = (budget - spend) / days remaining", () => {
    expect(safeDailyAllowance(20000, 5000, 10)).toBe(1500);
  });
  it("days remaining includes today", () => {
    const i = monthInfo(new Date(2026, 9, 13));
    expect(i.daysElapsed).toBe(13);
    expect(i.daysRemaining).toBe(19);
  });
  it("green below 75%", () => expect(thresholdStatus(74, 100)).toBe("green"));
  it("amber at 75%", () => expect(thresholdStatus(75, 100)).toBe("amber"));
  it("amber at 99%", () => expect(thresholdStatus(99, 100)).toBe("amber"));
  it("red at 100%", () => expect(thresholdStatus(100, 100)).toBe("red"));
});
