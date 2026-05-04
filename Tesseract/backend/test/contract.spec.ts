import { AppError } from "../src/common/app-error";
import { featureSeeds } from "../src/features/feature-seeds";
import { levelForXp } from "../src/users/user.service";

describe("backend contract foundations", () => {
  it("seeds the full Phase 1 feature flag set", () => {
    expect(featureSeeds).toHaveLength(17);
    expect(featureSeeds.map((flag) => flag.key)).toContain("events.rsvp_enabled");
    expect(featureSeeds.map((flag) => flag.key)).toContain("activity.feed_visibility");
  });

  it("keeps stable XP level buckets for future mini-game rewards", () => {
    expect(levelForXp(0)).toBe("Bronze");
    expect(levelForXp(5000)).toBe("Silver");
    expect(levelForXp(45_000)).toBe("Mythic III");
  });

  it("carries frontend-compatible error codes", () => {
    const error = new AppError("invalid_domain", "Only IITM student email addresses are allowed.", 400);
    expect(error.code).toBe("invalid_domain");
    expect(error.getStatus()).toBe(400);
  });
});
