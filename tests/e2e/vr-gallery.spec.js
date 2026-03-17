const { test, expect } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".mp4":
      return "video/mp4";
    case ".m4a":
      return "audio/mp4";
    default:
      return "application/octet-stream";
  }
}

function createStaticServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const filePath = path.join(ROOT, pathname);

    if (!filePath.startsWith(ROOT)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end("Not Found");
        return;
      }
      res.setHeader("Content-Type", contentTypeFor(filePath));
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

let serverInfo;

test.beforeAll(async () => {
  serverInfo = await createStaticServer();
});

test.afterAll(async () => {
  if (serverInfo?.server) {
    await new Promise((resolve) => serverInfo.server.close(resolve));
  }
});

test("desktop WASD movement updates player position", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(() => window.__vrGalleryDebug);
  await page.evaluate(() => window.__vrGalleryDebug.setPointerLocked(true));

  const start = await page.evaluate(() => window.__vrGalleryDebug.getState().player);

  await page.keyboard.down("W");
  await page.waitForTimeout(400);
  await page.keyboard.up("W");

  const end = await page.evaluate(() => window.__vrGalleryDebug.getState().player);
  expect(end.z).toBeLessThan(start.z);
});

test("desktop vertical movement responds to Space E Ctrl and Q", async ({ page }) => {
  test.slow();

  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(() => window.__vrGalleryDebug);
  await page.evaluate(() => window.__vrGalleryDebug.setPointerLocked(true));
  await page.evaluate(() => window.__vrGalleryDebug.setFlightEnabled(false));

  const start = await page.evaluate(() => window.__vrGalleryDebug.getState().player);

  await page.keyboard.down("Space");
  await page.waitForTimeout(250);
  await page.keyboard.up("Space");
  const afterSpace = await page.evaluate(() => window.__vrGalleryDebug.getState());
  expect(afterSpace.flightEnabled).toBe(true);
  expect(afterSpace.player.y).toBeGreaterThan(start.y);

  await page.keyboard.down("E");
  await page.waitForTimeout(250);
  await page.keyboard.up("E");
  const afterE = await page.evaluate(() => window.__vrGalleryDebug.getState().player);
  expect(afterE.y).toBeGreaterThan(afterSpace.player.y);

  await page.keyboard.down("Control");
  await page.waitForTimeout(250);
  await page.keyboard.up("Control");
  const afterCtrl = await page.evaluate(() => window.__vrGalleryDebug.getState().player);
  expect(afterCtrl.y).toBeLessThan(afterE.y);

  await page.keyboard.down("Q");
  await page.waitForTimeout(250);
  await page.keyboard.up("Q");
  const afterQ = await page.evaluate(() => window.__vrGalleryDebug.getState().player);
  expect(afterQ.y).toBeLessThan(afterCtrl.y);
});

test("paintings render in front of frames", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.getArtStats === "function"
  );

  const stats = await page.evaluate(() => window.__vrGalleryDebug.getArtStats());
  expect(stats.length).toBeGreaterThan(0);
  for (const stat of stats) {
    expect(stat.planeZ).toBeGreaterThan(stat.frameFrontZ);
  }
});

test("art lights sit above the frame tops", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.getArtStats === "function"
  );

  const stats = await page.evaluate(() => window.__vrGalleryDebug.getArtStats());
  for (const stat of stats) {
    expect(stat.lightCount).toBeGreaterThan(0);
    for (const lightY of stat.lightYs) {
      expect(lightY).toBeGreaterThan(stat.frameTopY);
      expect(lightY - stat.frameTopY).toBeLessThan(1.2);
    }
  }
});

test("wide artworks use a wider light cone", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.getArtStats === "function"
  );

  const stats = await page.evaluate(() => window.__vrGalleryDebug.getArtStats());
  const wideFiles = new Set([
    "assets/the_school_of_athens.jpg",
    "assets/the_night_watch.jpg",
    "assets/the_last_supper.jpg",
    "assets/the_creation_of_adam.jpg",
    "assets/the_birth_of_venus.jpg",
  ]);

  for (const stat of stats) {
    if (!stat.baseAngle) continue;
    if (wideFiles.has(stat.file)) {
      expect(stat.lightAngles[0]).toBeGreaterThan(stat.baseAngle * 1.4);
    } else {
      expect(stat.lightAngles[0]).toBeLessThanOrEqual(stat.baseAngle * 1.4);
    }
  }
});

test("artwork info cards expose metadata and audio badge state", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.getArtStats === "function"
  );

  const stats = await page.evaluate(() => window.__vrGalleryDebug.getArtStats());
  expect(stats.length).toBeGreaterThan(0);

  const withAudio = stats.filter((stat) => stat.hasAudioGuide);
  expect(withAudio.length).toBeGreaterThan(0);

  for (const stat of stats) {
    expect(stat.title).toBeTruthy();
    expect(stat.year).toBeTruthy();
    expect(stat.synopsisLength).toBeGreaterThan(60);
    expect(stat.infoCardPresent).toBe(true);
    expect(stat.infoCardWidth).toBeGreaterThan(0.5);
    expect(stat.infoCardSide).toBe(0);
    expect(stat.infoCardHasAudioBadge).toBe(stat.hasAudioGuide);
    expect(Math.abs(stat.infoCardCenterX)).toBeLessThan(0.001);
    expect(stat.infoCardTopY).toBeLessThan(stat.frameBottomY - 0.01);
  }
});

test("switch pilot LEDs stay visible when all gallery lights are off", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.getSwitchStats === "function"
  );

  const before = await page.evaluate(() => window.__vrGalleryDebug.getSwitchStats());
  expect(before).toHaveLength(2);
  for (const stat of before) {
    expect(stat.state).toBe(true);
    expect(stat.pilotLightIntensity).toBeGreaterThan(0);
    expect(stat.pilotEmissiveIntensity).toBeGreaterThan(0);
  }

  await page.evaluate(() => window.__vrGalleryDebug.toggleSwitch("Room"));
  await page.evaluate(() => window.__vrGalleryDebug.toggleSwitch("Art"));

  const after = await page.evaluate(() => window.__vrGalleryDebug.getSwitchStats());
  expect(after).toHaveLength(2);
  for (const stat of after) {
    expect(stat.state).toBe(false);
    expect(stat.pilotLightIntensity).toBeGreaterThan(0);
    expect(stat.pilotEmissiveIntensity).toBeGreaterThan(0);
  }

  const roomBefore = before.find((stat) => stat.label === "Room");
  const roomAfter = after.find((stat) => stat.label === "Room");
  const artBefore = before.find((stat) => stat.label === "Art");
  const artAfter = after.find((stat) => stat.label === "Art");

  expect(roomBefore).toBeTruthy();
  expect(roomAfter).toBeTruthy();
  expect(artBefore).toBeTruthy();
  expect(artAfter).toBeTruthy();
  expect(roomAfter.pilotLightIntensity).toBeGreaterThan(roomBefore.pilotLightIntensity);
  expect(artAfter.pilotLightIntensity).toBeGreaterThan(artBefore.pilotLightIntensity);
});

test("vr video controls win hit selection over the screen surface", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.openVrVideoForTest === "function"
  );

  await page.evaluate(() => window.__vrGalleryDebug.openVrVideoForTest("Mona Lisa"));

  await page.waitForFunction(() => {
    const state = window.__vrGalleryDebug?.getVrVideoState?.();
    return Boolean(state?.open);
  });

  const state = await page.evaluate(() => window.__vrGalleryDebug.getVrVideoState());
  expect(state.controls).toEqual(
    expect.arrayContaining(["toggle", "playPause", "stop", "close", "seek", "volume", "recenter", "drag"])
  );

  const probes = await page.evaluate(() => ({
    close: window.__vrGalleryDebug.probeVrVideoControl("close"),
    stop: window.__vrGalleryDebug.probeVrVideoControl("stop"),
    drag: window.__vrGalleryDebug.probeVrVideoControl("drag"),
  }));

  for (const probe of Object.values(probes)) {
    expect(probe).toBeTruthy();
    expect(probe.hitActions).toContain("toggle");
    expect(probe.chosenAction).toBe(probe.requestedAction);
  }
});

test("vr video close control closes the player in debug mode", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.invokeVrVideoControl === "function"
  );

  await page.evaluate(() => window.__vrGalleryDebug.openVrVideoForTest("Mona Lisa"));

  await page.waitForFunction(() => {
    const state = window.__vrGalleryDebug?.getVrVideoState?.();
    return Boolean(state?.open);
  });

  const invokedAction = await page.evaluate(() => window.__vrGalleryDebug.invokeVrVideoControl("close"));
  expect(invokedAction).toBe("close");

  await expect
    .poll(async () => page.evaluate(() => window.__vrGalleryDebug.getVrVideoState().open))
    .toBe(false);
});

test("vr video can switch to a different guide without keeping the old player", async ({ page }) => {
  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.replaceVrVideoForTest === "function"
  );

  await page.evaluate(() => window.__vrGalleryDebug.openVrVideoForTest("Mona Lisa"));

  await expect
    .poll(async () => page.evaluate(() => window.__vrGalleryDebug.getVrVideoState().src))
    .toContain("mona_lisa.mp4");

  await page.evaluate(() => window.__vrGalleryDebug.replaceVrVideoForTest("The Starry Night"));

  await expect
    .poll(async () => page.evaluate(() => window.__vrGalleryDebug.getVrVideoState().src))
    .toContain("starry_night.mp4");

  const state = await page.evaluate(() => window.__vrGalleryDebug.getVrVideoState());
  expect(state.open).toBe(true);
  expect(state.controls).toContain("toggle");
});

test("visual: painting detail is visible", async ({ page }) => {
  test.slow();

  await page.goto(`${serverInfo.baseUrl}/index.html?debug=1`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__vrGalleryDebug && typeof window.__vrGalleryDebug.focusPainting === "function"
  );

  await page.evaluate(() => {
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.style.display = "none";
  });

  await page.evaluate(() => window.__vrGalleryDebug.setPointerLocked(true));
  await page.evaluate(() => window.__vrGalleryDebug.focusPainting(0, 1.2));
  await page.evaluate(() => window.__vrGalleryDebug.waitForHighTextures());
  await page.waitForTimeout(300);

  await expect(page).toHaveScreenshot("painting-detail.png", {
    clip: { x: 0, y: 0, width: 1280, height: 520 },
  });
});
