const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const manifestPath = path.join(__dirname, "..", "manifest.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const swPath = path.join(__dirname, "..", "sw.js");
const sw = fs.readFileSync(swPath, "utf8");

test("index.html boots WebXR correctly", () => {
  assert.match(html, /renderer\.xr\.enabled\s*=\s*true/);
  assert.match(html, /renderer\.xr\.setReferenceSpaceType\(["']local-floor["']\)/);
  assert.match(html, /VRButton\.createButton/);
});

test("teleport locomotion is present", () => {
  assert.match(html, /const\s+TELEPORT\s*=\s*{[\s\S]*maxDistance/);
  assert.match(html, /function\s+buildTeleportMarker\s*\(/);
  assert.match(html, /function\s+updateTeleportTarget\s*\(/);
  assert.match(html, /function\s+onSqueezeStart\s*\(/);
});

test("web app launch is configured for fullscreen-capable installs", () => {
  assert.match(html, /rel="manifest"/);
  assert.match(html, /id="fullscreen-toggle"/);
  assert.match(html, /id="enter-vr-button"/);
  assert.match(html, /id="install-button"/);
  assert.match(html, /id="launch-note"/);
  assert.match(html, /requestFullscreen\(\{ navigationUI: "hide" }\)/);
  assert.match(html, /navigator\.serviceWorker\.register\("\.\/sw\.js"/);
  assert.match(html, /beforeinstallprompt/);
  assert.match(html, /navigator\.xr\.requestSession\("immersive-vr"/);
  assert.match(html, /maybeAutoEnterVr/);
  assert.match(html, /function\s+isQuestBrowser\s*\(/);
  assert.match(html, /function\s+getSecureContextHint\s*\(/);
  assert.match(html, /HTTPS requerido/);
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.display_override.includes("standalone"));
  assert.ok(manifest.icons.some((icon) => icon.src.includes("vr-gallery-icon-192.png")));
  assert.ok(manifest.icons.some((icon) => icon.src.includes("vr-gallery-icon-512.png")));
  assert.ok(sw.includes("const CACHE_NAME = \"vr-gallery-shell-v1\""));
  assert.ok(sw.includes("https://unpkg.com"));
});

test("girl with a pearl earring easter egg audio is wired", () => {
  assert.match(html, /const\s+EASTER_EGG\s*=\s*{[\s\S]*paintingTitle:\s*"Girl with a Pearl Earring"/);
  assert.match(html, /audioFile:\s*"assets\/titin\.m4a"/);
  assert.match(html, /tapCount:\s*7/);
  assert.match(html, /function\s+handlePaintingHit\s*\(/);
  assert.match(html, /new Audio\(EASTER_EGG\.audioFile\)/);
  assert.match(html, /clickableObjects\.push\(plane,\s*frame\)/);
});

test("quest artwork approach aids are present", () => {
  assert.match(html, /const\s+VIEWING_SPOT\s*=\s*{[\s\S]*ringOuterRadius/);
  assert.match(html, /const\s+FOCUS_BUTTON\s*=\s*{[\s\S]*frontOffset/);
  assert.match(html, /function\s+focusPainting\s*\(/);
  assert.match(html, /function\s+createArtworkFocusButton\s*\(/);
  assert.match(html, /function\s+addArtworkViewingSpot\s*\(/);
  assert.match(html, /addArtworkViewingSpot\(painting\)/);
  assert.match(html, /Acercarme/);
});

test("snap turn and stick movement are configured", () => {
  assert.match(html, /const\s+LOCOMOTION\s*=\s*{[\s\S]*snapTurnAngle/);
  assert.match(html, /snapTurnCooldown/);
  assert.match(html, /function\s+updateMovement\s*\(/);
});

test("collisions are defined for benches and fountain", () => {
  assert.match(html, /function\s+addColliderFromObject\s*\(/);
  assert.match(html, /function\s+resolveCollisions\s*\(/);
  assert.match(html, /addColliderFromObject\(bench/);
  assert.match(html, /addColliderFromObject\(fountain/);
});

test("switches include locator pilot LEDs", () => {
  assert.match(html, /const\s+SWITCH_PILOT\s*=\s*{[\s\S]*lightIntensityOff/);
  assert.match(html, /pilotLens\s*=\s*new THREE\.Mesh\(new THREE\.CylinderGeometry/);
  assert.match(html, /pilotLight\s*=\s*new THREE\.PointLight\(/);
  assert.match(html, /data\.pilotLight\.intensity\s*=\s*isOn/);
});

test("artworks include info-card metadata and conditional audio badges", () => {
  assert.match(html, /const\s+INFO_CARD\s*=\s*{[\s\S]*frontOffset/);
  assert.match(html, /year:\s*"/);
  assert.match(html, /synopsis:\s*"/);
  assert.match(html, /hasAudioGuide:\s*(true|false)/);
  assert.match(html, /function\s+createArtworkInfoCard\s*\(/);
  assert.match(html, /function\s+drawAudioBadge\s*\(/);
});
