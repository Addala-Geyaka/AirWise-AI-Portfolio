import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import App from "./App";

const airData = {
  place_name: "Bengaluru, India",
  latitude: 12.9716,
  longitude: 77.5946,
  source: "Open-Meteo air quality forecast (CAMS model)",
  timestamp: new Date().toISOString(),
  freshness: "current",
  aqi: 42,
  aqi_category: "Good",
  aqi_color: "#398566",
  pollutants: [],
  forecast: [],
  temperature_c: 25,
  humidity_percent: 55,
  wind_speed_kmh: 5,
};

describe("AirWise dashboard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads a real-data empty-safe dashboard and accessible navigation", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => airData,
    } as Response);
    vi.stubGlobal("fetch", fetcher);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument(), {
      timeout: 10_000,
    });
    expect(
      screen.getByText("Open-Meteo air quality forecast (CAMS model)"),
    ).toBeInTheDocument();
  });

  it("has no automated accessibility violations on the dashboard", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => airData,
    } as Response);
    vi.stubGlobal("fetch", fetcher);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await screen.findByText("Open-Meteo air quality forecast (CAMS model)");
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      result.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });
});
