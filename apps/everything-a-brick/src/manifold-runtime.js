import wasmUrl from "manifold-3d/manifold.wasm?url";
import { getManifoldModule, setWasmUrl } from "manifold-3d/lib/wasm.js";

setWasmUrl(wasmUrl);

const manifold = await getManifoldModule();

export const { Manifold, Mesh, CrossSection } = manifold;
