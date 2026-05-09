# Design And Validation Notes

## Session Review

What worked:

- Keep model behavior driven by OpenSCAD parameters and `.presets.json`. Presets became the single source for catalog entries, descriptions, showroom metadata, and build artifacts.
- Reuse known-good D-Bricks geometry when possible: original top stud profiles, original round anti-stud cylinders, pitch, wall thickness, and height constants.
- Add explicit fit knobs instead of corrupting nominal dimensions. `Stud_radius_compensation` fixed printed-on-printed looseness without hiding the base `stud_radius`.
- Treat slices and round cakes as real footprints, not clipped cubes. Closed radial side walls, center closure, full-stud top placement, and clipped side decorations made the cake generator predictable.
- Validate visually and mechanically. Top-down underside renders caught ribs that looked fine in code but did not connect to walls. Oblique renders caught height and attachment problems. CMake target builds caught whether the artifact path actually worked.
- Prefer wall-grown ribs for narrow or one-stud cases. Ribs need to connect to a side wall or curved wall and stop near the stud clearance circle; floating roof ribs mostly provide decorative anxiety.
- Keep grooves shallow and consistent. Cake layer grooves and cream-shell paint lines worked once they shared depth, overlapped just enough at corners, stopped at intended boundaries, and avoided cutting through thin side walls.

What did not work:

- Simple sector clipping created open or weak slice faces. Slices need explicit shell/cavity logic with radial side walls and center closure.
- Partial top studs made bad functional geometry. Removing partial top studs and requiring full containment gave cleaner, more predictable clutch.
- Partial bottom studs and clamp ribs placed only by "looks nearby" logic were unreliable. Ribs must be targeted against an actual stud clearance circle and anchored to a wall.
- A real brick fitting a generated brick did not prove generated-on-generated fit. Printed top studs can be effectively smaller because of rounded profiles, slicer horizontal compensation, shrink, elephant-foot compensation, and material flex.
- Duplicated metadata was fragile. Catalog data belongs beside the preset it describes; separate side tables invite stale IDs and tiny administrative ruin.

## Cake Generator Pattern

Use this structure for round or sliced brick-compatible models:

1. Define core parameters: footprint size, height, radius/margin, top-stud flag, bottom compatibility flag, slice angle/rotation, decorative controls, clutch controls, and print-fit compensation.
2. Build the body from footprint functions:
   - Full cake: hollow cylindrical shell with top roof.
   - Slice: sector shell with outer arc, radial walls, inner cavity offset, and center closure.
3. Clip decorative additions/cuts against the footprint. Decorations should respect slices instead of wrapping around invisible cake that OpenSCAD has already thrown into the void.
4. Place top studs by full containment. Use a top fit margin and skip partial studs at cuts and curved boundaries.
5. Build the underside by case:
   - Diameter 1: short ribs grown from the round wall toward the center stud.
   - Full larger cake: original internal anti-stud cylinders; allow edge partial tubes only when intentionally supported.
   - Sliced larger cake: original full anti-stud cylinders where they fit, plus side-wall and curved-wall helper ribs for boundary studs.
   - Very narrow slices: short ribs from both radial side walls and the curved wall, aimed at the same stud target.
6. Make paint/detail grooves as shallow subtractive features. Use the same groove depth for related paint lines, overlap corners slightly, and stop horizontal grooves at vertical boundaries unless the design explicitly says otherwise.

## Generalizing To Non-Square Bricks

Think in terms of a footprint adapter. The square brick is one adapter; round cakes, wedges, arches, capsules, letters, and other slop sculptures need their own adapter.

Minimum adapter helpers:

- `inside_footprint(x, y, margin)`: true only when a full feature fits.
- `overlaps_footprint(x, y, margin)`: true when a feature intersects and may need boundary handling.
- `inside_or_overlaps_boundary(x, y, margin)`: useful for relief cuts and partial underside features.
- Local wall frames: convert world `x, y` into coordinates along/normal to a straight wall, curved wall, or cut face.
- Boundary anchor distance: where a rib can start so it overlaps a real wall before the global footprint clip trims it.

Feature rules:

- Top studs: use `inside_footprint` with full-stud margin. If a top stud is partial, remove it unless the user is asking for ornament.
- Shells: subtract an inner offset footprint from the outer footprint; add explicit closures for narrow tips, concave corners, and cut faces.
- Bottom anti-studs: place original round cylinders only where enough area exists. Use `overlaps_footprint` for optional edge partials, but verify they still create a printable and useful clamp.
- Wall ribs: place ribs by solving from a wall boundary to a stud clearance circle. The rib must overlap a real wall, have a meaningful length, and stop before invading the stud.
- Relief cuts: if the underside wall would collide with studs from the brick below, cut reliefs on curved and straight boundaries.
- Print-fit tuning: prefer separate compensation parameters for top studs, bottom clearances, rib clearances, and slicer-specific behavior.

## Practical Validation Checklist

Run a focused loop for every geometry change:

1. Parse preset JSON:
   ```powershell
   Get-Content collection\model.presets.json | ConvertFrom-Json | Out-Null
   ```
2. Direct-export the changed preset with OpenSCAD and look for `Simple: yes`.
3. Render top, underside, and oblique PNGs. Use underside views for clutch geometry; top views lie by omission, the classic CAD maneuver.
4. Build the same preset through CMake target names:
   ```powershell
   cmake --build build\default --parallel --target model.preset.stl model.preset.png
   ```
5. Inspect the generated geometry for:
   - closed walls at cuts, centers, and concave corners;
   - full top studs only;
   - ribs attached to walls, not just the roof;
   - anti-studs or ribs aligned with real grid/stud targets;
   - shallow grooves that do not pierce thin walls;
   - no accidental output outside ignored artifact folders.
6. For physical fit, print a small calibration preset first. Change one of these at a time: `Stud_radius_compensation`, bottom clearance, rib width, or rib reach. Reprinting a whole cake to tune 0.05 mm is how filament learns contempt.
