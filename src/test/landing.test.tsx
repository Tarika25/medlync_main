import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "../pages/Landing";

describe("Landing page", () => {
  it("presents the MedLync experience clearly", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/medlync/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/a calmer way to manage prescriptions/i)).toBeInTheDocument();
  });
});
