---
name: brick-generator
description: Design, modify, and validate parametric OpenSCAD generators for brick-compatible 3D models in this repo. Use for D-Bricks or similar non-square, round, sliced, curved, organic, or otherwise suspicious brick geometry; top studs; anti-studs; wall ribs; clutch tuning; preset JSON metadata; CMake artifact targets; STL/PNG validation; and GitHub Pages catalog compatibility.
---

# Brick Generator

## Core Workflow

1. Read the nearby generator, preset JSON, collection `CMakeLists.txt`, and collection README before editing. Follow local OpenSCAD naming, preset, and catalog metadata patterns.
2. Separate nominal compatibility dimensions from print-fit tuning. Keep `stud_radius`, `cyl_radius`, `wall_thickness`, and pitch values recognizable; add explicit compensation parameters for printer lies and other domestic betrayals.
3. Treat the model footprint as a 2D contract. For non-square shapes, define or reuse `inside_*_footprint`, `overlaps_*_footprint`, and boundary/local-frame helpers before placing studs, walls, grooves, or underside clutches.
4. Place top studs only when the full stud fits the footprint. Avoid partial top studs unless the user explicitly wants decorative nonsense with legal consequences.
5. Choose bottom clutch geometry by available footprint, not by optimism:
   - Large areas: prefer sparse official-style anti-stud cylinders/tubes where full rings fit. Do not carpet the underside with every possible clamp.
   - Large sliced areas: keep a sparse, even anti-stud pattern clipped to the slice footprint. If a tube hollow intersects a center closure or cut wall, restore the wall material and add stud relief cuts where needed; do not delete the ring just because the hollow is inconvenient.
   - Boundary areas: add ribs or short walls that physically grow from a side wall or curved wall.
   - Tiny/narrow areas: use wall-grown short ribs aimed at the stud clearance circle.
   - Special-case only genuinely tiny footprints, usually diameter 1 or 2, where the original ring pattern is not physically meaningful.
6. Prefer sparse clamp patterns because they reduce overconstraint. A dense underside makes every stud/socket tolerance stack participate at once, raising insertion force and fighting alignment; a sparse pattern lets a few compliant walls guide the brick onto the grid while leaving relief space for the rest.
7. For subtractive solid mounts such as Everything-a-brick, sparse clamps only work after the cut volume is hollowed up to clamp height. Preserve a robust outer shell, subtract/add-back anti-stud ring or wall-rib keepers, then cut shell reliefs where lower studs would collide. Cutting fewer clamp tubes into a solid block still leaves a solid block.
8. Keep slicer paint/detail grooves shallow, consistent, and bounded. Grooves should meet intentional boundaries with tiny overlap, not tunnel through thin walls like a bad idea with a cube primitive.
9. Put preset-specific metadata in each OpenSCAD `.presets.json` `parameterSets` entry using `Slop_catalog_*` keys. Use `x-3d-slop` only for collection-level metadata.
10. Update collection docs when new user-facing parameters, presets, or behavior appear. Keep the repo voice dry and funny, but make commands and dimensions boringly correct.

## Validation

Always validate geometry through the same path users and CI use.

```powershell
# Configure if needed.
cmake --preset default

# Build focused targets while iterating.
cmake --build build\default --parallel --target `
  model_name.preset-name.stl `
  model_name.preset-name.png
```

For direct OpenSCAD checks:

```powershell
openscad.com --export-format asciistl `
  -o dist\stl\model_name.preset-name.stl `
  -p collection\model_name.presets.json `
  -P preset-name `
  collection\model_name.scad
```

Confirm:

- OpenSCAD reports `Simple: yes`.
- STL and PNG targets build, not just direct exports.
- JSON presets parse.
- Top, underside, and oblique renders show closed side walls, full studs, and clutch ribs touching the intended walls.
- Browser/subtractive mount tests inspect the actual generated STL, not just the preview. For Everything-a-brick-style cuts, use Playwright to verify debug state and probe the downloaded mesh: cavity hollow, preserved shell solid, sparse ring/rib keepers solid, and stud relief openings clear.
- Build outputs remain under ignored `build/` or `dist/`.

## Reference Notes

Read [design-and-validation.md](references/design-and-validation.md) when designing new non-square generators, changing clutch behavior, adding slice/cut geometry, or debugging print fit.
