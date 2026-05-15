import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { CrossSection, Manifold, Mesh } from "./manifold-runtime.js";

const D = {
  unit: 15.88,
  studRadius: 4.67,
  studHeight: 4.6,
  studHeightClearance: 0.15,
  antiStudOuterRadius: 6.55,
  antiStudWall: 1,
  featureClearance: 1.25,
  // Fit reliefs for generated-on-generated mounts; nominal dimensions stay above.
  studOpeningClearance: 0.18,
  antiStudClampRelief: 0.12
};

const EPSILON = 0.08;

const els = {
  canvas: document.querySelector("#brickCanvas"),
  stlFile: document.querySelector("#stlFile"),
  demoButton: document.querySelector("#demoButton"),
  buildButton: document.querySelector("#buildButton"),
  downloadLink: document.querySelector("#downloadLink"),
  planeX: document.querySelector("#planeX"),
  planeY: document.querySelector("#planeY"),
  planeZ: document.querySelector("#planeZ"),
  planeZValue: document.querySelector("#planeZValue"),
  planePitch: document.querySelector("#planePitch"),
  planeRoll: document.querySelector("#planeRoll"),
  gridAngle: document.querySelector("#gridAngle"),
  movePlaneButton: document.querySelector("#movePlaneButton"),
  rotatePlaneButton: document.querySelector("#rotatePlaneButton"),
  sourceButton: document.querySelector("#sourceButton"),
  resultButton: document.querySelector("#resultButton"),
  deletePartButton: document.querySelector("#deletePartButton"),
  resetCameraButton: document.querySelector("#resetCameraButton"),
  modelTitle: document.querySelector("#modelTitle"),
  statusText: document.querySelector("#statusText"),
  footprintStat: document.querySelector("#footprintStat"),
  sourceStat: document.querySelector("#sourceStat"),
  resultStat: document.querySelector("#resultStat")
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151515);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
camera.up.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer({
  canvas: els.canvas,
  antialias: true,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, els.canvas);
controls.enableDamping = false;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.75;
controls.addEventListener("start", () => {
  if (pointerDown) {
    pointerDown.controlsStarted = true;
  }
});
controls.addEventListener("change", () => {
  if (pointerDown) {
    pointerDown.cameraMoved = true;
  }
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;

const modelRoot = new THREE.Group();
const planeHandle = new THREE.Group();
const planeVisuals = new THREE.Group();
planeHandle.add(planeVisuals);
scene.add(modelRoot);
scene.add(planeHandle);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.attach(planeHandle);
transformControls.setMode("translate");
transformControls.setSize(0.82);
const transformHelper = transformControls.getHelper();
scene.add(transformHelper);
transformControls.addEventListener("dragging-changed", (event) => {
  controls.enabled = !event.value;
});
transformControls.addEventListener("objectChange", () => {
  syncInputsFromPlaneHandle();
  clearResult();
  updateControlsAndPlane(false);
});

const grid = new THREE.GridHelper(180, 18, 0xb7ff3c, 0x484848);
grid.rotation.x = Math.PI / 2;
grid.position.z = -0.02;
scene.add(grid);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(4, -5, 8);
scene.add(keyLight);
scene.add(new THREE.HemisphereLight(0xf4f1e8, 0x252525, 1.55));

const stlLoader = new STLLoader();
const state = {
  sourceName: "Demo Sphere",
  sourceManifold: null,
  sourceBounds: null,
  sourceTriangles: 0,
  resultManifold: null,
  resultManifolds: [],
  resultPartNames: [],
  selectedResultIndex: null,
  resultTriangles: 0,
  resultBounds: null,
  resultPartBounds: [],
  splitInfo: null,
  planePreview: null,
  viewMode: "source",
  downloadUrl: null,
  currentGeometry: null,
  currentBox: null,
  pickableMeshes: []
};

let readyResolve;
window.__everythingABrickReady = new Promise((resolve) => {
  readyResolve = resolve;
});

window.__everythingABrick = {
  build: () => buildBrick(),
  loadDemo: () => loadDemo(),
  reset: () => resetWork(),
  deleteSelectedPart: () => deleteSelectedPart(),
  setCamera: ({ position, target }) => setDebugCamera(position, target),
  getState: () => ({
    sourceLoaded: Boolean(state.sourceManifold),
    resultLoaded: state.resultManifolds.length > 0,
    sourceTriangles: state.sourceTriangles,
    resultTriangles: state.resultTriangles,
    sourceBounds: cloneBounds(state.sourceBounds),
    resultBounds: cloneBounds(state.resultBounds),
    resultPartBounds: state.resultPartBounds.map(cloneBounds),
    resultPartNames: [...state.resultPartNames],
    selectedResultIndex: state.selectedResultIndex,
    splitInfo: state.splitInfo,
    planePreview: state.planePreview,
    dimensions: {
      studHeight: D.studHeight,
      studHeightClearance: D.studHeightClearance,
      studFeatureDepth: studFeatureDepth(),
      studOpeningRadius: studOpeningRadius(),
      antiStudRingOuterRadius: antiStudRingOuterRadius(),
      antiStudToolRadius: antiStudToolRadius(),
      minimumMountDepth: minimumMountDepth()
    },
    plane: planeState(),
    camera: {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      damping: controls.enableDamping
    },
    viewMode: state.viewMode,
    downloadReady: els.downloadLink.getAttribute("aria-disabled") !== "true"
  })
};

init();

function init() {
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  els.demoButton.addEventListener("click", () => loadDemo());
  els.stlFile.addEventListener("change", handleFileInput);
  els.buildButton.addEventListener("click", () => buildBrick());
  els.movePlaneButton.addEventListener("click", () => setPlaneMode("translate"));
  els.rotatePlaneButton.addEventListener("click", () => setPlaneMode("rotate"));
  els.sourceButton.addEventListener("click", () => setViewMode("source"));
  els.resultButton.addEventListener("click", () => setViewMode("result"));
  els.deletePartButton.addEventListener("click", () => deleteSelectedPart());
  els.resetCameraButton.addEventListener("click", () => resetWork());
  els.canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  els.canvas.addEventListener("pointermove", handleCanvasPointerMove);
  els.canvas.addEventListener("pointerup", handleCanvasPointerUp);

  for (const input of [
    els.planeX,
    els.planeY,
    els.planeZ,
    els.planePitch,
    els.planeRoll,
    els.gridAngle
  ]) {
    input.addEventListener("input", updateControlsAndPlane);
    input.addEventListener("change", updateControlsAndPlane);
  }

  loadDemo();
  animate();
}

function loadDemo() {
  setStatus("Loading demo sphere. A round victim, at last.");
  const sphereRadius = 48;
  setSourceManifold(Manifold.sphere(sphereRadius, 64), "Demo Sphere");
  els.planeZ.value = sphereRadius.toFixed(1);
  updateControlsAndPlane();
  setViewMode("source");
  setStatus("Demo sphere loaded. The cut face is now large, round, and harder to blame.");
  readyResolve?.(window.__everythingABrick.getState());
}

async function handleFileInput(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  setStatus(`Reading ${file.name}. Please remain calm around triangles.`);

  try {
    const buffer = await file.arrayBuffer();
    const geometry = stlLoader.parse(buffer);
    geometry.computeVertexNormals();
    const source = geometryToManifold(geometry);
    setSourceManifold(source, file.name.replace(/\.stl$/i, ""));
    setStatus("STL loaded. It appears to be a solid citizen.");
  } catch (error) {
    setStatus(`That STL resisted becoming a solid: ${error.message ?? error}`);
  }
}

function setSourceManifold(manifold, name) {
  clearResult();
  const normalized = normalizeManifold(manifold);
  state.sourceName = name;
  state.sourceManifold = normalized.manifold;
  state.sourceBounds = normalized.bounds;
  state.sourceTriangles = state.sourceManifold.numTri();
  state.viewMode = "source";
  els.modelTitle.textContent = name;
  recommendControls(normalized.bounds);
  updateControlsAndPlane();
  setViewMode("source");
}

function normalizeManifold(manifold) {
  const bounds = manifold.boundingBox();
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  const normalized = manifold.translate([-centerX, -centerY, -bounds.min[2]]);
  return {
    manifold: normalized,
    bounds: normalized.boundingBox()
  };
}

function recommendControls(bounds) {
  const spanZ = bounds.max[2] - bounds.min[2];
  const maxOffset = Math.max(0, spanZ - 0.2);

  els.planeX.value = "0";
  els.planeY.value = "0";
  els.planePitch.value = "0";
  els.planeRoll.value = "0";
  els.gridAngle.value = "0";
  els.planeZ.min = "0";
  els.planeZ.max = maxOffset.toFixed(1);
  els.planeZ.value = clamp(recommendedPlaneOffset(spanZ), 0, maxOffset).toFixed(1);
  syncPlaneHandleFromInputs();
}

function recommendedPlaneOffset(spanZ) {
  const minDepth = minimumMountDepth();
  if (spanZ >= minDepth * 2) {
    return minDepth;
  }
  if (spanZ > minDepth) {
    return spanZ - minDepth;
  }
  return Math.min(studFeatureDepth() * 1.3, Math.max(0, spanZ - studFeatureDepth()));
}

function buildBrick() {
  if (!state.sourceManifold) {
    setStatus("No source mesh. Even this app has standards.");
    return;
  }

  setStatus("Cutting mounting features into the original mesh. No adapter base will be summoned.");

  try {
    const options = readOptions();
    const planeFrame = makePlaneFrame(options);
    const planeOffset = planeFrame.normal.dot(planeFrame.origin);
    const [front, back] = state.sourceManifold.splitByPlane(vectorToArray(planeFrame.normal), planeOffset);
    const depth = projectedDepths(state.sourceBounds, planeFrame.normal, planeOffset);
    const requiredDepth = minimumMountDepth();
    const parts = [];
    const featureStats = {};
    const kept = [];
    const discarded = [];

    if (depth.front >= requiredDepth && !front.isEmpty()) {
      const frame = makeSideFrame(options, 1);
      const carved = carveMountFeatures(front, frame, options);
      parts.push({ name: "front", frame, localManifold: carved.localManifold });
      featureStats.front = carved.features;
      kept.push("front");
    } else {
      discarded.push("front");
    }

    if (depth.back >= requiredDepth && !back.isEmpty()) {
      const frame = makeSideFrame(options, -1);
      const carved = carveMountFeatures(back, frame, options);
      parts.push({ name: "back", frame, localManifold: carved.localManifold });
      featureStats.back = carved.features;
      kept.push("back");
    } else {
      discarded.push("back");
    }

    if (parts.length === 0) {
      clearResult();
      state.splitInfo = { kept: [], discarded, frontDepth: depth.front, backDepth: depth.back, requiredDepth, featureStats };
      updateStats();
      setStatus("Both sides are too shallow for a sturdy mounting pattern. The mesh has declined brickhood.");
      return;
    }

    const explodedParts = explodeParts(parts, options);
    state.resultManifolds = explodedParts;
    state.resultPartNames = parts.map((part) => part.name);
    state.selectedResultIndex = null;
    state.resultManifold = explodedParts[0];
    state.resultTriangles = sumTriangles(explodedParts);
    state.resultBounds = combinedManifoldBounds(explodedParts);
    state.resultPartBounds = explodedParts.map((part) => part.boundingBox());
    state.splitInfo = { kept, discarded, frontDepth: depth.front, backDepth: depth.back, requiredDepth, featureStats };
    state.viewMode = "result";
    setDownload(explodedParts);
    updateStats();
    updateResultPartControls();
    setViewMode("result");
    setPlaneToolVisible(false);
    setStatus(resultMessage(kept, discarded));
  } catch (error) {
    setStatus(`Geometry kernel objected: ${error.message ?? error}`);
  }
}

function resultMessage(kept, discarded) {
  const keptText = kept.length === 2 ? "both halves" : `${kept[0]} half`;
  const discardText = discarded.length ? ` Discarded ${discarded.join(" and ")} for being too shallow.` : "";
  return `Generated cut-only mounts on ${keptText}; exploded on the cutting plane for inspection; ${state.resultTriangles.toLocaleString()} triangles survived.${discardText}`;
}

function resetWork() {
  if (!state.sourceManifold) {
    return;
  }

  clearResult();
  setViewMode("source");
  setPlaneToolVisible(true);
  setStatus("Reset to the source mesh. The previous cut has been escorted out.");
}

function selectResultPart(index) {
  if (!state.resultManifolds.length || index < 0 || index >= state.resultManifolds.length) {
    state.selectedResultIndex = null;
  } else {
    state.selectedResultIndex = index;
  }

  updateResultPartControls();
  if (state.viewMode === "result") {
    renderManifolds(state.resultManifolds, 0xc24c2f, { frame: false });
  }
}

function deleteSelectedPart() {
  if (state.resultManifolds.length < 2 || state.selectedResultIndex === null) {
    return;
  }

  const removedName = state.resultPartNames[state.selectedResultIndex] ?? `part ${state.selectedResultIndex + 1}`;
  state.resultManifolds.splice(state.selectedResultIndex, 1);
  state.resultPartNames.splice(state.selectedResultIndex, 1);
  if (state.splitInfo?.kept) {
    state.splitInfo.kept.splice(state.selectedResultIndex, 1);
  }
  state.selectedResultIndex = null;
  refreshResultState();
  setViewMode("result");
  setPlaneToolVisible(false);
  setStatus(`Deleted the ${removedName} result part. The pile is slightly less ambitious now.`);
}

function refreshResultState() {
  state.resultManifold = state.resultManifolds[0] ?? null;
  state.resultTriangles = sumTriangles(state.resultManifolds);
  state.resultBounds = combinedManifoldBounds(state.resultManifolds);
  state.resultPartBounds = state.resultManifolds.map((part) => part.boundingBox());
  if (state.resultManifolds.length) {
    setDownload(state.resultManifolds);
  } else {
    clearResult();
  }
  updateResultPartControls();
  updateStats();
}

function updateResultPartControls() {
  els.deletePartButton.disabled = !(state.resultManifolds.length > 1 && state.selectedResultIndex !== null);
}

function handleCanvasPointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  pointerDown = {
    x: event.clientX,
    y: event.clientY,
    moved: false,
    cameraMoved: false,
    controlsStarted: false
  };
}

function handleCanvasPointerMove(event) {
  if (!pointerDown) {
    return;
  }

  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  if (Math.hypot(dx, dy) > 3) {
    pointerDown.moved = true;
  }
}

function handleCanvasPointerUp(event) {
  if (!pointerDown) {
    return;
  }

  const dx = event.clientX - pointerDown.x;
  const dy = event.clientY - pointerDown.y;
  const wasDrag =
    pointerDown.moved ||
    pointerDown.cameraMoved ||
    Math.hypot(dx, dy) > 3;
  pointerDown = null;

  if (wasDrag) {
    return;
  }

  pickResultPart(event);
}

function pickResultPart(event) {
  if (state.viewMode !== "result" || state.resultManifolds.length < 2) {
    return;
  }

  const rect = els.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster
    .intersectObjects(state.pickableMeshes, false)
    .find((intersection) => Number.isInteger(intersection.object.userData.resultIndex));

  const index = hit?.object.userData.resultIndex;
  if (!Number.isInteger(index)) {
    return;
  }

  selectResultPart(index);
  const name = state.resultPartNames[index] ?? `part ${index + 1}`;
  setStatus(`Selected ${name}. Delete it if this particular chunk is embarrassing.`);
}

function explodeParts(parts, options) {
  const layouts = parts.map((part) => ({
    manifold: part.localManifold,
    bounds: part.localManifold.boundingBox()
  }));
  const gap = Math.max(D.unit * 5, studFeatureDepth() * 5, 80);
  const widths = layouts.map(({ bounds }) => bounds.max[0] - bounds.min[0]);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, layouts.length - 1);
  let cursor = -totalWidth / 2;

  return layouts.map(({ manifold, bounds }, index) => {
    const width = widths[index];
    const targetCenterX = cursor + width / 2;
    cursor += width + gap;
    return placeLocalPartOnPlane(manifold, bounds, targetCenterX);
  });
}

function placeLocalPartOnPlane(manifold, bounds, targetCenterX) {
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  return manifold.translate([
    targetCenterX - centerX,
    -centerY,
    -bounds.min[2]
  ]);
}

function carveMountFeatures(part, frame, options) {
  const localPart = transformFromFrame(part, frame);
  const { cutter, features } = makeMountCutter(localPart);
  return {
    localManifold: cutter ? localPart.subtract(cutter) : localPart,
    features
  };
}

function readOptions() {
  return {
    planeCenter: new THREE.Vector3(
      clamp(Number(els.planeX.value), -120, 120),
      clamp(Number(els.planeY.value), -120, 120),
      clamp(Number(els.planeZ.value), Number(els.planeZ.min), Number(els.planeZ.max))
    ),
    pitch: clamp(Number(els.planePitch.value), -180, 180),
    roll: clamp(Number(els.planeRoll.value), -180, 180),
    gridAngle: clamp(Number(els.gridAngle.value), -180, 180)
  };
}

function makePlaneFrame(options) {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(options.pitch),
    THREE.MathUtils.degToRad(options.roll),
    THREE.MathUtils.degToRad(options.gridAngle),
    "XYZ"
  ));
  const u = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
  const v = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();

  return {
    origin: options.planeCenter.clone(),
    normal,
    u,
    v
  };
}

function makeSideFrame(options, sign) {
  const plane = makePlaneFrame(options);
  const w = plane.normal.clone().multiplyScalar(sign).normalize();
  return {
    origin: plane.origin,
    u: plane.u,
    v: new THREE.Vector3().crossVectors(w, plane.u).normalize(),
    w
  };
}

function makeMountCutter(localPart) {
  const face = mountPatternFace(localPart);
  const bounds = face.bounds;
  const depth = studFeatureDepth();
  const antiStudCenters = gridCentersForBounds(
    bounds,
    D.unit / 2,
    D.unit / 2,
    antiStudToolRadius()
  );
  const studCenters = gridCentersForBounds(
    bounds,
    0,
    0,
    studOpeningRadius()
  );
  const partialAntiStudCenters = findPartialAntiStudCenters(antiStudCenters, face);
  const exteriorKeepOut = exteriorSurfaceKeepOut(localPart, depth);
  const cutterParts = [];
  if (antiStudCenters.length) {
    let antiStudCutter = combine(
      antiStudCenters.map((center) => antiStudPocket(depth, [center[0], center[1], 0]))
    );
    if (exteriorKeepOut) {
      antiStudCutter = antiStudCutter.subtract(exteriorKeepOut);
    }
    if (!antiStudCutter.isEmpty()) {
      cutterParts.push(antiStudCutter);
    }
  }
  if (studCenters.length) {
    cutterParts.push(combine(studCenters.map((center) => studOpening(depth, center))));
  }

  return {
    cutter: cutterParts.length ? combine(cutterParts) : null,
    features: {
      antiStuds: antiStudCenters.length,
      partialAntiStuds: partialAntiStudCenters.length,
      edgeWallRestores: exteriorKeepOut ? partialAntiStudCenters.length : 0,
      studOpenings: studCenters.length,
      antiStudCenters,
      partialAntiStudCenters,
      studCenters,
      patternDepth: depth,
      bounds
    }
  };
}

function mountPatternFace(localPart) {
  const section = localPart.slice(EPSILON);
  if (!section.isEmpty()) {
    const bounds = section.bounds();
    return {
      bounds: {
        min: [bounds.min[0], bounds.min[1]],
        max: [bounds.max[0], bounds.max[1]]
      },
      section
    };
  }

  const bounds = localPart.boundingBox();
  return {
    bounds: {
      min: [bounds.min[0], bounds.min[1]],
      max: [bounds.max[0], bounds.max[1]]
    },
    section: null
  };
}

function findPartialAntiStudCenters(centers, face) {
  if (!centers.length) {
    return [];
  }

  if (!face.section || face.section.isEmpty()) {
    return centers.filter((center) => !circleFitsBounds(center, antiStudToolRadius(), face.bounds));
  }

  const toolCircle = CrossSection.circle(antiStudToolRadius(), 72);
  const fullArea = toolCircle.area();
  const partialAreaTolerance = 0.35;
  return centers.filter((center) => {
    const overlapArea = face.section.intersect(toolCircle.translate(center)).area();
    return overlapArea > partialAreaTolerance && overlapArea < fullArea - partialAreaTolerance;
  });
}

function exteriorSurfaceKeepOut(localPart, depth) {
  const depthPart = clipToFeatureDepth(localPart, depth);
  if (depthPart.isEmpty()) {
    return null;
  }

  const projection = depthPart.project().simplify(0.04);
  const inset = projection.offset(-exteriorSkinThickness(), "Round", 2, 24).simplify(0.03);
  const skinSection = inset.isEmpty() ? projection : projection.subtract(inset).simplify(0.03);
  if (skinSection.isEmpty()) {
    return null;
  }

  const height = depth + EPSILON * 4;
  const skinVolume = skinSection.extrude(height).translate([0, 0, -EPSILON * 2]);
  const mask = depthPart.intersect(skinVolume);
  return mask.isEmpty() ? null : mask;
}

function clipToFeatureDepth(localPart, depth) {
  const bounds = localPart.boundingBox();
  const margin = D.unit;
  const sizeX = bounds.max[0] - bounds.min[0] + margin * 2;
  const sizeY = bounds.max[1] - bounds.min[1] + margin * 2;
  const sizeZ = depth + EPSILON * 4;
  const clip = Manifold.cube([sizeX, sizeY, sizeZ])
    .translate([bounds.min[0] - margin, bounds.min[1] - margin, -EPSILON * 2]);
  return localPart.intersect(clip);
}

function antiStudPocket(height, center) {
  const pocket = Manifold.cylinder(
    height + EPSILON,
    antiStudToolRadius(),
    antiStudToolRadius(),
    72
  ).translate([0, 0, -EPSILON]);
  const ring = antiStudRing(height + EPSILON, [0, 0, -EPSILON]);
  return pocket.subtract(ring).translate(center);
}

function antiStudRing(height, center) {
  const outerRadius = antiStudRingOuterRadius();
  const innerRadius = antiStudRingInnerRadius();
  const outer = Manifold.cylinder(height, outerRadius, outerRadius, 72);
  const inner = Manifold.cylinder(
    height + EPSILON * 4,
    innerRadius,
    innerRadius,
    72
  ).translate([0, 0, -EPSILON * 2]);
  return outer.subtract(inner).translate(center);
}

function studOpening(depth, center) {
  const radius = studOpeningRadius();
  return Manifold.cylinder(depth + EPSILON, radius, radius, 48)
    .translate([center[0], center[1], -EPSILON]);
}

function studOpeningRadius() {
  return D.studRadius + D.studOpeningClearance;
}

function antiStudRingOuterRadius() {
  return Math.max(antiStudRingInnerRadius() + 0.3, D.antiStudOuterRadius - D.antiStudClampRelief);
}

function antiStudRingInnerRadius() {
  return D.antiStudOuterRadius - D.antiStudWall;
}

function antiStudToolRadius() {
  return D.antiStudOuterRadius + D.featureClearance;
}

function exteriorSkinThickness() {
  return Math.max(1.8, D.antiStudWall + 0.8);
}

function studFeatureDepth() {
  return D.studHeight + D.studHeightClearance;
}

function minimumMountDepth() {
  return D.unit;
}

function circleFitsBounds(center, radius, bounds) {
  return center[0] - radius >= bounds.min[0] &&
    center[0] + radius <= bounds.max[0] &&
    center[1] - radius >= bounds.min[1] &&
    center[1] + radius <= bounds.max[1];
}

function transformToFrame(manifold, frame) {
  return manifold.transform([
    frame.u.x, frame.u.y, frame.u.z, 0,
    frame.v.x, frame.v.y, frame.v.z, 0,
    frame.w.x, frame.w.y, frame.w.z, 0,
    frame.origin.x, frame.origin.y, frame.origin.z, 1
  ]);
}

function transformFromFrame(manifold, frame) {
  return manifold.transform([
    frame.u.x, frame.v.x, frame.w.x, 0,
    frame.u.y, frame.v.y, frame.w.y, 0,
    frame.u.z, frame.v.z, frame.w.z, 0,
    -frame.origin.dot(frame.u), -frame.origin.dot(frame.v), -frame.origin.dot(frame.w), 1
  ]);
}

function gridCentersForBounds(bounds, offsetX, offsetY, margin = 0) {
  if (!bounds) {
    return [];
  }

  const centers = [];
  for (const x of gridValues(bounds.min[0] - margin, bounds.max[0] + margin, D.unit, offsetX)) {
    for (const y of gridValues(bounds.min[1] - margin, bounds.max[1] + margin, D.unit, offsetY)) {
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

function projectedDepths(bounds, normal, planeOffset) {
  const corners = boundsCorners(bounds);
  let min = Infinity;
  let max = -Infinity;

  for (const corner of corners) {
    const value = normal.dot(corner);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return {
    front: Math.max(0, max - planeOffset),
    back: Math.max(0, planeOffset - min)
  };
}

function projectedFrameBounds(bounds, frame) {
  const corners = boundsCorners(bounds);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    const relative = corner.clone().sub(frame.origin);
    const x = relative.dot(frame.u);
    const y = relative.dot(frame.v);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return {
    min: [minX, minY],
    max: [maxX, maxY]
  };
}

function boundsCorners(bounds) {
  const corners = [];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        corners.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  return corners;
}

function geometryToManifold(geometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.attributes.position;
  const vertices = [];
  const indices = [];
  const vertexMap = new Map();

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const key = `${roundKey(x)},${roundKey(y)},${roundKey(z)}`;
    let index = vertexMap.get(key);

    if (index === undefined) {
      index = vertices.length / 3;
      vertexMap.set(key, index);
      vertices.push(x, y, z);
    }

    indices.push(index);
  }

  return Manifold.ofMesh(new Mesh({
    numProp: 3,
    vertProperties: new Float32Array(vertices),
    triVerts: new Uint32Array(indices)
  }));
}

function manifoldToGeometry(manifold) {
  const mesh = manifold.getMesh();
  const vertices = mesh.vertProperties.length / mesh.numProp;
  const positions = new Float32Array(vertices * 3);

  for (let i = 0; i < vertices; i += 1) {
    positions[i * 3] = mesh.vertProperties[i * mesh.numProp];
    positions[i * 3 + 1] = mesh.vertProperties[i * mesh.numProp + 1];
    positions[i * 3 + 2] = mesh.vertProperties[i * mesh.numProp + 2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.triVerts, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function setViewMode(mode) {
  state.viewMode = mode;
  els.sourceButton.setAttribute("aria-pressed", String(mode === "source"));
  els.resultButton.setAttribute("aria-pressed", String(mode === "result"));
  setPlaneToolVisible(mode === "source" && state.resultManifolds.length === 0);

  if (mode === "result" && state.resultManifolds.length) {
    renderManifolds(state.resultManifolds, 0xc24c2f);
  } else {
    renderManifolds([state.sourceManifold], 0x247c8a);
  }
}

function setPlaneToolVisible(visible) {
  planeHandle.visible = visible;
  transformHelper.visible = visible;
  transformControls.enabled = visible;
  if (!visible) {
    controls.enabled = true;
  }
  els.movePlaneButton.hidden = !visible;
  els.rotatePlaneButton.hidden = !visible;
}

function renderManifolds(manifolds, color, { frame = true } = {}) {
  modelRoot.clear();
  state.pickableMeshes = [];
  const visible = manifolds.filter(Boolean);

  if (!visible.length) {
    return;
  }

  const viewBox = new THREE.Box3();
  state.currentGeometry = null;

  visible.forEach((manifold, index) => {
    const geometry = manifoldToGeometry(manifold);
    state.currentGeometry = geometry;
    viewBox.union(geometry.boundingBox);
    const isSelectedResult = state.viewMode === "result" && index === state.selectedResultIndex;

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: isSelectedResult ? 0xb7ff3c : color,
        roughness: 0.5,
        metalness: 0.04
      })
    );
    if (state.viewMode === "result") {
      mesh.userData.resultIndex = index;
      state.pickableMeshes.push(mesh);
    }
    modelRoot.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 24),
      new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.34 })
    );
    modelRoot.add(edges);
  });

  state.currentBox = viewBox;
  if (frame) {
    frameCameraBox(viewBox);
  }
  updatePlaneHelper();
}

function updatePlaneHelper() {
  planeVisuals.clear();
  state.planePreview = null;

  if (!state.sourceManifold) {
    return;
  }

  const options = readOptions();
  const frame = makePlaneFrame(options);
  const bounds = sourceCutPlaneBounds(options) ?? projectedFrameBounds(state.sourceBounds, frame);
  const width = Math.max(D.unit, bounds.max[0] - bounds.min[0]);
  const depth = Math.max(D.unit, bounds.max[1] - bounds.min[1]);
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;

  addPlaneRectangle([centerX, centerY], width, depth, 0xb7ff3c, 0.72);
  addPlaneLine([
    new THREE.Vector3(bounds.min[0], 0, 0.24),
    new THREE.Vector3(bounds.max[0], 0, 0.24)
  ], 0xb7ff3c, 0.95);
  addPlaneLine([
    new THREE.Vector3(0, bounds.min[1], 0.26),
    new THREE.Vector3(0, bounds.max[1], 0.26)
  ], 0xb7ff3c, 0.72);

  const antiStudOffsets = [D.unit / 2, D.unit / 2];
  const studOffsets = [0, 0];
  const antiStudCenters = gridCentersForBounds(
    bounds,
    antiStudOffsets[0],
    antiStudOffsets[1],
    antiStudToolRadius()
  );
  const studCenters = gridCentersForBounds(bounds, studOffsets[0], studOffsets[1], studOpeningRadius());

  for (const center of antiStudCenters) {
    addPlaneCircle(center, antiStudToolRadius(), 0xb7ff3c, 0.4, 0.3);
    addPlaneCircle(center, antiStudRingInnerRadius(), 0xb7ff3c, 0.58, 0.32);
  }

  for (const center of studCenters) {
    addPlaneCircle(center, studOpeningRadius(), 0xdc4d7a, 0.68, 0.36);
  }

  state.planePreview = {
    bounds: {
      min: [...bounds.min],
      max: [...bounds.max]
    },
    antiStudOffset: antiStudOffsets,
    studOffset: studOffsets,
    antiStudRings: antiStudCenters.length,
    studOpenings: studCenters.length,
    antiStudCenters,
    studCenters,
    patternDepth: studFeatureDepth(),
    filledPlane: false
  };
}

function sourceCutPlaneBounds(options) {
  if (!state.sourceManifold) {
    return null;
  }

  const localSource = transformFromFrame(state.sourceManifold, makeSideFrame(options, 1));
  for (const depth of [0, EPSILON, -EPSILON, EPSILON * 4, -EPSILON * 4]) {
    const section = localSource.slice(depth);
    if (!section.isEmpty()) {
      const bounds = section.bounds();
      return {
        min: [bounds.min[0], bounds.min[1]],
        max: [bounds.max[0], bounds.max[1]]
      };
    }
  }

  return null;
}

function addPlaneRectangle(center, width, depth, color, opacity) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const points = [
    new THREE.Vector3(center[0] - halfWidth, center[1] - halfDepth, 0.18),
    new THREE.Vector3(center[0] + halfWidth, center[1] - halfDepth, 0.18),
    new THREE.Vector3(center[0] + halfWidth, center[1] + halfDepth, 0.18),
    new THREE.Vector3(center[0] - halfWidth, center[1] + halfDepth, 0.18)
  ];
  planeVisuals.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    planeLineMaterial(color, opacity)
  ));
}

function addPlaneLine(points, color, opacity) {
  planeVisuals.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    planeLineMaterial(color, opacity)
  ));
}

function addPlaneCircle(center, radius, color, opacity, z = 0.28) {
  const points = [];
  const segments = 64;
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    points.push(new THREE.Vector3(
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
      z
    ));
  }

  planeVisuals.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    planeLineMaterial(color, opacity)
  ));
}

function planeLineMaterial(color, opacity) {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false
  });
}

function setDownload(manifolds) {
  if (state.downloadUrl) {
    URL.revokeObjectURL(state.downloadUrl);
  }

  const geometryList = manifolds.map(manifoldToGeometry);
  const blob = geometriesToBinaryStl(geometryList);
  state.downloadUrl = URL.createObjectURL(blob);
  els.downloadLink.href = state.downloadUrl;
  els.downloadLink.download = `${slugify(state.sourceName)}-d-brickified.stl`;
  els.downloadLink.classList.remove("is-disabled");
  els.downloadLink.setAttribute("aria-disabled", "false");
}

function clearResult() {
  state.resultManifold = null;
  state.resultManifolds = [];
  state.resultPartNames = [];
  state.selectedResultIndex = null;
  state.resultTriangles = 0;
  state.resultBounds = null;
  state.resultPartBounds = [];
  state.splitInfo = null;
  if (state.downloadUrl) {
    URL.revokeObjectURL(state.downloadUrl);
    state.downloadUrl = null;
  }
  els.downloadLink.href = "#";
  els.downloadLink.classList.add("is-disabled");
  els.downloadLink.setAttribute("aria-disabled", "true");
  updateResultPartControls();
  updateStats();
}

function updateControlsAndPlane(syncHandle = true) {
  if (syncHandle) {
    syncPlaneHandleFromInputs();
    clearResult();
  }
  els.planeZValue.textContent = `${Number(els.planeZ.value).toFixed(1)} mm`;
  updatePlaneHelper();
  updateStats();
}

function setPlaneMode(mode) {
  transformControls.setMode(mode);
  els.movePlaneButton.setAttribute("aria-pressed", String(mode === "translate"));
  els.rotatePlaneButton.setAttribute("aria-pressed", String(mode === "rotate"));
}

function syncPlaneHandleFromInputs() {
  const options = readOptions();
  planeHandle.position.copy(options.planeCenter);
  planeHandle.quaternion.setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(options.pitch),
    THREE.MathUtils.degToRad(options.roll),
    THREE.MathUtils.degToRad(options.gridAngle),
    "XYZ"
  ));
}

function syncInputsFromPlaneHandle() {
  const euler = new THREE.Euler().setFromQuaternion(planeHandle.quaternion, "XYZ");
  els.planeX.value = planeHandle.position.x.toFixed(1);
  els.planeY.value = planeHandle.position.y.toFixed(1);
  els.planeZ.value = clamp(planeHandle.position.z, Number(els.planeZ.min), Number(els.planeZ.max)).toFixed(1);
  els.planePitch.value = THREE.MathUtils.radToDeg(euler.x).toFixed(1);
  els.planeRoll.value = THREE.MathUtils.radToDeg(euler.y).toFixed(1);
  els.gridAngle.value = THREE.MathUtils.radToDeg(euler.z).toFixed(1);
  planeHandle.position.z = Number(els.planeZ.value);
}

function planeState() {
  const euler = new THREE.Euler().setFromQuaternion(planeHandle.quaternion, "XYZ");
  return {
    mode: transformControls.getMode(),
    position: [planeHandle.position.x, planeHandle.position.y, planeHandle.position.z],
    rotation: [
      THREE.MathUtils.radToDeg(euler.x),
      THREE.MathUtils.radToDeg(euler.y),
      THREE.MathUtils.radToDeg(euler.z)
    ],
    visible: planeHandle.visible,
    autoRotate: controls.autoRotate
  };
}

function updateStats() {
  if (state.planePreview) {
    const width = state.planePreview.bounds.max[0] - state.planePreview.bounds.min[0];
    const depth = state.planePreview.bounds.max[1] - state.planePreview.bounds.min[1];
    els.footprintStat.textContent = `Auto grid, ${formatMm(width)} x ${formatMm(depth)} mm; ${formatMm(studFeatureDepth())} mm deep`;
  } else {
    els.footprintStat.textContent = `Auto grid; ${formatMm(studFeatureDepth())} mm deep`;
  }
  els.sourceStat.textContent = state.sourceManifold ? `${state.sourceTriangles.toLocaleString()} triangles` : "-";
  els.resultStat.textContent = state.resultManifold ? resultStatText() : "Not yet cut.";
}

function resultStatText() {
  const split = state.splitInfo;
  if (!split) {
    return `${state.resultTriangles.toLocaleString()} triangles`;
  }
  return `${state.resultTriangles.toLocaleString()} triangles; kept ${split.kept.join(" + ") || "none"}`;
}

function setStatus(message) {
  els.statusText.textContent = message;
}

function resizeRenderer() {
  const width = Math.max(1, els.canvas.clientWidth);
  const height = Math.max(1, els.canvas.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function frameCurrentGeometry() {
  if (state.currentBox) {
    frameCameraBox(state.currentBox);
  }
}

function frameCamera(geometry) {
  frameCameraBox(new THREE.Box3().setFromBufferAttribute(geometry.attributes.position));
}

function frameCameraBox(box) {
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = Math.max(sphere.radius, 1);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.28;

  camera.near = Math.max(0.1, distance / 120);
  camera.far = distance * 120;
  camera.position.set(distance * 0.72, -distance * 0.82, distance * 0.62);
  camera.lookAt(sphere.center);
  camera.updateProjectionMatrix();

  controls.target.copy(sphere.center);
  controls.update();

  grid.scale.setScalar(Math.max(1, radius / 50));
}

function setDebugCamera(position, target) {
  if (!Array.isArray(position) || !Array.isArray(target) || position.length !== 3 || target.length !== 3) {
    return;
  }

  camera.position.fromArray(position);
  controls.target.fromArray(target);
  camera.lookAt(controls.target);
  controls.update();
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function geometriesToBinaryStl(geometries) {
  const triangleCount = geometries.reduce((total, geometry) => total + geometryTriangleCount(geometry), 0);
  const buffer = new ArrayBuffer(84 + triangleCount * 50);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const header = new TextEncoder().encode("3D Slop d-brickified STL");
  bytes.set(header.slice(0, 80), 0);
  view.setUint32(80, triangleCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const cb = new THREE.Vector3();
  let offset = 84;

  for (const geometry of geometries) {
    const position = geometry.attributes.position;
    const index = geometry.index?.array;
    const localTriangleCount = geometryTriangleCount(geometry);

    for (let tri = 0; tri < localTriangleCount; tri += 1) {
      const ia = index ? index[tri * 3] : tri * 3;
      const ib = index ? index[tri * 3 + 1] : tri * 3 + 1;
      const ic = index ? index[tri * 3 + 2] : tri * 3 + 2;
      a.fromBufferAttribute(position, ia);
      b.fromBufferAttribute(position, ib);
      c.fromBufferAttribute(position, ic);
      cb.subVectors(c, b);
      ab.subVectors(a, b);
      cb.cross(ab).normalize();

      for (const value of [cb.x, cb.y, cb.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]) {
        view.setFloat32(offset, value, true);
        offset += 4;
      }

      view.setUint16(offset, 0, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "model/stl" });
}

function geometryTriangleCount(geometry) {
  if (geometry.index) {
    return geometry.index.count / 3;
  }
  return geometry.attributes.position.count / 3;
}

function combine(parts) {
  if (parts.length === 0) {
    return Manifold.cube([0.01, 0.01, 0.01], true);
  }
  return parts.length === 1 ? parts[0] : Manifold.union(parts);
}

function sumTriangles(manifolds) {
  return manifolds.reduce((total, manifold) => total + manifold.numTri(), 0);
}

function combinedManifoldBounds(manifolds) {
  if (!manifolds.length) {
    return null;
  }

  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity]
  };

  for (const manifold of manifolds) {
    const box = manifold.boundingBox();
    for (let axis = 0; axis < 3; axis += 1) {
      bounds.min[axis] = Math.min(bounds.min[axis], box.min[axis]);
      bounds.max[axis] = Math.max(bounds.max[axis], box.max[axis]);
    }
  }

  return bounds;
}

function vectorToArray(vector) {
  return [vector.x, vector.y, vector.z];
}

function roundKey(value) {
  return Math.round(value * 100000) / 100000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function formatMm(value) {
  return value.toFixed(value >= 10 ? 1 : 2);
}

function cloneBounds(bounds) {
  if (!bounds) {
    return null;
  }
  return {
    min: [...bounds.min],
    max: [...bounds.max]
  };
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";
}
