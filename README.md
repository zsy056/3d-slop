# 3D Slop

Welcome to 3D Slop: a repo for parametric 3D models that aspire to be useful, printable, and only mildly embarrassing when inspected in cross-section. It is a place where the best looking and functioning part of your print may still be the purge tower.

The project builds OpenSCAD model generators into STL files and rendered PNG previews from named parameter presets. In other words, the slop is organized.

## Requirements

- CMake 3.21 or newer
- Ninja
- OpenSCAD

Install OpenSCAD with your operating system's preferred ritual. WinGet or Chocolatey on Windows, Homebrew on macOS, apt on Ubuntu. Offerings of patience may be required for detailed renders.

## Build

Configure once, because CMake enjoys being consulted before anything happens:

```sh
cmake --preset default
```

Build everything:

```sh
cmake --build --preset default
```

Build only STLs, for when preview images feel too luxurious:

```sh
cmake --build --preset stl
```

Build only rendered PNG images, for admiring the geometry before committing plastic to the situation:

```sh
cmake --build --preset images
```

Assemble the GitHub Pages showroom, which includes the static site plus generated artifacts:

```sh
cmake --build --preset pages
```

Generated files go under `dist/`, where build artifacts can live their brief, ignored lives:

```text
dist/
  stl/
  images/
```

## Model Collections

Model-specific documentation lives with each collection, because one README should not have to personally supervise every questionable extrusion:

```text
d-bricks/
```

Each `.scad` model can have a neighboring OpenSCAD customizer preset file. When adding a new model or preset, update the matching collection `CMakeLists.txt` so it joins the local and CI artifact parade.

## Pages Showroom

The static showcase lives in `site/` and gets assembled into `build/default/pages/`. It uses Three.js in the browser to inspect STL files, because hand-rolling a 3D viewer is how a repo starts collecting haunted utility functions.
