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
  studWallThickness: 1.3,
  studRadiusCompensation: 0.15,
  studHeightClearance: 0.15,
  antiStudOuterRadius: 6.55,
  antiStudWall: 1,
  featureClearance: 1.25,
  minimumShellWall: 3.2,
  fallbackClampRibWidth: 2.8,
  fallbackClampRibBite: 0.45,
  // Fit reliefs for generated-on-generated mounts; nominal dimensions stay above.
  studOpeningClearance: 0.18,
  antiStudClampRelief: 0.12
};

const EPSILON = 0.08;
const STUD_FIT_CLEARANCE = 0.22;
const GUIDE_STORAGE_KEY = "everything-a-brick-guide-v1";
const GUIDE_STEPS = [
  {
    selector: "#stlFile",
    placement: "right",
    title: "Feed the mesh",
    body: "Load your own STL here. The demo sphere is nearby for days when file dialogs have already taken enough."
  },
  {
    selector: "#cutModeButton",
    placement: "right",
    mode: "cut",
    title: "Cut Mounts workflow",
    body: "Cut Mounts uses the green plane to split the mesh and carve underside clutch features into halves with enough depth."
  },
  {
    selector: "#movePlaneButton",
    fallbackSelector: "#cutModeButton",
    placement: "bottom",
    mode: "cut",
    title: "Place the cut plane",
    body: "Move Plane and Rotate Plane control where the operation happens. The preview outlines the sparse clutch footprint."
  },
  {
    selector: "#buildButton",
    placement: "right",
    mode: "cut",
    title: "Generate cut mounts",
    body: "This button runs the cut workflow. Shallow sides are rejected, because optimism is not wall thickness."
  },
  {
    selector: "#sourceButton",
    placement: "bottom",
    title: "Inspect the result",
    body: "Source and Brickified let you compare the original mesh with the generated result before exporting the situation."
  },
  {
    selector: "#studModeButton",
    placement: "right",
    title: "Stud Planes workflow",
    body: "Stud Planes keeps the STL whole and adds hollow, rounded studs to selected flat faces."
  },
  {
    selector: "#brickCanvas",
    placement: "left",
    mode: "studs",
    title: "Pick a face center",
    body: "In Stud Planes mode, click a flat face to place the stud-grid center. Click that same plane again to move it."
  },
  {
    selector: "#studPlaneControls",
    fallbackSelector: "#studModeButton",
    placement: "right",
    mode: "studs",
    title: "Manage selected planes",
    body: "Chosen planes appear here. Select one, delete it, or clear the list before committing the studs to plastic destiny."
  },
  {
    selector: "#buildButton",
    placement: "right",
    mode: "studs",
    title: "Add the studs",
    body: "In Stud Planes mode, the build button unions rounded tube studs onto the original mesh without cutting it apart."
  },
  {
    selector: "#downloadLink",
    placement: "right",
    title: "Export the STL",
    body: "When a result exists, download the generated STL here. The filename changes with the workflow, because even files deserve a clue."
  }
];

const els = {
  canvas: document.querySelector("#brickCanvas"),
  stlFile: document.querySelector("#stlFile"),
  demoButton: document.querySelector("#demoButton"),
  cutModeButton: document.querySelector("#cutModeButton"),
  studModeButton: document.querySelector("#studModeButton"),
  studPlaneControls: document.querySelector("#studPlaneControls"),
  studPlaneList: document.querySelector("#studPlaneList"),
  deleteStudPlaneButton: document.querySelector("#deleteStudPlaneButton"),
  clearStudPlanesButton: document.querySelector("#clearStudPlanesButton"),
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
  guideButton: document.querySelector("#guideButton"),
  guideSpotlight: document.querySelector("#guideSpotlight"),
  guidePanel: document.querySelector("#guidePanel"),
  guideStepCounter: document.querySelector("#guideStepCounter"),
  guideTitle: document.querySelector("#guideTitle"),
  guideBody: document.querySelector("#guideBody"),
  guideCloseButton: document.querySelector("#guideCloseButton"),
  guideBackButton: document.querySelector("#guideBackButton"),
  guideNextButton: document.querySelector("#guideNextButton"),
  guideDoneButton: document.querySelector("#guideDoneButton"),
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
const studPlaneVisuals = new THREE.Group();
planeHandle.add(planeVisuals);
scene.add(modelRoot);
scene.add(planeHandle);
scene.add(studPlaneVisuals);

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
  studInfo: null,
  operationMode: "cut",
  studTargets: [],
  selectedStudTargetIndex: null,
  planePreview: null,
  viewMode: "source",
  downloadUrl: null,
  currentGeometry: null,
  currentBox: null,
  pickableMeshes: [],
  sourcePickableMeshes: []
};

let guideStepIndex = 0;
let readyResolve;
window.__everythingABrickReady = new Promise((resolve) => {
  readyResolve = resolve;
});

window.__everythingABrick = {
  build: () => buildBrick(),
  loadDemo: () => loadDemo(),
  reset: () => resetWork(),
  deleteSelectedPart: () => deleteSelectedPart(),
  setMode: (mode) => setOperationMode(mode),
  addStudPlane: ({ origin, normal }) => addStudTargetFromPointNormal(origin, normal),
  setStudCenter: ({ index, origin }) => setStudTargetCenter(index, origin),
  clearStudPlanes: () => clearStudTargets(),
  showGuide: () => showGuide({ step: 0 }),
  hideGuide: () => hideGuide(),
  resetGuide: () => resetGuidePreference(),
  setCamera: ({ position, target }) => setDebugCamera(position, target),
  getState: () => ({
    sourceLoaded: Boolean(state.sourceManifold),
    resultLoaded: state.resultManifolds.length > 0,
    operationMode: state.operationMode,
    sourceTriangles: state.sourceTriangles,
    resultTriangles: state.resultTriangles,
    sourceBounds: cloneBounds(state.sourceBounds),
    resultBounds: cloneBounds(state.resultBounds),
    resultPartBounds: state.resultPartBounds.map(cloneBounds),
    resultPartNames: [...state.resultPartNames],
    selectedResultIndex: state.selectedResultIndex,
    splitInfo: state.splitInfo,
    studInfo: state.studInfo,
    studTargets: state.studTargets.map(serializeStudTarget),
    selectedStudTargetIndex: state.selectedStudTargetIndex,
    planePreview: state.planePreview,
    dimensions: {
      studRadius: D.studRadius,
      topStudRadius: topStudRadius(),
      topStudInnerRadius: topStudInnerRadius(),
      topStudEdgeRadius: topStudEdgeRadius(),
      studWallThickness: D.studWallThickness,
      studHeight: D.studHeight,
      studHeightClearance: D.studHeightClearance,
      studFeatureDepth: studFeatureDepth(),
      studOpeningRadius: studOpeningRadius(),
      antiStudRingOuterRadius: antiStudRingOuterRadius(),
      antiStudToolRadius: antiStudToolRadius(),
      minimumShellWall: exteriorSkinThickness(),
      fallbackClampRibWidth: fallbackClampRibWidth(),
      minimumMountDepth: minimumMountDepth()
    },
    plane: planeState(),
    camera: {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      damping: controls.enableDamping
    },
    viewMode: state.viewMode,
    guideVisible: !els.guidePanel.hidden,
    guideStep: guideStepIndex,
    guideSteps: GUIDE_STEPS.length,
    downloadReady: els.downloadLink.getAttribute("aria-disabled") !== "true"
  })
};

init();

function init() {
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  els.demoButton.addEventListener("click", () => loadDemo());
  els.stlFile.addEventListener("change", handleFileInput);
  els.cutModeButton.addEventListener("click", () => setOperationMode("cut"));
  els.studModeButton.addEventListener("click", () => setOperationMode("studs"));
  els.deleteStudPlaneButton.addEventListener("click", () => deleteSelectedStudTarget());
  els.clearStudPlanesButton.addEventListener("click", () => clearStudTargets());
  els.buildButton.addEventListener("click", () => buildBrick());
  els.movePlaneButton.addEventListener("click", () => setPlaneMode("translate"));
  els.rotatePlaneButton.addEventListener("click", () => setPlaneMode("rotate"));
  els.sourceButton.addEventListener("click", () => setViewMode("source"));
  els.resultButton.addEventListener("click", () => setViewMode("result"));
  els.deletePartButton.addEventListener("click", () => deleteSelectedPart());
  els.guideButton.addEventListener("click", () => showGuide({ step: 0 }));
  els.guideCloseButton.addEventListener("click", () => hideGuide());
  els.guideBackButton.addEventListener("click", () => previousGuideStep());
  els.guideNextButton.addEventListener("click", () => nextGuideStep());
  els.guideDoneButton.addEventListener("click", () => hideGuide());
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

  updateModeControls();
  loadDemo();
  showGuideOnFirstRun();
  window.addEventListener("resize", positionCurrentGuideStep);
  window.addEventListener("scroll", positionCurrentGuideStep, true);
  animate();
}

function loadDemo() {
  setStatus("Loading demo sphere. A round victim, at last.");
  const sphereRadius = 48;
  setSourceManifold(Manifold.sphere(sphereRadius, 64), "Demo Sphere");
  els.planeZ.value = sphereRadius.toFixed(1);
  updateControlsAndPlane();
  setViewMode("source");
  setStatus("Demo sphere loaded. The cut face is large; stud planes await flatter prey.");
  readyResolve?.(window.__everythingABrick.getState());
}

function showGuideOnFirstRun() {
  if (!guideWasSeen()) {
    showGuide({ step: 0 });
  }
}

function showGuide({ step = 0 } = {}) {
  guideStepIndex = clamp(Math.round(step), 0, GUIDE_STEPS.length - 1);
  els.guidePanel.hidden = false;
  els.guideSpotlight.hidden = false;
  els.guideButton.setAttribute("aria-pressed", "true");
  renderGuideStep();
}

function hideGuide() {
  els.guidePanel.hidden = true;
  els.guideSpotlight.hidden = true;
  els.guideButton.setAttribute("aria-pressed", "false");
  rememberGuideSeen();
}

function nextGuideStep() {
  if (guideStepIndex >= GUIDE_STEPS.length - 1) {
    hideGuide();
    return;
  }

  guideStepIndex += 1;
  renderGuideStep();
}

function previousGuideStep() {
  guideStepIndex = Math.max(0, guideStepIndex - 1);
  renderGuideStep();
}

function renderGuideStep() {
  const step = GUIDE_STEPS[guideStepIndex];
  prepareGuideStep(step);

  els.guideStepCounter.textContent = `Step ${guideStepIndex + 1} of ${GUIDE_STEPS.length}`;
  els.guideTitle.textContent = step.title;
  els.guideBody.textContent = step.body;
  els.guideBackButton.disabled = guideStepIndex === 0;
  els.guideNextButton.hidden = guideStepIndex === GUIDE_STEPS.length - 1;
  els.guideDoneButton.hidden = guideStepIndex !== GUIDE_STEPS.length - 1;

  const target = guideTargetForStep(step);
  if (!target) {
    return;
  }

  target.scrollIntoView({ block: "center", inline: "nearest" });
  window.requestAnimationFrame(() => positionGuideForTarget(target, step.placement));
}

function prepareGuideStep(step) {
  if (step.mode && state.operationMode !== step.mode && state.resultManifolds.length === 0) {
    setOperationMode(step.mode);
  }
}

function positionCurrentGuideStep() {
  if (els.guidePanel.hidden) {
    return;
  }

  const step = GUIDE_STEPS[guideStepIndex];
  const target = guideTargetForStep(step);
  if (target) {
    positionGuideForTarget(target, step.placement);
  }
}

function guideTargetForStep(step) {
  return visibleElement(step.selector) ??
    visibleElement(step.fallbackSelector) ??
    els.canvas;
}

function visibleElement(selector) {
  if (!selector) {
    return null;
  }

  const element = document.querySelector(selector);
  if (!element || element.hidden) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return element;
}

function positionGuideForTarget(target, preferredPlacement = "right") {
  const targetRect = target.getBoundingClientRect();
  const panel = els.guidePanel;
  const margin = 12;
  const gap = 18;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  let placement = preferredPlacement;
  let left = 0;
  let top = 0;

  if (placement === "right") {
    left = targetRect.right + gap;
    top = targetCenterY - panelHeight / 2;
    if (left + panelWidth > viewportWidth - margin) {
      placement = "left";
    }
  }

  if (placement === "left") {
    left = targetRect.left - panelWidth - gap;
    top = targetCenterY - panelHeight / 2;
    if (left < margin) {
      placement = targetRect.bottom + gap + panelHeight < viewportHeight ? "bottom" : "top";
    }
  }

  if (placement === "bottom") {
    left = targetCenterX - panelWidth / 2;
    top = targetRect.bottom + gap;
    if (top + panelHeight > viewportHeight - margin) {
      placement = "top";
    }
  }

  if (placement === "top") {
    left = targetCenterX - panelWidth / 2;
    top = targetRect.top - panelHeight - gap;
    if (top < margin) {
      placement = "bottom";
      top = targetRect.bottom + gap;
    }
  }

  if (placement === "bottom") {
    left = targetCenterX - panelWidth / 2;
    top = targetRect.bottom + gap;
  }

  left = clamp(left, margin, viewportWidth - panelWidth - margin);
  top = clamp(top, margin, viewportHeight - panelHeight - margin);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.dataset.placement = placement;

  if (placement === "left" || placement === "right") {
    panel.style.setProperty("--guide-arrow-offset", `${clamp(targetCenterY - top - 8, 20, panelHeight - 28)}px`);
  } else {
    panel.style.setProperty("--guide-arrow-offset", `${clamp(targetCenterX - left - 8, 20, panelWidth - 28)}px`);
  }

  const pad = 7;
  els.guideSpotlight.style.left = `${Math.max(margin, targetRect.left - pad)}px`;
  els.guideSpotlight.style.top = `${Math.max(margin, targetRect.top - pad)}px`;
  els.guideSpotlight.style.width = `${Math.min(viewportWidth - margin * 2, targetRect.width + pad * 2)}px`;
  els.guideSpotlight.style.height = `${Math.min(viewportHeight - margin * 2, targetRect.height + pad * 2)}px`;
}

function guideWasSeen() {
  try {
    return window.localStorage.getItem(GUIDE_STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

function rememberGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, "seen");
  } catch {
    // The guide still works without storage. Browsers do enjoy withholding tiny favors.
  }
}

function resetGuidePreference() {
  try {
    window.localStorage.removeItem(GUIDE_STORAGE_KEY);
  } catch {
    // Nothing to reset if storage is unavailable.
  }
  showGuide({ step: 0 });
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
  clearStudTargets({ silent: true });
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

function setOperationMode(mode) {
  const nextMode = mode === "studs" || mode === "stud-planes" ? "studs" : "cut";
  if (state.operationMode === nextMode) {
    return;
  }

  clearResult();
  state.operationMode = nextMode;
  state.viewMode = "source";
  updateModeControls();
  setViewMode("source");
  updatePlaneHelper();
  setStatus(nextMode === "studs" ?
    "Stud plane mode. Click a flat face to place the grid center; click that plane again to move it." :
    "Cut mount mode. One plane, two possible halves, familiar little crisis.");
}

function updateModeControls() {
  els.cutModeButton.setAttribute("aria-pressed", String(state.operationMode === "cut"));
  els.studModeButton.setAttribute("aria-pressed", String(state.operationMode === "studs"));
  els.studPlaneControls.hidden = state.operationMode !== "studs";
  els.buildButton.textContent = state.operationMode === "studs" ? "Add Stud Pattern" : "Cut D-Brick Mounts";
  setPlaneToolVisible(state.viewMode === "source" && state.resultManifolds.length === 0);
  updateStudPlaneList();
}

function clearStudTargets({ silent = false } = {}) {
  const shouldReturnToSource = !silent && state.sourceManifold && state.viewMode === "result";
  state.studTargets = [];
  state.selectedStudTargetIndex = null;
  clearResult();
  updateStudPlaneList();
  if (shouldReturnToSource) {
    setViewMode("source");
  } else {
    updatePlaneHelper();
  }
  if (!silent && state.operationMode === "studs") {
    setStatus("Stud planes cleared. The mesh has been briefly spared.");
  }
}

function selectStudTarget(index) {
  if (index < 0 || index >= state.studTargets.length) {
    state.selectedStudTargetIndex = null;
  } else {
    state.selectedStudTargetIndex = index;
  }

  updateStudPlaneList();
  updatePlaneHelper();
}

function deleteSelectedStudTarget() {
  if (state.selectedStudTargetIndex === null) {
    return;
  }

  const removed = state.selectedStudTargetIndex + 1;
  state.studTargets.splice(state.selectedStudTargetIndex, 1);
  state.selectedStudTargetIndex = state.studTargets.length ?
    Math.min(state.selectedStudTargetIndex, state.studTargets.length - 1) :
    null;
  clearResult();
  updateStudPlaneList();
  if (state.sourceManifold && state.viewMode === "result") {
    setViewMode("source");
  } else {
    updatePlaneHelper();
  }
  setStatus(`Deleted stud plane ${removed}. Its tiny ambition has been archived.`);
}

function updateStudPlaneList() {
  els.studPlaneList.textContent = "";

  state.studTargets.forEach((target, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-pressed", String(index === state.selectedStudTargetIndex));
    button.innerHTML = `
      <span class="target-name"></span>
      <span class="target-meta"></span>
    `;
    button.querySelector(".target-name").textContent = `Plane ${index + 1}`;
    button.querySelector(".target-meta").textContent = studTargetListText(target);
    button.addEventListener("click", () => selectStudTarget(index));
    els.studPlaneList.append(button);
  });

  els.deleteStudPlaneButton.disabled = state.selectedStudTargetIndex === null;
  els.clearStudPlanesButton.disabled = state.studTargets.length === 0;
}

function studTargetListText(target) {
  const preview = target.preview;
  if (!preview) {
    return "Awaiting geometry.";
  }

  const point = target.origin.map((value) => formatMm(value)).join(", ");
  return `${preview.studCenters.length} studs centered at ${point} mm`;
}

function buildBrick() {
  if (state.operationMode === "studs") {
    buildStudPlanes();
    return;
  }

  buildCutMounts();
}

function buildCutMounts() {
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

function buildStudPlanes() {
  if (!state.sourceManifold) {
    setStatus("No source mesh. Even this app has standards.");
    return;
  }

  if (!state.studTargets.length) {
    setStatus("Pick at least one flat stud plane first. The mesh cannot read intent, mercifully.");
    return;
  }

  setStatus("Adding raised studs to selected planes. No cut line, no dramatic separation.");

  try {
    const patternParts = [];
    const targetStats = [];

    state.studTargets.forEach((target, index) => {
      const pattern = makeStudPatternForTarget(target);
      if (!pattern) {
        targetStats.push({
          index,
          skipped: true,
          reason: "No studs fit on the selected face.",
          origin: [...target.origin],
          normal: [...target.normal],
          studCenters: []
        });
        return;
      }

      patternParts.push(pattern.manifold);
      targetStats.push({
        index,
        skipped: false,
        origin: [...target.origin],
        normal: [...target.normal],
        u: [...target.u],
        v: [...target.v],
        bounds: cloneBounds2(pattern.stats.bounds),
        studCenters: pattern.stats.studCenters.map((center) => [...center]),
        studs: pattern.stats.studCenters.length
      });
    });

    if (!patternParts.length) {
      clearResult();
      state.studInfo = {
        targets: targetStats,
        totalStuds: 0
      };
      updateStats();
      setStatus("No selected plane could fit a stud. This is technically a result, but emotionally not.");
      return;
    }

    const result = combine([state.sourceManifold, ...patternParts]);
    state.resultManifolds = [result];
    state.resultPartNames = ["studded"];
    state.selectedResultIndex = null;
    state.resultManifold = result;
    state.resultTriangles = result.numTri();
    state.resultBounds = result.boundingBox();
    state.resultPartBounds = [state.resultBounds];
    state.splitInfo = null;
    state.studInfo = {
      targets: targetStats,
      totalStuds: targetStats.reduce((sum, target) => sum + (target.studs ?? 0), 0)
    };
    state.viewMode = "result";
    setDownload([result]);
    updateStats();
    updateResultPartControls();
    setViewMode("result");
    setPlaneToolVisible(false);
    setStatus(studResultMessage());
  } catch (error) {
    setStatus(`Geometry kernel objected to the studs: ${error.message ?? error}`);
  }
}

function resultMessage(kept, discarded) {
  const keptText = kept.length === 2 ? "both halves" : `${kept[0]} half`;
  const discardText = discarded.length ? ` Discarded ${discarded.join(" and ")} for being too shallow.` : "";
  return `Generated cut-only mounts on ${keptText}; exploded on the cutting plane for inspection; ${state.resultTriangles.toLocaleString()} triangles survived.${discardText}`;
}

function studResultMessage() {
  const count = state.studInfo?.totalStuds ?? 0;
  const planeCount = state.studInfo?.targets.filter((target) => !target.skipped).length ?? 0;
  return `Generated ${count} raised studs across ${planeCount} selected plane${planeCount === 1 ? "" : "s"}; source stayed whole; ${state.resultTriangles.toLocaleString()} triangles now explain themselves.`;
}

function resetWork() {
  if (!state.sourceManifold) {
    return;
  }

  clearResult();
  setViewMode("source");
  setPlaneToolVisible(true);
  updatePlaneHelper();
  setStatus(state.operationMode === "studs" ?
    "Reset to the source mesh. Stud plane picks are still standing there, trying to look useful." :
    "Reset to the source mesh. The previous cut has been escorted out.");
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

  if (state.operationMode === "studs" && state.viewMode === "source") {
    pickStudPlane(event);
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

function pickStudPlane(event) {
  if (!state.sourceManifold || !state.sourcePickableMeshes.length) {
    return;
  }

  const rect = els.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObjects(state.sourcePickableMeshes, false)[0];
  if (!hit?.face) {
    setStatus("No face selected. The click landed in philosophical space.");
    return;
  }

  addStudTargetFromIntersection(hit);
}

function addStudTargetFromIntersection(hit) {
  const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  const origin = hit.point.clone();
  return addStudTarget(origin, normal);
}

function addStudTargetFromPointNormal(origin, normal) {
  if (!Array.isArray(origin) || !Array.isArray(normal) || origin.length !== 3 || normal.length !== 3) {
    return false;
  }

  return addStudTarget(
    new THREE.Vector3(origin[0], origin[1], origin[2]),
    new THREE.Vector3(normal[0], normal[1], normal[2])
  );
}

function setStudTargetCenter(index, origin) {
  if (!Array.isArray(origin) || origin.length !== 3) {
    return false;
  }

  return moveStudTargetCenter(index, new THREE.Vector3(origin[0], origin[1], origin[2]));
}

function addStudTarget(origin, normal) {
  if (!state.sourceManifold) {
    return false;
  }

  const target = createStudTarget(origin, normal);
  const existingIndex = matchingStudTargetIndex(target);
  if (existingIndex !== -1) {
    return moveStudTargetCenter(existingIndex, origin);
  }

  const preview = studTargetPreview(target);
  if (!preview || !preview.studCenters.length) {
    setStatus("That flat patch cannot fit a stud pattern. It has chosen minimalism.");
    updateStudPlaneList();
    updatePlaneHelper();
    return false;
  }

  clearResult();
  target.preview = preview;
  state.studTargets.push(target);
  state.selectedStudTargetIndex = state.studTargets.length - 1;
  updateStudPlaneList();
  updatePlaneHelper();
  setStatus(`Added stud plane ${state.studTargets.length} with ${preview.studCenters.length} studs centered on the selected point.`);
  return true;
}

function moveStudTargetCenter(index, origin) {
  if (!Number.isInteger(index) || index < 0 || index >= state.studTargets.length) {
    return false;
  }

  const target = state.studTargets[index];
  const candidate = {
    ...target,
    origin: [origin.x, origin.y, origin.z],
    preview: null
  };
  const preview = studTargetPreview(candidate);
  if (!preview || !preview.studCenters.length) {
    setStatus("That center leaves no room for studs. The old center is keeping its desk.");
    return false;
  }

  clearResult();
  candidate.preview = preview;
  state.studTargets[index] = candidate;
  state.selectedStudTargetIndex = index;
  updateStudPlaneList();
  updatePlaneHelper();
  setStatus(`Moved stud center for plane ${index + 1}; ${preview.studCenters.length} studs still fit.`);
  return true;
}

function matchingStudTargetIndex(target) {
  const normal = new THREE.Vector3(...target.normal);
  const origin = new THREE.Vector3(...target.origin);
  const planeOffset = normal.dot(origin);

  return state.studTargets.findIndex((existing) => {
    const existingNormal = new THREE.Vector3(...existing.normal);
    const existingOrigin = new THREE.Vector3(...existing.origin);
    return normal.dot(existingNormal) > 0.995 &&
      Math.abs(planeOffset - existingNormal.dot(existingOrigin)) < 0.35;
  });
}

function createStudTarget(origin, normal) {
  const outward = outwardNormal(origin, normal);
  const { u, v } = basisFromNormal(outward);
  return {
    origin: [origin.x, origin.y, origin.z],
    normal: [outward.x, outward.y, outward.z],
    u: [u.x, u.y, u.z],
    v: [v.x, v.y, v.z],
    preview: null
  };
}

function outwardNormal(origin, normal) {
  const sourceCenter = boundsCenter3(state.sourceBounds);
  const outward = normal.clone().normalize();
  if (sourceCenter && outward.dot(origin.clone().sub(sourceCenter)) < 0) {
    outward.multiplyScalar(-1);
  }
  return outward;
}

function basisFromNormal(normal) {
  const w = normal.clone().normalize();
  const preferred = Math.abs(w.z) > 0.84 ?
    new THREE.Vector3(1, 0, 0) :
    new THREE.Vector3(0, 0, 1);
  let u = preferred.sub(w.clone().multiplyScalar(preferred.dot(w)));
  if (u.lengthSq() < 1e-8) {
    u = new THREE.Vector3(0, 1, 0).sub(w.clone().multiplyScalar(w.y));
  }
  u.normalize();
  const v = new THREE.Vector3().crossVectors(w, u).normalize();
  return { u, v };
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

function makeStudPatternForTarget(target) {
  const preview = studTargetPreview(target);
  target.preview = preview;
  if (!preview?.studCenters.length) {
    return null;
  }

  const localStuds = combine(preview.studCenters.map((center) => topStud(center)));
  return {
    manifold: transformToFrame(localStuds, frameFromStudTarget(target)),
    stats: preview
  };
}

function studTargetPreview(target) {
  if (!state.sourceManifold) {
    return null;
  }

  const frame = frameFromStudTarget(target);
  const localSource = transformFromFrame(state.sourceManifold, frame);
  const face = studPatternFace(localSource);
  if (!face) {
    return null;
  }

  const studCenters = gridCentersForBounds(
    face.bounds,
    0,
    0,
    topStudRadius() + STUD_FIT_CLEARANCE
  ).filter((center) => circleFitsMountFace(center, topStudRadius() + STUD_FIT_CLEARANCE, face));

  return {
    bounds: face.bounds,
    studCenters,
    center: [0, 0],
    patternDepth: D.studHeight,
    faceArea: face.section?.area() ?? null
  };
}

function studPatternFace(localSource) {
  for (const depth of [-EPSILON, -EPSILON * 4, -EPSILON * 8, EPSILON]) {
    const section = localSource.slice(depth);
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
  }

  return null;
}

function topStud(center) {
  return CrossSection.ofPolygons([roundedTopStudProfile()])
    .revolve(72)
    .translate([center[0], center[1], -EPSILON]);
}

function topStudRadius() {
  return Math.max(D.studWallThickness + 0.2, D.studRadius + D.studRadiusCompensation);
}

function topStudInnerRadius() {
  return Math.max(0.35, topStudRadius() - D.studWallThickness);
}

function topStudEdgeRadius() {
  const wall = topStudRadius() - topStudInnerRadius();
  return Math.min(0.55, wall * 0.32, D.studHeight * 0.28);
}

function roundedTopStudProfile() {
  const outerRadius = topStudRadius();
  const innerRadius = topStudInnerRadius();
  const edgeRadius = topStudEdgeRadius();
  const height = D.studHeight + EPSILON;
  const arcSteps = 8;
  const points = [
    [innerRadius, 0],
    [outerRadius, 0],
    [outerRadius, height - edgeRadius]
  ];

  for (let step = 1; step <= arcSteps; step += 1) {
    const angle = (Math.PI / 2) * (step / arcSteps);
    points.push([
      outerRadius - edgeRadius + Math.cos(angle) * edgeRadius,
      height - edgeRadius + Math.sin(angle) * edgeRadius
    ]);
  }

  points.push([innerRadius + edgeRadius, height]);

  for (let step = 1; step <= arcSteps; step += 1) {
    const angle = Math.PI / 2 + (Math.PI / 2) * (step / arcSteps);
    points.push([
      innerRadius + edgeRadius + Math.cos(angle) * edgeRadius,
      height - edgeRadius + Math.sin(angle) * edgeRadius
    ]);
  }

  return points;
}

function frameFromStudTarget(target) {
  return {
    origin: new THREE.Vector3(...target.origin),
    u: new THREE.Vector3(...target.u).normalize(),
    v: new THREE.Vector3(...target.v).normalize(),
    w: new THREE.Vector3(...target.normal).normalize()
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
  const antiStudCenters = sparseClampCenters(
    gridCentersForBounds(bounds, D.unit / 2, D.unit / 2)
      .filter((center) => circleFitsMountFace(center, antiStudToolRadius(), face)),
    bounds
  );
  const studCenters = gridCentersForBounds(
    bounds,
    0,
    0,
    studOpeningRadius()
  );
  const partialAntiStudCenters = findPartialAntiStudCenters(antiStudCenters, face);
  const fallbackClampRibBoxes = antiStudCenters.length ? [] : fallbackClampRibs(bounds, studCenters);
  const fallbackClampRibKeepers = fallbackClampRibBoxes.map((box) => ribKeeper(box, depth + EPSILON));
  const clampPattern = antiStudCenters.length ?
    "sparse-center-cross" :
    fallbackClampRibKeepers.length ? "sparse-wall-ribs" : "none";
  const cutterParts = [];

  const cavityCutter = interiorCavityCutter(localPart, depth);
  if (cavityCutter) {
    let hollowingCutter = cavityCutter;
    if (antiStudCenters.length) {
      hollowingCutter = hollowingCutter.subtract(
        combine(antiStudCenters.map((center) => antiStudRing(depth + EPSILON, [center[0], center[1], -EPSILON])))
      );
    }
    if (fallbackClampRibKeepers.length) {
      hollowingCutter = hollowingCutter.subtract(combine(fallbackClampRibKeepers));
    }

    if (!hollowingCutter.isEmpty()) {
      cutterParts.push(hollowingCutter);
    }
  }

  if (studCenters.length) {
    cutterParts.push(combine(studCenters.map((center) => studOpening(depth, center))));
  }

  return {
    cutter: cutterParts.length ? combine(cutterParts) : null,
    features: {
      clampPattern,
      antiStuds: antiStudCenters.length,
      fallbackClampRibs: fallbackClampRibKeepers.length,
      partialAntiStuds: partialAntiStudCenters.length,
      edgeWallRestores: 0,
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

function circleFitsMountFace(center, radius, face) {
  if (!face.section || face.section.isEmpty()) {
    return circleFitsBounds(center, radius, face.bounds);
  }

  const toolCircle = CrossSection.circle(radius, 72);
  const fullArea = toolCircle.area();
  const overlapArea = face.section.intersect(toolCircle.translate(center)).area();
  return overlapArea >= fullArea - 0.35;
}

function sparseClampCenters(centers, bounds) {
  if (centers.length <= 3) {
    return centers;
  }

  const xs = uniqueSortedGridValues(centers.map(([x]) => x));
  const ys = uniqueSortedGridValues(centers.map(([, y]) => y));
  if (xs.length <= 1 || ys.length <= 1) {
    return centers;
  }

  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerY = (bounds.min[1] + bounds.max[1]) / 2;
  const crossX = closestGridValue(xs, centerX);
  const crossY = closestGridValue(ys, centerY);

  return centers.filter(([x, y]) =>
    sameGridValue(x, crossX) ||
    sameGridValue(y, crossY)
  );
}

function uniqueSortedGridValues(values) {
  return [...new Set(values.map((value) => value.toFixed(5)))]
    .map(Number)
    .sort((a, b) => a - b);
}

function closestGridValue(values, target) {
  return values.reduce((closest, value) => {
    const closestDistance = Math.abs(closest - target);
    const distance = Math.abs(value - target);
    return distance < closestDistance ? value : closest;
  }, values[0]);
}

function sameGridValue(a, b) {
  return Math.abs(a - b) < 1e-5;
}

function fallbackClampRibs(bounds, studCenters) {
  return fallbackClampStudTargets(studCenters, bounds)
    .flatMap((center) => wallGrownClampRibBoxes(center, bounds));
}

function fallbackClampStudTargets(studCenters, bounds) {
  const center = boundsCenter(bounds);
  const inside = studCenters.filter((studCenter) => pointInsideBounds(studCenter, bounds));
  const candidates = inside.length ?
    inside :
    studCenters.filter((studCenter) => circleOverlapsBounds(studCenter, studOpeningRadius(), bounds));

  return [...candidates]
    .sort((a, b) =>
      distance2d(a, center) - distance2d(b, center)
    )
    .slice(0, 4);
}

function wallGrownClampRibBoxes([x, y], bounds) {
  const width = fallbackClampRibWidth();
  const bite = D.fallbackClampRibBite;
  const radius = studOpeningRadius();
  const boxes = [];
  const minLength = 0.8;

  pushRibBox(
    boxes,
    x + radius - bite,
    bounds.max[0] + EPSILON,
    y - width / 2,
    y + width / 2,
    bounds,
    minLength
  );
  pushRibBox(
    boxes,
    bounds.min[0] - EPSILON,
    x - radius + bite,
    y - width / 2,
    y + width / 2,
    bounds,
    minLength
  );
  pushRibBox(
    boxes,
    x - width / 2,
    x + width / 2,
    y + radius - bite,
    bounds.max[1] + EPSILON,
    bounds,
    minLength
  );
  pushRibBox(
    boxes,
    x - width / 2,
    x + width / 2,
    bounds.min[1] - EPSILON,
    y - radius + bite,
    bounds,
    minLength
  );

  return boxes;
}

function pushRibBox(boxes, minX, maxX, minY, maxY, bounds, minLength) {
  const clamped = {
    minX: Math.max(bounds.min[0] - EPSILON, Math.min(minX, maxX)),
    maxX: Math.min(bounds.max[0] + EPSILON, Math.max(minX, maxX)),
    minY: Math.max(bounds.min[1] - EPSILON, Math.min(minY, maxY)),
    maxY: Math.min(bounds.max[1] + EPSILON, Math.max(minY, maxY))
  };
  if (clamped.maxX - clamped.minX >= minLength && clamped.maxY - clamped.minY >= minLength) {
    boxes.push(clamped);
  }
}

function ribKeeper(box, depth) {
  return Manifold.cube([
    box.maxX - box.minX,
    box.maxY - box.minY,
    depth + EPSILON
  ]).translate([box.minX, box.minY, -EPSILON]);
}

function fallbackClampRibWidth() {
  return Math.max(2.4, D.fallbackClampRibWidth);
}

function boundsCenter(bounds) {
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2
  ];
}

function boundsCenter3(bounds) {
  if (!bounds) {
    return null;
  }

  return new THREE.Vector3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2
  );
}

function pointInsideBounds([x, y], bounds) {
  return x >= bounds.min[0] &&
    x <= bounds.max[0] &&
    y >= bounds.min[1] &&
    y <= bounds.max[1];
}

function circleOverlapsBounds([x, y], radius, bounds) {
  const nearestX = Math.max(bounds.min[0], Math.min(bounds.max[0], x));
  const nearestY = Math.max(bounds.min[1], Math.min(bounds.max[1], y));
  return Math.hypot(x - nearestX, y - nearestY) <= radius;
}

function distance2d(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function interiorCavityCutter(localPart, depth) {
  const depthPart = clipToFeatureDepth(localPart, depth);
  if (depthPart.isEmpty()) {
    return null;
  }

  const exteriorKeepOut = exteriorSurfaceKeepOut(localPart, depth);
  if (!exteriorKeepOut || exteriorKeepOut.isEmpty()) {
    return depthPart;
  }

  const cavity = depthPart.subtract(exteriorKeepOut);
  return cavity.isEmpty() ? null : cavity;
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
  return Math.max(D.minimumShellWall, D.antiStudWall + 2.2);
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

  updateModeControls();
}

function setPlaneToolVisible(visible) {
  const showCutPlane = visible && state.operationMode === "cut";
  planeHandle.visible = showCutPlane;
  transformHelper.visible = showCutPlane;
  transformControls.enabled = showCutPlane;
  if (!showCutPlane) {
    controls.enabled = true;
  }
  els.movePlaneButton.hidden = !showCutPlane;
  els.rotatePlaneButton.hidden = !showCutPlane;
}

function renderManifolds(manifolds, color, { frame = true } = {}) {
  modelRoot.clear();
  state.pickableMeshes = [];
  state.sourcePickableMeshes = [];
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
    } else {
      mesh.userData.sourceIndex = index;
      state.sourcePickableMeshes.push(mesh);
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
  studPlaneVisuals.clear();
  state.planePreview = null;

  if (!state.sourceManifold) {
    return;
  }

  if (state.operationMode === "studs") {
    updateStudPlaneHelper();
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
  const antiStudCenters = sparseClampCenters(
    gridCentersForBounds(bounds, antiStudOffsets[0], antiStudOffsets[1])
      .filter((center) => circleFitsBounds(center, antiStudToolRadius(), bounds)),
    bounds
  );
  const studCenters = gridCentersForBounds(bounds, studOffsets[0], studOffsets[1], studOpeningRadius());
  const fallbackClampRibCount = antiStudCenters.length ? 0 : fallbackClampRibs(bounds, studCenters).length;
  const clampPattern = antiStudCenters.length ?
    "sparse-center-cross" :
    fallbackClampRibCount ? "sparse-wall-ribs" : "none";

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
    clampPattern,
    antiStudRings: antiStudCenters.length,
    fallbackClampRibs: fallbackClampRibCount,
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

function updateStudPlaneHelper() {
  if (state.viewMode !== "source") {
    return;
  }

  state.studTargets.forEach((target, index) => {
    const preview = studTargetPreview(target);
    target.preview = preview;
    if (!preview) {
      return;
    }

    const selected = index === state.selectedStudTargetIndex;
    const frame = frameFromStudTarget(target);
    const group = localFrameGroup(frame);
    const color = selected ? 0xb7ff3c : 0xdc4d7a;
    const bounds = preview.bounds;
    const width = Math.max(D.unit, bounds.max[0] - bounds.min[0]);
    const depth = Math.max(D.unit, bounds.max[1] - bounds.min[1]);
    const center = boundsCenter(bounds);
    const patternCenter = [0, 0];

    addLocalRectangle(group, center, width, depth, color, selected ? 0.88 : 0.62);
    addLocalLine(group, [
      new THREE.Vector3(patternCenter[0] - D.unit * 0.38, patternCenter[1], D.studHeight + 0.38),
      new THREE.Vector3(patternCenter[0] + D.unit * 0.38, patternCenter[1], D.studHeight + 0.38)
    ], color, 0.78);
    addLocalLine(group, [
      new THREE.Vector3(patternCenter[0], patternCenter[1] - D.unit * 0.38, D.studHeight + 0.42),
      new THREE.Vector3(patternCenter[0], patternCenter[1] + D.unit * 0.38, D.studHeight + 0.42)
    ], color, 0.78);

    for (const studCenter of preview.studCenters) {
      addLocalCircle(group, studCenter, topStudRadius(), color, selected ? 0.82 : 0.56, D.studHeight + 0.32);
      addLocalCircle(group, studCenter, topStudInnerRadius(), color, selected ? 0.48 : 0.34, D.studHeight + 0.34);
    }

    studPlaneVisuals.add(group);
  });
}

function localFrameGroup(frame) {
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  group.matrix.makeBasis(frame.u, frame.v, frame.w);
  group.matrix.setPosition(frame.origin);
  return group;
}

function addLocalRectangle(group, center, width, depth, color, opacity) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const points = [
    new THREE.Vector3(center[0] - halfWidth, center[1] - halfDepth, 0.18),
    new THREE.Vector3(center[0] + halfWidth, center[1] - halfDepth, 0.18),
    new THREE.Vector3(center[0] + halfWidth, center[1] + halfDepth, 0.18),
    new THREE.Vector3(center[0] - halfWidth, center[1] + halfDepth, 0.18)
  ];
  group.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    planeLineMaterial(color, opacity)
  ));
}

function addLocalLine(group, points, color, opacity) {
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    planeLineMaterial(color, opacity)
  ));
}

function addLocalCircle(group, center, radius, color, opacity, z = 0.28) {
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

  group.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    planeLineMaterial(color, opacity)
  ));
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
  const suffix = state.operationMode === "studs" ? "studded" : "d-brickified";
  els.downloadLink.download = `${slugify(state.sourceName)}-${suffix}.stl`;
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
  state.studInfo = null;
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
  if (state.operationMode === "studs") {
    const selected = state.selectedStudTargetIndex === null ? null : state.studTargets[state.selectedStudTargetIndex];
    const preview = selected?.preview;
    const studCount = state.studTargets.reduce((sum, target) => sum + (target.preview?.studCenters.length ?? 0), 0);
    if (preview) {
      const width = preview.bounds.max[0] - preview.bounds.min[0];
      const depth = preview.bounds.max[1] - preview.bounds.min[1];
      els.footprintStat.textContent = `${state.studTargets.length} planes, ${studCount} studs; selected ${formatMm(width)} x ${formatMm(depth)} mm`;
    } else {
      els.footprintStat.textContent = `${state.studTargets.length} planes, ${studCount} studs`;
    }
  } else if (state.planePreview) {
    const width = state.planePreview.bounds.max[0] - state.planePreview.bounds.min[0];
    const depth = state.planePreview.bounds.max[1] - state.planePreview.bounds.min[1];
    els.footprintStat.textContent = `Sparse grid, ${formatMm(width)} x ${formatMm(depth)} mm; ${formatMm(studFeatureDepth())} mm deep`;
  } else {
    els.footprintStat.textContent = `Sparse grid; ${formatMm(studFeatureDepth())} mm deep`;
  }
  els.sourceStat.textContent = state.sourceManifold ? `${state.sourceTriangles.toLocaleString()} triangles` : "-";
  els.resultStat.textContent = state.resultManifold ? resultStatText() :
    (state.operationMode === "studs" ? "Not yet studded." : "Not yet cut.");
}

function resultStatText() {
  if (state.studInfo) {
    return `${state.resultTriangles.toLocaleString()} triangles; ${state.studInfo.totalStuds} raised studs`;
  }

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

function cloneBounds2(bounds) {
  if (!bounds) {
    return null;
  }
  return {
    min: [...bounds.min],
    max: [...bounds.max]
  };
}

function serializeStudTarget(target) {
  return {
    origin: [...target.origin],
    normal: [...target.normal],
    u: [...target.u],
    v: [...target.v],
    preview: target.preview ? {
      bounds: cloneBounds2(target.preview.bounds),
      studCenters: target.preview.studCenters.map((center) => [...center]),
      patternDepth: target.preview.patternDepth,
      center: [...target.preview.center]
    } : null
  };
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";
}
