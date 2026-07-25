import { describe, it, expect } from "vitest";

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

describe("user age calculation", () => {
  it("computes a realistic age from a date of birth", () => {
    expect(calculateAge("2000-01-01")).toBeGreaterThan(20);
  });

  it("returns a smaller age for a future birth date", () => {
    expect(calculateAge("2030-01-01")).toBeLessThan(0);
  });
});
