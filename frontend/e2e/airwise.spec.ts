import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const airResponse = {
  place_name: "Bengaluru, India",
  latitude: 12.9716,
  longitude: 77.5946,
  source: "Open-Meteo air quality forecast (CAMS model)",
  timestamp: "2026-11-20T12:00:00+05:30",
  freshness: "current",
  aqi: 120,
  aqi_category: "Unhealthy for sensitive groups",
  aqi_color: "#bd603b",
  pollutants: [],
  forecast: [],
  temperature_c: 25,
  humidity_percent: 55,
  wind_speed_kmh: 5,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/air-quality**", (route) =>
    route.fulfill({ json: airResponse }),
  );
  await page.route("**/api/v1/places/search**", (route) => {
    const query = new URL(route.request().url()).searchParams
      .get("q")
      ?.toLowerCase();
    const result = query?.startsWith("california")
      ? {
          name: "California",
          country: "United States",
          latitude: 36.7783,
          longitude: -119.4179,
          admin1: "California",
          feature_code: "ADM1",
        }
      : query?.startsWith("india")
        ? {
            name: "India",
            country: "India",
            latitude: 20.5937,
            longitude: 78.9629,
            feature_code: "PCLI",
          }
        : {
            name: "Mumbai",
            country: "India",
            latitude: 19.076,
            longitude: 72.8777,
            admin1: "Maharashtra",
            feature_code: "PPL",
          };
    return route.fulfill({ json: { places: [result] } });
  });
  await page.route("**/api/v1/planner/brief", (route) =>
    route.fulfill({
      json: {
        brief:
          "The source currently reports US AQI 120. Compare the modelled forecast with local guidance.",
        provider: "rules",
      },
    }),
  );
});

test("search, personalize, check off an action, and keep it after reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hello, Bengaluru" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Search cities, states, or countries" })
    .fill("Mumbai");
  await expect(page.getByRole("option", { name: /Mumbai/ })).toBeVisible();
  await page.getByRole("option", { name: /Mumbai/ }).click();
  await expect(
    page.getByRole("heading", { name: "Hello, Mumbai" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Map: Open Mumbai on OpenStreetMap" }),
  ).toHaveAttribute("href", /mlat=19\.076/);

  await page.getByRole("link", { name: "Family profile" }).click();
  await page
    .getByRole("checkbox", { name: /Include sensitive-group reminders/ })
    .check();
  await page.getByRole("link", { name: "Daily planner" }).click();
  const action = page.getByRole("checkbox", {
    name: /Choose a lower-AQI time/,
  });
  await action.locator("xpath=..").click();
  await expect(action).toBeChecked();
  await page.reload();
  await page.getByRole("link", { name: "Daily planner" }).click();
  await expect(
    page.getByRole("checkbox", { name: /Choose a lower-AQI time/ }),
  ).toBeChecked();
});

test("uses browser location as the air and map location", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });
  await page.goto("/");
  await page.getByRole("button", { name: "My location" }).click();
  await expect(page.locator(".location-pill")).toContainText("My location");
  await expect(
    page.getByRole("link", { name: "Map: Open My location on OpenStreetMap" }),
  ).toHaveAttribute("href", /mlat=40\.7128/);
});

test("searches state and country results with clear location types", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("combobox", {
    name: "Search cities, states, or countries",
  });
  await search.fill("California");
  await expect(
    page.getByRole("option", {
      name: /California.*State \/ province.*United States/,
    }),
  ).toBeVisible();
  await page
    .getByRole("option", { name: /California.*State \/ province/ })
    .click();
  await expect(page.locator(".location-pill")).toContainText("California");

  await search.fill("India");
  await expect(
    page.getByRole("option", { name: /India.*Country/ }),
  ).toBeVisible();
});

test("explains Supabase setup and keeps guest mode available", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Connect your Supabase project" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Continue as a guest/ }),
  ).toBeVisible();
});

test("keeps search and location controls within a phone-width viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(
    page.getByRole("combobox", {
      name: "Search cities, states, or countries",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "My location" })).toBeVisible();
  const pageWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(360);
});

test("dashboard meets automated accessibility checks", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hello, Bengaluru" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.flatMap(({ id, nodes }) =>
    nodes.map(({ target, any }) => {
      const contrast = any.find((check) => check.id === "color-contrast")?.data;
      return `${id}: ${target.join(" ")}${contrast ? ` (${contrast.contrastRatio}:1)` : ""}`;
    }),
  );
  expect(violations).toEqual([]);
});
