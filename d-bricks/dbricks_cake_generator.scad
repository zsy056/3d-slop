//
// Dbricks Cake Generator
//
// Reuses the top stud geometry from dbricks_generator_v4.scad. The underside is
// a hollow round shell with a thin wall grid. Circular clearances cut through
// the grid at baseplate stud positions, leaving only four small wall ends to
// touch each stud instead of fully enclosed cylinders.
//

use <dbricks_generator_v4.scad>

/* [Cake] */

// Outer cake diameter, measured against the Dbricks grid.
Cake_diameter_studs = 4; // [1:1:10]

// Cake height in Dbricks brick-height units. 0.5 is a half-height brick.
Cake_height_factor = 1; // [0.25:0.25:3]

// Extra radial margin beyond the nominal stud-grid diameter.
Cake_radius_extra = 2.0; // [0:0.1:8]

/* [Side Decoration] */

// Decorative pattern on the cylindrical side wall.
Side_pattern = 4; // [0:None, 1:Horizontal grooves, 2:Vertical flutes, 3:Raised dots, 4:Scalloped bands, 5:Wavy grooves, 6:Raised wavy icing, 7:Double raised waves]

// Number of repeats around the side for flutes, dots, or scallops.
Side_pattern_count = 24; // [6:1:72]

// Number of rows for grooves or raised dots.
Side_pattern_rows = 2; // [1:1:6]

// Cut depth for grooves/flutes, or protrusion for raised patterns.
Side_pattern_depth = 0.45; // [0.1:0.05:1.2]

// Groove height, flute width, dot radius, or scallop radius.
Side_pattern_size = 1.2; // [0.4:0.1:4]

// Number of sine-wave cycles around the cake for wavy patterns.
Side_wave_cycles = 3; // [1:1:12]

// Vertical amplitude of wavy side patterns.
Side_wave_amplitude = 1.0; // [0.2:0.1:4]

// Number of samples around the cake for wavy patterns.
Side_wave_samples = 96; // [24:4:192]

/* [Dbricks Compatibility] */

// Add Dbricks-compatible studs on the top surface.
Top_studs = 1; // [0:No, 1:Yes]

// Add the original generator's hollow underside and bottom clutch geometry.
Bottom_compatible = 1; // [0:No, 1:Yes]

// Add crescent cutouts to the round wall for baseplate studs at the edge.
Partial_stud_reliefs = 1; // [0:No, 1:Yes]

// Extra space around top studs before the cake edge.
Top_edge_clearance = 0.2; // [0:0.05:2]

// Clearance used around baseplate studs in the bottom grid and round wall.
Socket_clearance = 0.15; // [0:0.05:1]

// Small lead-in chamfer for round-wall edge relief cuts.
Socket_lead_in = 0.25; // [0:0.05:1]

// Depth of round-wall reliefs. 0 means auto depth for standard Dbricks studs.
Partial_relief_depth = 0; // [0:0.1:12]

// Thickness of the bottom grid walls.
Grid_wall_thickness = 0.8; // [0.5:0.05:1.5]

// Add continuous strengthening ribs halfway between stud rows and columns.
Bottom_reinforcement_walls = 1; // [0:No, 1:Yes]

// Thickness of the continuous strengthening ribs.
Reinforcement_wall_thickness = 0.9; // [0.5:0.05:2]

// Radius of the rounded lead-in on the bottom clamp wall edges.
Bottom_wall_corner_radius = 0.25; // [0:0.05:0.4]

// Number of layers used to approximate the bottom clamp wall rounding.
Bottom_wall_corner_steps = 6; // [2:1:12]

/* [Advanced] */

// Size of a single Dbricks stud pitch in mm.
base_unit = 15.88;

// Standard Dbricks brick height in mm.
std_height = 19.25;

// Outer wall thickness for the added cylindrical skirt.
wall_thickness = 1.5;

// Top surface thickness, matching the original generator.
roof_thickness = 1.4;

// Stud outer radius.
stud_radius = 4.67;

// Stud height.
stud_height = 4.6;

// Stud wall thickness from the original generator.
stud_wall_thickness = 1.3;

// Rounded body edge radius, passed to original stud profile through this name.
rounded_corners = 1.0; // [0:0.1:2]

// Cylinder curve segments / complexity.
curve_detail = 96; // [24:2:160]

// Small-radius curve detail.
corner_detail = 18; // [8:1:60]

// Show a cutaway preview of the hollow underside.
Cutaway_preview = 0; // [0:No, 1:Yes]


dbricks_cake(
    diameter_studs = Cake_diameter_studs,
    height_factor = Cake_height_factor,
    top_studs = Top_studs,
    bottom_compatible = Bottom_compatible
);


module dbricks_cake(diameter_studs = 4, height_factor = 0.5, top_studs = 1, bottom_compatible = 1) {
    height = max(roof_thickness + 0.8, height_factor * std_height);
    radius = diameter_studs * base_unit / 2 + Cake_radius_extra;
    relief_radius = stud_radius + Socket_clearance;
    relief_depth = Partial_relief_depth > 0 ?
        min(height, Partial_relief_depth) :
        min(height, stud_height + Socket_clearance + 0.8);

    difference() {
        union() {
            if (bottom_compatible) {
                cake_shell_with_reliefs(diameter_studs, radius, height, relief_radius, relief_depth);
                bottom_wall_grid(diameter_studs, radius, height, relief_radius);
            } else {
                cylinder(h = height, r = radius, $fn = curve_detail);
            }

            side_pattern_additions(radius, height);

            if (top_studs) {
                original_top_studs(diameter_studs, height, radius);
            }
        }

        side_pattern_cuts(radius, height);

        if (bottom_compatible && Partial_stud_reliefs) {
            baseplate_stud_reliefs(diameter_studs, radius, relief_radius, relief_depth);
        }

        if (Cutaway_preview) {
            translate([-radius - 2, -radius - 2, -1])
                cube([radius + 2, 2 * radius + 4, height + stud_height + 3]);
        }
    }
}


module cake_shell_with_reliefs(diameter_studs, radius, height, relief_radius, relief_depth) {
    if (Partial_stud_reliefs) {
        difference() {
            cake_shell(radius, height);
            baseplate_stud_reliefs(diameter_studs, radius, relief_radius, relief_depth);
        }
    } else {
        cake_shell(radius, height);
    }
}


module cake_shell(radius, height) {
    difference() {
        cylinder(h = height, r = radius, $fn = curve_detail);

        translate([0, 0, -1])
            cylinder(
                h = height - roof_thickness + 1.02,
                r = max(0.1, radius - wall_thickness),
                $fn = curve_detail
            );
    }
}


module bottom_wall_grid(diameter_studs, radius, height, stud_clearance_radius) {
    grid_height = max(0.1, height - roof_thickness + 0.12);
    inner_radius = max(0.1, radius - wall_thickness + 0.05);
    grid_span = 2 * inner_radius + 0.4;
    min_wall_thickness = Bottom_reinforcement_walls ?
        min(Grid_wall_thickness, Reinforcement_wall_thickness) :
        Grid_wall_thickness;
    round_radius = min(
        Bottom_wall_corner_radius,
        max(0, min(grid_height / 2, min_wall_thickness / 2 - 0.03))
    );

    rounded_bottom_footprint_extrude(grid_height, round_radius) {
        bottom_wall_grid_footprint(
            diameter_studs,
            inner_radius,
            grid_span,
            stud_clearance_radius
        );
    }
}

module bottom_wall_grid_footprint(
    diameter_studs,
    inner_radius,
    grid_span,
    stud_clearance_radius
) {
    difference() {
        intersection() {
            circle(r = inner_radius, $fn = curve_detail);

            bottom_wall_grid_stripes(diameter_studs, grid_span);
        }

        baseplate_stud_clearance_footprint(
            diameter_studs,
            inner_radius,
            stud_clearance_radius
        );
    }
}


module bottom_wall_grid_stripes(diameter_studs, grid_span) {
    union() {
        for (ix = [0 : diameter_studs - 1]) {
            x = grid_position(ix, diameter_studs);
            translate([x, 0])
                square([Grid_wall_thickness, grid_span], center = true);
        }

        for (iy = [0 : diameter_studs - 1]) {
            y = grid_position(iy, diameter_studs);
            translate([0, y])
                square([grid_span, Grid_wall_thickness], center = true);
        }

        if (Bottom_reinforcement_walls) {
            for (ix = [0 : diameter_studs - 2]) {
                x = (grid_position(ix, diameter_studs) +
                    grid_position(ix + 1, diameter_studs)) / 2;
                translate([x, 0])
                    square([Reinforcement_wall_thickness, grid_span], center = true);
            }

            for (iy = [0 : diameter_studs - 2]) {
                y = (grid_position(iy, diameter_studs) +
                    grid_position(iy + 1, diameter_studs)) / 2;
                translate([0, y])
                    square([grid_span, Reinforcement_wall_thickness], center = true);
            }
        }
    }
}


module baseplate_stud_clearance_footprint(diameter_studs, clip_radius, clearance_radius) {
    for (ix = [-1 : diameter_studs]) {
        for (iy = [-1 : diameter_studs]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (overlaps_round_footprint(x, y, clip_radius, clearance_radius)) {
                translate([x, y])
                    circle(r = clearance_radius, $fn = curve_detail);
            }
        }
    }
}


module rounded_bottom_footprint_extrude(height, round_radius) {
    if (round_radius <= 0) {
        linear_extrude(height = height, convexity = 10)
            children();
    } else {
        layer_overlap = 0.01;

        for (step = [0 : Bottom_wall_corner_steps - 1]) {
            z0 = round_radius * step / Bottom_wall_corner_steps;
            z1 = round_radius * (step + 1) / Bottom_wall_corner_steps;
            zmid = (z0 + z1) / 2;
            inset = bottom_wall_rounding_inset(round_radius, zmid);

            translate([0, 0, z0])
                linear_extrude(height = z1 - z0 + layer_overlap, convexity = 10)
                    offset(delta = -inset)
                        children();
        }

        translate([0, 0, round_radius - layer_overlap])
            linear_extrude(height = height - round_radius + layer_overlap, convexity = 10)
                children();
    }
}


function bottom_wall_rounding_inset(radius, z) =
    radius - sqrt(max(0, radius * radius - (radius - z) * (radius - z)));


module baseplate_stud_clearances(diameter_studs, clip_radius, clearance_radius, clearance_depth) {
    for (ix = [-1 : diameter_studs]) {
        for (iy = [-1 : diameter_studs]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (overlaps_round_footprint(x, y, clip_radius, clearance_radius)) {
                translate([x, y, -0.03])
                    cylinder(
                        h = clearance_depth + 0.06,
                        r = clearance_radius,
                        $fn = curve_detail
                    );
            }
        }
    }
}


module baseplate_stud_reliefs(diameter_studs, radius, relief_radius, relief_depth) {
    cut_radius = relief_radius + Socket_lead_in;

    for (ix = [-1 : diameter_studs]) {
        for (iy = [-1 : diameter_studs]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (overlaps_round_wall(x, y, radius, cut_radius)) {
                translate([x, y, -0.03]) {
                    cylinder(h = relief_depth + 0.06, r = relief_radius, $fn = curve_detail);

                    if (Socket_lead_in > 0) {
                        cylinder(
                            h = Socket_lead_in + 0.06,
                            r1 = cut_radius,
                            r2 = relief_radius,
                            $fn = curve_detail
                        );
                    }
                }
            }
        }
    }
}


module original_top_studs(diameter_studs, height, radius) {
    top_fit_margin = stud_radius + Top_edge_clearance;

    for (ix = [0 : diameter_studs - 1]) {
        for (iy = [0 : diameter_studs - 1]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (inside_round_footprint(x, y, radius, top_fit_margin)) {
                stud_extruded(x, y, height, stud_radius);
            }
        }
    }
}


function grid_position(index, count) = (index - (count - 1) / 2) * base_unit;

function inside_round_footprint(x, y, radius, margin) =
    sqrt(x * x + y * y) + margin <= radius + 0.001;

function overlaps_round_footprint(x, y, radius, fit_radius) =
    sqrt(x * x + y * y) - fit_radius <= radius + 0.001;

function overlaps_round_wall(x, y, radius, relief_radius) =
    sqrt(x * x + y * y) - relief_radius <= radius + 0.001 &&
    sqrt(x * x + y * y) + relief_radius >= radius - wall_thickness - 0.001;


module side_pattern_additions(radius, height) {
    if (Side_pattern == 3) {
        side_dot_pattern(
            radius,
            height,
            Side_pattern_count,
            Side_pattern_rows,
            Side_pattern_size,
            Side_pattern_depth
        );
    }

    if (Side_pattern == 4) {
        side_scallop_bands(
            radius,
            height,
            Side_pattern_count,
            Side_pattern_size,
            Side_pattern_depth
        );
    }

    if (Side_pattern == 6) {
        side_wavy_icing(
            radius,
            height,
            Side_wave_samples,
            Side_wave_cycles,
            Side_pattern_rows,
            Side_wave_amplitude,
            Side_pattern_size,
            Side_pattern_depth,
            0
        );
    }

    if (Side_pattern == 7) {
        side_wavy_icing(
            radius,
            height,
            Side_wave_samples,
            Side_wave_cycles,
            Side_pattern_rows,
            Side_wave_amplitude,
            Side_pattern_size,
            Side_pattern_depth,
            0
        );
        side_wavy_icing(
            radius,
            height,
            Side_wave_samples,
            Side_wave_cycles,
            Side_pattern_rows,
            Side_wave_amplitude,
            Side_pattern_size,
            Side_pattern_depth,
            180 / Side_wave_cycles
        );
    }
}


module side_pattern_cuts(radius, height) {
    if (Side_pattern == 1) {
        for (row = [1 : Side_pattern_rows]) {
            z = height * row / (Side_pattern_rows + 1);
            side_groove_cut(radius, z, Side_pattern_depth, Side_pattern_size);
        }
    }

    if (Side_pattern == 2) {
        side_vertical_flute_cuts(
            radius,
            height,
            Side_pattern_count,
            Side_pattern_depth,
            Side_pattern_size
        );
    }

    if (Side_pattern == 5) {
        side_wavy_groove_cuts(
            radius,
            height,
            Side_wave_samples,
            Side_wave_cycles,
            Side_pattern_rows,
            Side_wave_amplitude,
            Side_pattern_size,
            Side_pattern_depth
        );
    }
}


module side_groove_cut(radius, z, depth, groove_height) {
    rotate_extrude($fn = curve_detail) {
        translate([radius - depth, z - groove_height / 2])
            square([depth + 0.2, groove_height]);
    }
}


module side_vertical_flute_cuts(radius, height, count, depth, flute_width) {
    margin = max(1.0, min(2.0, height * 0.16));
    flute_height = max(0.2, height - 2 * margin);

    for (i = [0 : count - 1]) {
        rotate([0, 0, 360 * i / count])
            translate([radius - depth / 2 + 0.05, 0, margin + flute_height / 2])
                cube([depth + 0.2, flute_width, flute_height], center = true);
    }
}


module side_dot_pattern(radius, height, count, rows, dot_radius, protrusion) {
    for (row = [0 : rows - 1]) {
        z = height * (row + 1) / (rows + 1);
        offset = (row % 2) * 0.5;

        for (i = [0 : count - 1]) {
            side_radial_disc(
                radius,
                z,
                360 * (i + offset) / count,
                dot_radius,
                protrusion
            );
        }
    }
}


module side_scallop_bands(radius, height, count, scallop_radius, protrusion) {
    bead_radius = clamp(scallop_radius * 0.38, 0.35, 0.9);
    amplitude = max(0.35, scallop_radius);
    lower_z = clamp(
        height * 0.42,
        bead_radius + amplitude + 0.35,
        height - bead_radius - 0.35
    );
    upper_z = clamp(
        height * 0.72,
        bead_radius + 0.35,
        height - bead_radius - amplitude - 0.35
    );
    scallop_samples = 6;

    for (i = [0 : count - 1]) {
        side_scallop_arc(
            radius,
            lower_z,
            360 * i / count,
            360 * (i + 1) / count,
            -amplitude,
            bead_radius,
            protrusion,
            scallop_samples
        );

        side_scallop_arc(
            radius,
            upper_z,
            360 * (i + 0.5) / count,
            360 * (i + 1.5) / count,
            amplitude,
            bead_radius,
            protrusion,
            scallop_samples
        );
    }
}


module side_scallop_arc(
    radius,
    base_z,
    start_angle,
    end_angle,
    amplitude,
    bead_radius,
    protrusion,
    samples
) {
    for (step = [0 : samples - 1]) {
        t1 = step / samples;
        t2 = (step + 1) / samples;
        angle1 = start_angle + (end_angle - start_angle) * t1;
        angle2 = start_angle + (end_angle - start_angle) * t2;
        z1 = base_z + amplitude * sin(180 * t1);
        z2 = base_z + amplitude * sin(180 * t2);

        hull() {
            side_radial_disc(radius, z1, angle1, bead_radius, protrusion);
            side_radial_disc(radius, z2, angle2, bead_radius, protrusion);
        }
    }
}


module side_wavy_groove_cuts(radius, height, samples, cycles, rows, amplitude, groove_radius, depth) {
    for (row = [0 : rows - 1]) {
        center_z = height * (row + 1) / (rows + 1);
        row_phase = (row % 2) * 180;

        for (i = [0 : samples - 1]) {
            angle1 = 360 * i / samples;
            angle2 = 360 * (i + 1) / samples;
            z1 = clamp(
                center_z + amplitude * sin(cycles * angle1 + row_phase),
                groove_radius + 0.3,
                height - groove_radius - 0.3
            );
            z2 = clamp(
                center_z + amplitude * sin(cycles * angle2 + row_phase),
                groove_radius + 0.3,
                height - groove_radius - 0.3
            );

            hull() {
                side_radial_cut_disc(radius, z1, angle1, groove_radius, depth);
                side_radial_cut_disc(radius, z2, angle2, groove_radius, depth);
            }
        }
    }
}


module side_wavy_icing(radius, height, samples, cycles, rows, amplitude, bead_radius, protrusion, phase_offset) {
    for (row = [0 : rows - 1]) {
        center_z = height * (row + 1) / (rows + 1);
        row_phase = (row % 2) * 180 + phase_offset;

        for (i = [0 : samples - 1]) {
            angle1 = 360 * i / samples;
            angle2 = 360 * (i + 1) / samples;
            z1 = clamp(
                center_z + amplitude * sin(cycles * angle1 + row_phase),
                bead_radius + 0.3,
                height - bead_radius - 0.3
            );
            z2 = clamp(
                center_z + amplitude * sin(cycles * angle2 + row_phase),
                bead_radius + 0.3,
                height - bead_radius - 0.3
            );

            hull() {
                side_radial_disc(radius, z1, angle1, bead_radius, protrusion);
                side_radial_disc(radius, z2, angle2, bead_radius, protrusion);
            }
        }
    }
}


function clamp(v, low, high) = min(max(v, low), high);


module side_radial_disc(radius, z, angle, disc_radius, protrusion) {
    anchor_overlap = min(wall_thickness * 0.75, max(0.35, protrusion));

    rotate([0, 0, angle])
        translate([radius + (protrusion - anchor_overlap) / 2, 0, z])
            rotate([0, 90, 0])
                cylinder(
                    h = protrusion + anchor_overlap,
                    r = disc_radius,
                    center = true,
                    $fn = corner_detail
                );
}


module side_radial_cut_disc(radius, z, angle, disc_radius, depth) {
    rotate([0, 0, angle])
        translate([radius - depth / 2 + 0.04, 0, z])
            rotate([0, 90, 0])
                cylinder(
                    h = depth + 0.12,
                    r = disc_radius,
                    center = true,
                    $fn = corner_detail
                );
}
