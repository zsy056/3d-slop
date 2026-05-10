import { expect, test } from "@playwright/test";

const UNIT = 15.88;
const HALF_UNIT = UNIT / 2;
const STUD_OPENING_RADIUS = 4.72;
const ANTI_STUD_TOOL_RADIUS = 7.8;

test("cuts safe d-brick mounts into the demo mesh and explodes the result", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__everythingABrick?.getState().sourceLoaded);

  await expect(page.getByRole("heading", { name: /everything is a brick now/i })).toBeVisible();
  await page.locator("#planeZ").evaluate((input) => {
    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.getByRole("button", { name: "Cut D-Brick Mounts" }).click();
  await expect(page.getByTestId("brickify-status")).toContainText(/Generated/);

  const state = await page.evaluate(() => window.__everythingABrick.getState());
  expect(state.resultLoaded).toBe(true);
  expect(state.resultTriangles).toBeGreaterThan(0);
  expect(state.downloadReady).toBe(true);
  expect(state.dimensions.studFeatureDepth).toBeCloseTo(state.dimensions.studHeight + 0.15, 5);
  expect(state.splitInfo.kept.length).toBe(2);
  expect(state.plane.autoRotate).toBe(false);
  expect(state.plane.visible).toBe(false);
  expect(state.planePreview.filledPlane).toBe(false);
  expect(state.planePreview.antiStudOffset[0]).toBeCloseTo(7.94, 2);
  expect(state.planePreview.antiStudOffset[1]).toBeCloseTo(7.94, 2);
  expect(state.planePreview.studOffset[0]).toBeCloseTo(0, 5);
  expect(state.planePreview.studOffset[1]).toBeCloseTo(0, 5);
  expect(state.planePreview.patternDepth).toBeCloseTo(state.dimensions.studFeatureDepth, 5);
  expect(state.resultPartBounds.length).toBe(state.splitInfo.kept.length);
  expect(state.resultPartBounds[1].min[0] - state.resultPartBounds[0].max[0]).toBeGreaterThan(70);

  for (const bounds of state.resultPartBounds) {
    expect(bounds.min[2]).toBeGreaterThanOrEqual(-0.3);
    expect(bounds.max[2]).toBeGreaterThan(7.5);
  }

  const featureTotals =
    Object.values(state.splitInfo.featureStats)
      .reduce((sum, stats) => ({
        antiStuds: sum.antiStuds + stats.antiStuds,
        partialAntiStuds: sum.partialAntiStuds + stats.partialAntiStuds,
        edgeWallRestores: sum.edgeWallRestores + stats.edgeWallRestores,
        studOpenings: sum.studOpenings + stats.studOpenings
      }), { antiStuds: 0, partialAntiStuds: 0, edgeWallRestores: 0, studOpenings: 0 });
  expect(featureTotals.antiStuds).toBeGreaterThan(0);
  expect(featureTotals.partialAntiStuds).toBeGreaterThan(0);
  expect(featureTotals.edgeWallRestores).toBe(featureTotals.partialAntiStuds);
  expect(featureTotals.studOpenings).toBeGreaterThan(0);
  for (const stats of Object.values(state.splitInfo.featureStats)) {
    expect(centerKeys(stats.antiStudCenters)).toEqual(centerKeys(expectedGridCenters(
      stats.bounds,
      HALF_UNIT,
      HALF_UNIT,
      ANTI_STUD_TOOL_RADIUS
    )));
    expect(centerKeys(stats.partialAntiStudCenters)).toEqual(centerKeys(expectedPartialAntiStudCenters(
      stats.antiStudCenters,
      stats.bounds
    )));
    expect(stats.edgeWallRestores).toBe(stats.partialAntiStuds);
    expect(centerKeys(stats.studCenters)).toEqual(centerKeys(expectedGridCenters(
      stats.bounds,
      0,
      0,
      STUD_OPENING_RADIUS
    )));
  }

  expect(state.resultBounds.max[0] - state.resultBounds.min[0])
    .toBeGreaterThan(state.sourceBounds.max[0] - state.sourceBounds.min[0]);

  await expect(page.locator("#downloadLink")).toHaveAttribute("aria-disabled", "false");
  await expect(page.locator("#downloadLink")).toHaveAttribute("href", /^blob:/);

  const stlBytes = await downloadBinaryStl(page);
  const firstPart = state.resultPartBounds[0];
  const centerX = (firstPart.min[0] + firstPart.max[0]) / 2;
  const centerY = (firstPart.min[1] + firstPart.max[1]) / 2;
  const featureDepth = state.dimensions.studFeatureDepth;
  expect(firstSolidZ(stlBytes, centerX, centerY)).toBeGreaterThan(featureDepth - 0.3);
  expect(firstSolidZ(stlBytes, centerX + HALF_UNIT, centerY + HALF_UNIT)).toBeGreaterThan(featureDepth - 0.3);
  expect(firstSolidZ(stlBytes, centerX + HALF_UNIT + 6, centerY + HALF_UNIT)).toBeLessThan(0.35);
  expect(firstSolidZ(stlBytes, centerX + HALF_UNIT + 7.15, centerY + HALF_UNIT)).toBeGreaterThan(featureDepth - 0.3);

  await expect(page.locator("#resultPartSelect")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete Selected" })).toBeDisabled();
  await clickResultPart(page);
  const afterPick = await page.evaluate(() => window.__everythingABrick.getState());
  expect(afterPick.selectedResultIndex).not.toBeNull();
  await expect(page.getByRole("button", { name: "Delete Selected" })).toBeEnabled();
  await page.getByRole("button", { name: "Delete Selected" }).click();

  const afterDelete = await page.evaluate(() => window.__everythingABrick.getState());
  expect(afterDelete.resultLoaded).toBe(true);
  expect(afterDelete.resultPartBounds.length).toBe(1);
  expect(afterDelete.splitInfo.kept.length).toBe(1);
  await expect(page.getByRole("button", { name: "Delete Selected" })).toBeDisabled();

  await page.getByRole("button", { name: "Reset" }).click();
  const afterReset = await page.evaluate(() => window.__everythingABrick.getState());
  expect(afterReset.resultLoaded).toBe(false);
  expect(afterReset.viewMode).toBe("source");
  expect(afterReset.plane.visible).toBe(true);
});

async function clickResultPart(page) {
  const canvas = page.locator("#brickCanvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  const points = [];
  for (const yRatio of [0.42, 0.5, 0.58, 0.34, 0.66]) {
    for (const xRatio of [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]) {
      points.push([xRatio, yRatio]);
    }
  }

  for (const [xRatio, yRatio] of points) {
    await canvas.click({
      position: {
        x: box.width * xRatio,
        y: box.height * yRatio
      }
    });
    const state = await page.evaluate(() => window.__everythingABrick.getState());
    if (state.selectedResultIndex !== null) {
      return;
    }
  }

  const state = await page.evaluate(() => window.__everythingABrick.getState());
  expect(state.selectedResultIndex).not.toBeNull();
}

async function downloadBinaryStl(page) {
  const bytes = await page.evaluate(async () => {
    const response = await fetch(document.querySelector("#downloadLink").href);
    return Array.from(new Uint8Array(await response.arrayBuffer()));
  });
  return Uint8Array.from(bytes);
}

function expectedGridCenters(bounds, offsetX, offsetY, margin) {
  const centers = [];
  for (const x of gridValues(bounds.min[0] - margin, bounds.max[0] + margin, UNIT, offsetX)) {
    for (const y of gridValues(bounds.min[1] - margin, bounds.max[1] + margin, UNIT, offsetY)) {
      centers.push([x, y]);
    }
  }
  return centers;
}

function gridValues(min, max, spacing, offset) {
  const first = Math.ceil((min - offset) / spacing);
  const last = Math.floor((max - offset) / spacing);
  const values = [];
  for (let index = first; index <= last; index += 1) {
    values.push(offset + index * spacing);
  }
  return values;
}

function centerKeys(centers) {
  return centers.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`);
}

function expectedPartialAntiStudCenters(centers, bounds) {
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  const radius = Math.min(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]) / 2;
  return centers.filter(([x, y]) => {
    const distance = Math.hypot(x - centerX, y - centerY);
    return distance < radius + ANTI_STUD_TOOL_RADIUS - 0.1 &&
      distance + ANTI_STUD_TOOL_RADIUS > radius + 0.1;
  });
}

function firstSolidZ(bytes, x, y) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const hits = [];

  for (let index = 0, offset = 84; index < triangleCount; index += 1, offset += 50) {
    const triangle = [];
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const base = offset + 12 + vertex * 12;
      triangle.push([
        view.getFloat32(base, true),
        view.getFloat32(base + 4, true),
        view.getFloat32(base + 8, true)
      ]);
    }

    const [a, b, c] = triangle;
    const denominator =
      (b[1] - c[1]) * (a[0] - c[0]) +
      (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(denominator) < 1e-7) {
      continue;
    }

    const l1 =
      ((b[1] - c[1]) * (x - c[0]) +
      (c[0] - b[0]) * (y - c[1])) / denominator;
    const l2 =
      ((c[1] - a[1]) * (x - c[0]) +
      (a[0] - c[0]) * (y - c[1])) / denominator;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-5 && l2 >= -1e-5 && l3 >= -1e-5) {
      hits.push(l1 * a[2] + l2 * b[2] + l3 * c[2]);
    }
  }

  hits.sort((a, b) => a - b);
  return hits.find((hit, index) => index === 0 || Math.abs(hit - hits[index - 1]) > 0.05) ?? Infinity;
}

test("renders a nonblank preview and can switch between source and result", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__everythingABrick?.getState().sourceLoaded);
  await page.getByRole("button", { name: "Rotate Plane" }).click();
  await expect(page.getByRole("button", { name: "Rotate Plane" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Move Plane" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Move Plane" }).click();
  await expect(page.getByRole("button", { name: "Move Plane" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Cut D-Brick Mounts" }).click();
  await expect(page.getByTestId("brickify-status")).toContainText(/Generated/);

  await page.getByRole("button", { name: "Source" }).click();
  await expect(page.getByRole("button", { name: "Source" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Brickified" }).click();
  await expect(page.getByRole("button", { name: "Brickified" })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(500);

  const cameraBeforeDrag = await page.evaluate(() => window.__everythingABrick.getState().camera);
  expect(cameraBeforeDrag.damping).toBe(false);
  const canvas = page.locator("#brickCanvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.35, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const cameraAfterDrag = await page.evaluate(() => window.__everythingABrick.getState().camera);
  const stateAfterDrag = await page.evaluate(() => window.__everythingABrick.getState());
  expect(stateAfterDrag.selectedResultIndex).toBeNull();
  expect(distance3(cameraAfterDrag.position, cameraBeforeDrag.position)).toBeGreaterThan(1);
  await page.waitForTimeout(700);
  const cameraAfterRelease = await page.evaluate(() => window.__everythingABrick.getState().camera);
  expect(distance3(cameraAfterRelease.position, cameraBeforeDrag.position)).toBeGreaterThan(1);

  const nonBlank = await page.locator("#brickCanvas").evaluate((canvas) => {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return false;
    }

    ctx.drawImage(canvas, 0, 0);
    const samples = [
      [0.25, 0.25],
      [0.5, 0.5],
      [0.75, 0.75],
      [0.35, 0.65],
      [0.65, 0.35]
    ];

    return samples.some(([x, y]) => {
      const pixel = ctx.getImageData(
        Math.floor(canvas.width * x),
        Math.floor(canvas.height * y),
        1,
        1
      ).data;
      return pixel[0] + pixel[1] + pixel[2] > 20;
    });
  });

  expect(nonBlank).toBe(true);
});

function distance3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
