import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

const catalogUrl = new URL("./catalog.json", window.location.href);
const canvas = document.querySelector("#viewerCanvas");
const statusEl = document.querySelector("#viewerStatus");
const collectionListEl = document.querySelector("#collectionList");
const activeCollectionEl = document.querySelector("#activeCollection");
const activeTitleEl = document.querySelector("#activeTitle");
const activeSubtitleEl = document.querySelector("#activeSubtitle");
const activeSourceEl = document.querySelector("#activeSource");
const activeDimensionsEl = document.querySelector("#activeDimensions");
const activeTrianglesEl = document.querySelector("#activeTriangles");
const downloadLinkEl = document.querySelector("#downloadLink");
const spinButton = document.querySelector("#spinButton");
const wireButton = document.querySelector("#wireButton");
const resetButton = document.querySelector("#resetButton");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151515);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;

const loader = new STLLoader();
const modelRoot = new THREE.Group();
scene.add(modelRoot);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 6, 7);
scene.add(keyLight);
scene.add(new THREE.HemisphereLight(0xf4f1e8, 0x252525, 1.45));

const floorGrid = new THREE.GridHelper(160, 16, 0xb7ff3c, 0x424242);
floorGrid.position.y = -0.02;
scene.add(floorGrid);

let activeItem = null;
let activeButton = null;
let activeEdges = null;
let activeMesh = null;
let readyResolved = false;
let viewerReadyResolve;

window.__slopViewerReady = new Promise((resolve) => {
  viewerReadyResolve = resolve;
});
window.__slopViewer = {
  getState: () => ({
    active: activeItem?.preset?.id ?? null,
    loaded: Boolean(activeMesh),
    triangles: activeMesh ? triangleCount(activeMesh.geometry) : 0
  })
};

init();

async function init() {
  resizeRenderer();
  window.addEventListener("resize", resizeRenderer);
  spinButton.addEventListener("click", toggleSpin);
  wireButton.addEventListener("click", toggleEdges);
  resetButton.addEventListener("click", resetCamera);

  try {
    const response = await fetch(catalogUrl);
    if (!response.ok) {
      throw new Error(`Catalog wandered off with HTTP ${response.status}`);
    }
    const catalog = await response.json();
    renderCatalog(catalog);
    const first = firstPreset(catalog);
    if (first) {
      selectPreset(first);
    }
  } catch (error) {
    setStatus(`Catalog failed. The slop is present, but poorly indexed. ${error.message}`, false);
  }

  animate();
}

function renderCatalog(catalog) {
  collectionListEl.textContent = "";

  for (const collection of catalog.collections ?? []) {
    const section = document.createElement("section");
    section.className = "collection-section";

    const header = document.createElement("div");
    header.className = "collection-header";
    header.innerHTML = `<h3></h3><p></p>`;
    header.querySelector("h3").textContent = collection.name;
    header.querySelector("p").textContent = collection.tagline;
    section.append(header);

    for (const model of collection.models ?? []) {
      const group = document.createElement("div");
      group.className = "model-group";

      const title = document.createElement("p");
      title.className = "model-title";
      title.textContent = model.name;
      group.append(title);

      for (const preset of model.presets ?? []) {
        const button = document.createElement("button");
        button.className = "preset-button";
        button.type = "button";
        button.innerHTML = `
          <img alt="" loading="lazy">
          <span>
            <span class="preset-name"></span>
            <span class="preset-subtitle"></span>
          </span>
        `;
        button.querySelector("img").src = preset.image;
        button.querySelector(".preset-name").textContent = preset.name;
        button.querySelector(".preset-subtitle").textContent = preset.subtitle;
        button.addEventListener("click", () => selectPreset({ collection, model, preset, button }));
        group.append(button);
      }

      section.append(group);
    }

    collectionListEl.append(section);
  }
}

function firstPreset(catalog) {
  for (const collection of catalog.collections ?? []) {
    for (const model of collection.models ?? []) {
      const preset = model.presets?.[0];
      if (preset) {
        const button = collectionListEl.querySelector(".preset-button");
        return { collection, model, preset, button };
      }
    }
  }
  return null;
}

function selectPreset(item) {
  activeItem = item;
  if (activeButton) {
    activeButton.classList.remove("is-active");
  }
  activeButton = item.button;
  activeButton?.classList.add("is-active");

  activeCollectionEl.textContent = item.collection.name;
  activeTitleEl.textContent = item.preset.name;
  activeSubtitleEl.textContent = item.preset.subtitle;
  activeSourceEl.textContent = item.model.source;
  activeDimensionsEl.textContent = "-";
  activeTrianglesEl.textContent = "-";
  downloadLinkEl.href = item.preset.stl;
  downloadLinkEl.download = item.preset.stl.split("/").pop();

  loadModel(item);
}

function loadModel(item) {
  setStatus("Loading STL. Triangles are being asked to form a line.", false);
  clearModel();

  loader.load(
    item.preset.stl,
    (geometry) => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.center();
      geometry.computeBoundingSphere();

      const material = new THREE.MeshStandardMaterial({
        color: 0xc24c2f,
        roughness: 0.48,
        metalness: 0.06
      });

      activeMesh = new THREE.Mesh(geometry, material);
      modelRoot.add(activeMesh);

      const edgeGeometry = new THREE.EdgesGeometry(geometry, 22);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.42 });
      activeEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      activeEdges.visible = wireButton.getAttribute("aria-pressed") === "true";
      modelRoot.add(activeEdges);

      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      activeDimensionsEl.textContent = `${formatMm(size.x)} x ${formatMm(size.y)} x ${formatMm(size.z)} mm`;
      activeTrianglesEl.textContent = triangleCount(geometry).toLocaleString();

      frameCamera(geometry);
      setStatus("Loaded. The geometry has chosen cooperation.", true);

      if (!readyResolved) {
        readyResolved = true;
        viewerReadyResolve(window.__slopViewer.getState());
      }
    },
    undefined,
    (error) => {
      setStatus(`STL failed to load. Somewhere, a path is lying. ${error.message ?? error}`, false);
    }
  );
}

function clearModel() {
  modelRoot.clear();
  activeMesh = null;
  activeEdges = null;
}

function frameCamera(geometry) {
  const sphere = geometry.boundingSphere;
  const radius = Math.max(sphere.radius, 1);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.35;

  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 100;
  camera.position.set(distance * 0.72, distance * 0.58, distance * 0.88);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();

  floorGrid.scale.setScalar(Math.max(1, radius / 40));
  floorGrid.position.y = -radius * 0.8;
}

function resetCamera() {
  if (activeMesh) {
    frameCamera(activeMesh.geometry);
  }
}

function toggleSpin() {
  controls.autoRotate = !controls.autoRotate;
  spinButton.setAttribute("aria-pressed", String(controls.autoRotate));
}

function toggleEdges() {
  const next = wireButton.getAttribute("aria-pressed") !== "true";
  wireButton.setAttribute("aria-pressed", String(next));
  if (activeEdges) {
    activeEdges.visible = next;
  }
}

function resizeRenderer() {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function setStatus(message, hideSoon) {
  statusEl.textContent = message;
  statusEl.classList.remove("is-hidden");
  if (hideSoon) {
    window.clearTimeout(setStatus.timeoutId);
    setStatus.timeoutId = window.setTimeout(() => statusEl.classList.add("is-hidden"), 1800);
  }
}

function triangleCount(geometry) {
  if (geometry.index) {
    return Math.floor(geometry.index.count / 3);
  }
  return Math.floor(geometry.attributes.position.count / 3);
}

function formatMm(value) {
  return value.toFixed(value >= 10 ? 1 : 2);
}
