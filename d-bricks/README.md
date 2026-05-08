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
cake-6x-tall-wavy
```

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

When adding a new preset, add it to the model's `.presets.json` file. Put showroom copy directly inside that preset as `Slop_catalog_name` and `Slop_catalog_description`, because duplicating preset IDs in a side table is how tomorrow's build learns sarcasm the hard way.
