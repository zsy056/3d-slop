# Design And Validation Notes

## Session Review

What worked:

- Keep model behavior driven by OpenSCAD parameters and `.presets.json`. Presets became the single source for catalog entries, descriptions, showroom metadata, and build artifacts.
- Reuse known-good D-Bricks geometry when possible: original top stud profiles, original round anti-stud cylinders, pitch, wall thickness, and height constants.
- Add explicit fit knobs instead of corrupting nominal dimensions. `Stud_radius_compensation` fixed printed-on-printed looseness without hiding the base `stud_radius`.
- Treat slices and round cakes as real footprints, not clipped cubes. Closed radial side walls, center closure, full-stud top placement, and clipped side decorations made the cake generator predictable.
- Validate visually and mechanically. Top-down underside renders caught ribs that looked fine in code but did not connect to walls. Oblique renders caught height and attachment problems. CMake target builds caught whether the artifact path actually worked.
- Prefer wall-grown ribs for narrow or one-stud cases. Ribs need to connect to a side wall or curved wall and stop near the stud clearance circle; floating roof ribs mostly provide decorative anxiety.
- Prefer sparse official-style underside clamp patterns for large footprints. DUPLO-style clutch is not a dense socket carpet; it is a selected set of tubes, walls, and ribs that leaves clearance for studs to enter, find the grid, and settle without every tolerance error joining the argument.
- Preserve an even sparse anti-stud pattern for large sliced footprints. When a ring hollow intersects the center closure or a cut wall, put the wall back and leave only the stud relief actually needed for clamping. Deleting a tube may look tidy, but it breaks the pattern and quietly steals clutch.
- For subtractive solid mounts, hollow first and add the sparse clamp back. Everything-a-brick-style cutters need a cavity up to clamp height, a preserved outer shell, ring or rib keepers removed from the cavity cutter, then stud relief cuts through the shell where lower studs would collide.
- Keep the preserved outer shell robust. The Everything-a-brick implementation uses a 3.2 mm minimum shell wall so the remaining skin is not a fragile shard waiting to become a bad afternoon.
- When no full anti-stud ring fits an organic or tiny footprint, switch to wall-grown fallback ribs connected to the preserved shell. Surface that state in debug output instead of silently producing a hollow brick with no clutch geometry.
- Keep grooves shallow and consistent. Cake layer grooves and cream-shell paint lines worked once they shared depth, overlapped just enough at corners, stopped at intended boundaries, and avoided cutting through thin side walls.

What did not work:

- Simple sector clipping created open or weak slice faces. Slices need explicit shell/cavity logic with radial side walls and center closure.
- Partial top studs made bad functional geometry. Removing partial top studs and requiring full containment gave cleaner, more predictable clutch.
- Partial bottom studs and clamp ribs placed only by "looks nearby" logic were unreliable. Ribs must be targeted against an actual stud clearance circle and anchored to a wall.
- Removing center-adjacent anti-stud tubes to protect the slice center wall was the wrong abstraction. The right fix is uniform ring placement, footprint clipping, center-wall restoration, and relief cuts only where the lower studs need room.
- Dense bottom clamp grids overconstrained the fit. A generated underside that tries to grip every possible stud has higher insertion force, worse tolerance stacking, and less of the self-aligning behavior seen in larger official DUPLO bricks.
- In subtractive solid cutters, cutting fewer clamp tubes into an otherwise solid cut plane did not create sparse clutch. The remaining solid still blocked lower studs; the correct sequence is hollow, preserve shell, add sparse keepers, then cut stud reliefs.
- Letting `antiStudCenters.length === 0` mean "no underside clutch" failed on small organic cuts such as the strawberry test. Tiny cuts need a sparse wall-rib fallback if full rings cannot fit.
- A real brick fitting a generated brick did not prove generated-on-generated fit. Printed top studs can be effectively smaller because of rounded profiles, slicer horizontal compensation, shrink, elephant-foot compensation, and material flex.
- Duplicated metadata was fragile. Catalog data belongs beside the preset it describes; separate side tables invite stale IDs and tiny administrative ruin.

## Sparse Clamp Pattern Rationale

Use sparse clamp geometry whenever the footprint can support it.

Why it is preferred:

- Sparse clamps reduce overconstraint. Dense patterns make many studs and sockets fight at once, so tiny pitch, radius, print-shrink, elephant-foot, and layer-line errors stack into one large insertion-force problem.
- Sparse clamps leave entry clearance. The lower studs can enter open space first, then contact a few meaningful walls or tubes instead of colliding with a full checkerboard of plastic.
- Sparse clamps improve self-alignment. A small number of well-placed compliant contact surfaces nudges the brick toward the stud grid; a dense pattern tends to bind before it has a chance to slide into place.
- Sparse clamps are more forgiving for printed parts. Printed plastic is usually stiffer, rougher, and less dimensionally consistent than molded ABS, so copying the visual density of a grid is not the same as copying the functional behavior.

Implementation rules:

1. Keep nominal pitch, stud, anti-stud, and clearance dimensions recognizable. Tuning belongs in explicit compensation parameters.
2. Select sparse full-fit anti-stud centers for large rectangular, round, or sliced footprints. Avoid partial edge tubes unless there is a deliberate wall-grown support strategy.
3. For OpenSCAD shell generators, keep sparse rings/tubes only where the footprint supports them; use wall ribs for boundaries and tiny shapes.
4. For subtractive solid generators, build the cutter as cavity plus stud reliefs minus keepers. The cavity hollows the cut plane up to clamp height while preserving the outer shell; keepers become sparse rings or wall ribs; stud reliefs cut only where lower studs need to pass.
5. Preserve a shell thick enough to survive handling. In Everything-a-brick, 3.2 mm is the current minimum shell wall for the preserved outer skin.
6. If no full ring fits, use a `sparse-wall-ribs` style fallback: ribs grown from the preserved shell toward stud clearance circles, with debug state that says the fallback was used.

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
   - Sliced larger cake: original anti-stud ring lattice selected by footprint overlap and clipped to the slice, plus side-wall and curved-wall helper ribs for boundary studs. Keep the ring pattern even when a tube hollow reaches the center closure; restore the center wall afterward and let relief cuts handle actual stud clearance.
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
   - large footprints keep a sparse, even anti-stud pattern instead of acquiring a suspicious bald center or a dense clamp carpet;
   - subtractive mounts have a hollow cut plane, solid preserved shell, sparse ring/rib keepers, and shell relief cuts where lower studs need clearance;
   - shallow grooves that do not pierce thin walls;
   - no accidental output outside ignored artifact folders.
6. For browser-based cutters such as Everything-a-brick, run the app build/tests and inspect with Playwright before claiming a clutch fix. Check debug state such as `clampPattern`, `antiStuds`, `fallbackClampRibs`, and `minimumShellWall`, then probe the downloaded STL for first solid Z at cavity, shell, relief, and ring/rib sample points.
7. For physical fit, print a small calibration preset first. Change one of these at a time: `Stud_radius_compensation`, bottom clearance, rib width, or rib reach. Reprinting a whole cake to tune 0.05 mm is how filament learns contempt.
