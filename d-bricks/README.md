# D-Bricks

This collection contains D-Bricks-compatible OpenSCAD model generators: brick-like solids for when ordinary blocks are too legally and emotionally complicated.

## Credits

The brick generator is based on Badger's printable work. Credit where credit is due, before the parametric sludge gets too confident:

https://www.thingiverse.com/thing:3320303

## Models

```text
dbricks_generator_v4.scad
dbricks_cake_generator.scad
```

Each model has a neighboring OpenSCAD customizer preset file, because magic numbers deserve a place to sit down:

```text
dbricks_generator_v4.presets.json
dbricks_cake_generator.presets.json
```

## Presets

Current generator presets, also known as "things we are willing to admit we build":

```text
brick-1x2-half
brick-2x4-standard
baseplate-4x4
```

Current cake presets, because apparently the brick ecosystem needed dessert:

```text
cake-1x-half-plain
cake-4x-scalloped
cake-4x-scalloped-eighth-slice
cake-4x-scalloped-quarter-slice
cake-4x-scalloped-three-quarter-slice
cake-6x-tall-wavy
```

Cake slices use `Cake_slice_degrees`, with `360` meaning the whole cake and smaller angles producing carefully walled wedges. `Cake_core_layers` adds visible cream separators on sliced faces so slicer color tools have something better to click than "the entire unfortunate wall." Those layer grooves stop at the outer cream-shell paint line instead of wandering into the frosting like they own the place. `Sparse_bottom_clamps` keeps underside anti-studs on a center-cross pattern by default, which gives the brick a chance to self-align before the clutch geometry starts acting like a tiny plastic bouncer. `Slice_bottom_stud_clutches` gives narrow wedges side-wall clamp ribs, while wider slices get sparse round anti-studs plus small side-wall helpers, because apparently even dessert needs a load path. One-stud cakes use short ribs from the round wall, since a tiny floating socket was starting to act like it had tenure.

`Stud_radius_compensation` adds a little extra radius to generated top studs. The shipped presets use `0.15` mm, which is the polite way of saying "my printer lies, but at least now it lies parametrically." If generated-on-generated clutch is loose, nudge it upward in tiny increments; if real-world bricks start putting up a fight, back it down.

## Direct OpenSCAD Export

You can export a single preset directly with OpenSCAD from the repo root, bypassing CMake if you prefer a more hands-on relationship with your consequences:

```sh
openscad -o dist/stl/dbricks_generator_v4.brick-1x2-half.stl \
  -p d-bricks/dbricks_generator_v4.presets.json \
  -P brick-1x2-half \
  d-bricks/dbricks_generator_v4.scad
```

Rendered PNG previews use the same preset arguments, plus camera options so the model looks intentional:

```sh
openscad -o dist/images/dbricks_generator_v4.brick-1x2-half.png \
  --render --autocenter --viewall --projection=ortho --imgsize=1200,900 \
  -p d-bricks/dbricks_generator_v4.presets.json \
  -P brick-1x2-half \
  d-bricks/dbricks_generator_v4.scad
```

When adding a new preset, add it to the model's `.presets.json` file. Put showroom copy directly inside that preset as `Slop_catalog_*` strings, because duplicating preset IDs in a side table is how tomorrow's build learns sarcasm the hard way.
