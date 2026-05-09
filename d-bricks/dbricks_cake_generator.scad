//
// Dbricks Cake Generator
//
// Reuses the top stud geometry from dbricks_generator_v4.scad. The underside is
// a hollow round shell with original-style anti-stud cylinders placed at the
// reinforcement-wall intersections used by the previous bottom grid.
//

use <dbricks_generator_v4.scad>

/* [Cake] */

// Outer cake diameter, measured against the Dbricks grid.
Cake_diameter_studs = 4; // [1:1:10]

// Cake height in Dbricks brick-height units. 0.5 is a half-height brick.
Cake_height_factor = 1; // [0.25:0.25:3]

// Extra radial margin beyond the nominal stud-grid diameter.
Cake_radius_extra = 2.0; // [0:0.1:8]

/* [Cake Slice] */

// Sector angle to generate. 360 keeps the whole cake; 180 is half, 90 is quarter.
Cake_slice_degrees = 360; // [1:1:360]

// Rotation for the slice sector. Ignored for whole cakes.
Cake_slice_rotation_degrees = 0; // [0:1:359]

// Number of cake-core layers shown on sliced faces.
Cake_core_layers = 2; // [1:1:8]

// Height of each cream separator band on sliced faces.
Cake_cream_layer_height = 1.0; // [0.2:0.1:4]

// Shallow recess depth for cream separator grooves on sliced faces. 0 disables the coloring grooves.
Slice_face_cream_groove_depth = 0.2; // [0:0.01:0.8]

// Shallow recess depth for sliced-face paint lines around the outer cream shell.
// Boundary grooves share the shallower of this and Slice_face_cream_groove_depth.
Slice_face_cream_shell_groove_depth = 0.2; // [0:0.01:0.8]

// Width of sliced-face paint lines around the outer cream shell.
Slice_face_cream_shell_groove_width = 0.5; // [0.1:0.05:2]

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

// Add clipped anti-stud tubes around the round edge where the tube lattice overlaps.
Edge_partial_tubes = 1; // [0:No, 1:Yes]

// Add short wall sockets under full studs on cake slices for better clutch.
Slice_bottom_stud_clutches = 1; // [0:No, 1:Yes]

// How far slice side-wall clamp ribs may reach inward toward a stud.
Slice_side_clamp_reach = 8.5; // [2:0.1:16]

// Width of slice side-wall clamp ribs along the radial wall.
Slice_side_clamp_width = 2.0; // [1:0.1:5]

// Clearance between slice side-wall clamp ribs and the stud they grip.
Slice_side_clamp_clearance = 0.05; // [0:0.01:0.4]

// Extra space around top studs before the cake edge.
Top_edge_clearance = 0.2; // [0:0.05:2]

// Clearance used around baseplate studs in the round wall.
Socket_clearance = 0.15; // [0:0.05:1]

// Small lead-in chamfer for round-wall edge relief cuts.
Socket_lead_in = 0.25; // [0:0.05:1]

// Depth of round-wall reliefs. 0 means auto depth for standard Dbricks studs.
Partial_relief_depth = 0; // [0:0.1:12]

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

// Extra radius added to top studs for print-to-print clutch tuning.
Stud_radius_compensation = 0.15; // [-0.3:0.01:0.5]

// Stud height.
stud_height = 4.6;

// Stud wall thickness from the original generator.
stud_wall_thickness = 1.3;

// Internal anti-stud cylinder outer radius from the original generator.
cyl_radius = 6.55;

// Internal anti-stud cylinder wall thickness from the original generator.
cyl_thickness = 1;

// Support ridge thickness for the internal anti-stud cylinders.
ridge_thickness = 1;

// Add cross cuts through the internal anti-stud cylinders.
internal_cylinder_cuts = 0; // [0:No, 1:Yes]

// Short wall-stud height used inside single-stud cakes.
short_wall_stud_height = 4.6; // [1:0.1:10]

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
    slice_degrees = diameter_studs > 1 ? clamp(Cake_slice_degrees, 1, 360) : 360;

    cake_body(
        diameter_studs,
        radius,
        height,
        relief_radius,
        relief_depth,
        top_studs,
        bottom_compatible,
        slice_degrees,
        Cake_slice_rotation_degrees
    );
}


module cake_body(
    diameter_studs,
    radius,
    height,
    relief_radius,
    relief_depth,
    top_studs,
    bottom_compatible,
    slice_degrees,
    slice_rotation_degrees
) {
    sliced = slice_degrees < 360;

    difference() {
        union() {
            if (bottom_compatible) {
                cake_shell_with_reliefs(
                    diameter_studs,
                    radius,
                    height,
                    relief_radius,
                    relief_depth,
                    slice_degrees,
                    slice_rotation_degrees
                );

                bottom_clutch_tube_lattice(
                    diameter_studs,
                    radius,
                    height,
                    slice_degrees,
                    slice_rotation_degrees
                );
            } else {
                if (sliced) {
                    cake_sector_solid(radius, height, slice_degrees, slice_rotation_degrees);
                } else {
                    cylinder(h = height, r = radius, $fn = curve_detail);
                }
            }

            if (sliced) {
                intersection() {
                    side_pattern_additions(radius, height);
                    cake_slice_clip(radius, height, slice_degrees, slice_rotation_degrees);
                }
            } else {
                side_pattern_additions(radius, height);
            }

            if (top_studs) {
                original_top_studs(
                    diameter_studs,
                    height,
                    radius,
                    slice_degrees,
                    slice_rotation_degrees
                );
            }

        }

        if (sliced) {
            intersection() {
                side_pattern_cuts(radius, height);
                cake_slice_clip(radius, height, slice_degrees, slice_rotation_degrees);
            }
        } else {
            side_pattern_cuts(radius, height);
        }

        if (bottom_compatible && Partial_stud_reliefs) {
            baseplate_stud_reliefs(
                diameter_studs,
                radius,
                relief_radius,
                relief_depth,
                slice_degrees,
                slice_rotation_degrees
            );
        }

        if (sliced) {
            slice_face_cream_grooves(radius, height, slice_degrees, slice_rotation_degrees);
            slice_face_cream_shell_grooves(radius, height, slice_degrees, slice_rotation_degrees);
        }

        if (Cutaway_preview) {
            translate([-radius - 2, -radius - 2, -1])
                cube([radius + 2, 2 * radius + 4, height + stud_height + 3]);
        }
    }
}


module cake_slice_clip(radius, height, slice_degrees, slice_rotation_degrees) {
    angle = clamp(slice_degrees, 1, 360);
    start_angle = slice_rotation_degrees - angle / 2;
    clip_radius = radius + max(stud_radius + 4, Side_pattern_depth + Side_pattern_size + 4);
    steps = max(2, ceil(curve_detail * angle / 360));

    translate([0, 0, -1])
        linear_extrude(height = height + stud_height + 3, convexity = 10)
            polygon(
                points = concat(
                    [[0, 0]],
                    [
                        for (step = [0 : steps])
                            [
                                clip_radius * cos(start_angle + angle * step / steps),
                                clip_radius * sin(start_angle + angle * step / steps)
                            ]
                    ]
                )
            );
}


module cake_sector_solid(radius, height, slice_degrees, slice_rotation_degrees) {
    linear_extrude(height = height, convexity = 10)
        cake_sector_2d(radius, slice_degrees, slice_rotation_degrees);
}


module cake_sector_2d(radius, slice_degrees, slice_rotation_degrees) {
    angle = clamp(slice_degrees, 1, 360);
    start_angle = slice_rotation_degrees - angle / 2;
    steps = max(2, ceil(curve_detail * angle / 360));

    polygon(
        points = concat(
            [[0, 0]],
            [
                for (step = [0 : steps])
                    [
                        radius * cos(start_angle + angle * step / steps),
                        radius * sin(start_angle + angle * step / steps)
                    ]
            ]
        )
    );
}


module cake_shell_with_reliefs(
    diameter_studs,
    radius,
    height,
    relief_radius,
    relief_depth,
    slice_degrees,
    slice_rotation_degrees
) {
    if (Partial_stud_reliefs) {
        difference() {
            cake_shell(radius, height, slice_degrees, slice_rotation_degrees);
            baseplate_stud_reliefs(
                diameter_studs,
                radius,
                relief_radius,
                relief_depth,
                slice_degrees,
                slice_rotation_degrees
            );
        }
    } else {
        cake_shell(radius, height, slice_degrees, slice_rotation_degrees);
    }
}


module cake_shell(radius, height, slice_degrees, slice_rotation_degrees) {
    if (slice_degrees < 360) {
        cake_sector_shell(radius, height, slice_degrees, slice_rotation_degrees);
    } else {
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
}


module cake_sector_shell(radius, height, slice_degrees, slice_rotation_degrees) {
    inner_radius = max(0.1, radius - wall_thickness);
    side_offset = min(wall_thickness, inner_radius - 0.1);
    inner_angle = max(0, slice_degrees - 2 * sector_wall_angle(inner_radius, side_offset));
    tip_radius = slice_center_closure_radius(radius);

    union() {
        difference() {
            cake_sector_solid(radius, height, slice_degrees, slice_rotation_degrees);

            if (inner_angle > 0.5) {
                translate([0, 0, -1])
                    cake_sector_cavity_solid(
                        inner_radius,
                        height - roof_thickness + 1.02,
                        slice_degrees,
                        slice_rotation_degrees,
                        tip_radius,
                        side_offset
                    );
            }
        }

        cake_sector_solid(tip_radius, height, slice_degrees, slice_rotation_degrees);
    }
}


module cake_sector_cavity_solid(radius, height, slice_degrees, slice_rotation_degrees, tip_radius, side_offset) {
    linear_extrude(height = height, convexity = 10)
        cake_sector_cavity_2d(radius, slice_degrees, slice_rotation_degrees, tip_radius, side_offset);
}


module cake_sector_cavity_2d(radius, slice_degrees, slice_rotation_degrees, tip_radius, side_offset) {
    angle = clamp(slice_degrees, 1, 360);
    start_angle = slice_rotation_degrees - angle / 2;
    end_angle = slice_rotation_degrees + angle / 2;
    side_angle = sector_wall_angle(radius, side_offset);
    arc_start_angle = start_angle + side_angle;
    arc_end_angle = end_angle - side_angle;
    arc_angle = arc_end_angle - arc_start_angle;
    steps = max(2, ceil(curve_detail * max(arc_angle, 1) / 360));
    start_tip = [
        tip_radius * cos(start_angle) - side_offset * sin(start_angle),
        tip_radius * sin(start_angle) + side_offset * cos(start_angle)
    ];
    end_tip = [
        tip_radius * cos(end_angle) + side_offset * sin(end_angle),
        tip_radius * sin(end_angle) - side_offset * cos(end_angle)
    ];

    polygon(
        points = concat(
            [start_tip],
            [
                for (step = [0 : steps])
                    [
                        radius * cos(arc_start_angle + arc_angle * step / steps),
                        radius * sin(arc_start_angle + arc_angle * step / steps)
                    ]
            ],
            [end_tip]
        )
    );
}


module slice_face_cream_grooves(radius, height, slice_degrees, slice_rotation_degrees) {
    core_layers = max(1, floor(Cake_core_layers));
    band_height = min(Cake_cream_layer_height, max(0.1, height / (core_layers + 1)));
    depth = slice_face_cream_depth();
    start_x = slice_face_groove_start_radius(radius);
    end_x = slice_face_groove_end_radius(radius);

    if (core_layers > 1 && band_height > 0 && depth > 0 && end_x > start_x + 0.2) {
        for (layer = [1 : core_layers - 1]) {
            z = height * layer / core_layers;
            slice_face_cream_groove(
                radius,
                slice_rotation_degrees - slice_degrees / 2,
                1,
                z,
                band_height,
                depth,
                start_x,
                end_x
            );
            slice_face_cream_groove(
                radius,
                slice_rotation_degrees + slice_degrees / 2,
                -1,
                z,
                band_height,
                depth,
                start_x,
                end_x
            );
        }
    }
}


module slice_face_cream_groove(radius, face_angle, interior_direction, z, band_height, depth, start_x, end_x) {
    groove_length = end_x - start_x;

    rotate([0, 0, face_angle])
        translate([start_x + groove_length / 2, interior_direction * depth / 2, z])
            cube([groove_length, depth + 0.04, band_height], center = true);
}


module slice_face_cream_shell_grooves(radius, height, slice_degrees, slice_rotation_degrees) {
    depth = slice_face_cream_depth();
    width = Slice_face_cream_shell_groove_width;

    if (depth > 0 && width > 0) {
        slice_face_cream_shell_top_groove(
            radius,
            slice_rotation_degrees - slice_degrees / 2,
            1,
            height,
            depth,
            width
        );
        slice_face_cream_shell_side_groove(
            radius,
            slice_rotation_degrees - slice_degrees / 2,
            1,
            height,
            depth,
            width
        );
        slice_face_cream_shell_top_groove(
            radius,
            slice_rotation_degrees + slice_degrees / 2,
            -1,
            height,
            depth,
            width
        );
        slice_face_cream_shell_side_groove(
            radius,
            slice_rotation_degrees + slice_degrees / 2,
            -1,
            height,
            depth,
            width
        );
    }
}


module slice_face_cream_shell_top_groove(radius, face_angle, interior_direction, height, depth, width) {
    start_x = slice_face_groove_start_radius(radius);
    end_x = slice_face_groove_end_radius(radius);
    groove_length = end_x - start_x;
    z = max(width / 2, height - roof_thickness);

    if (groove_length > 0.2) {
        rotate([0, 0, face_angle])
            translate([start_x + groove_length / 2, interior_direction * depth / 2, z])
                cube([groove_length, depth + 0.04, width], center = true);
    }
}


module slice_face_cream_shell_side_groove(radius, face_angle, interior_direction, height, depth, width) {
    x = slice_cream_shell_boundary_radius(radius);
    top_z = max(width / 2, height - roof_thickness);
    groove_height = max(0.1, top_z);

    rotate([0, 0, face_angle])
        translate([x, interior_direction * depth / 2, groove_height / 2])
            cube([width, depth + 0.04, groove_height + 0.04], center = true);
}


module bottom_clutch_tube_lattice(
    diameter_studs,
    radius,
    height,
    slice_degrees = 360,
    slice_rotation_degrees = 0
) {
    clutch_height = max(0.1, height - roof_thickness + 0.1);
    inner_radius = max(0.1, radius - wall_thickness + 0.05);
    support = height >= std_height ? 1 : 0;

    intersection() {
        bottom_clutch_footprint_clip(
            inner_radius,
            clutch_height,
            slice_degrees,
            slice_rotation_degrees
        );

        union() {
            if (diameter_studs <= 1) {
                single_stud_bottom_wall_ribs(inner_radius, clutch_height);
            } else if (slice_degrees < 360) {
                if (Slice_bottom_stud_clutches) {
                    if (
                        slice_bottom_wall_socket_count(
                            diameter_studs,
                            inner_radius,
                            slice_degrees,
                            slice_rotation_degrees
                        ) > 1
                    ) {
                        bottom_original_internal_cylinders(
                            diameter_studs,
                            inner_radius,
                            clutch_height,
                            support,
                            slice_degrees,
                            slice_rotation_degrees,
                            0
                        );
                        bottom_slice_center_wall(
                            radius,
                            clutch_height,
                            slice_degrees,
                            slice_rotation_degrees
                        );
                        bottom_slice_side_wall_clamps(
                            diameter_studs,
                            inner_radius,
                            clutch_height,
                            slice_degrees,
                            slice_rotation_degrees,
                            0
                        );
                        bottom_slice_outer_wall_clamps(
                            diameter_studs,
                            inner_radius,
                            clutch_height,
                            slice_degrees,
                            slice_rotation_degrees
                        );
                    } else {
                        bottom_small_slice_side_wall_clamps(
                            diameter_studs,
                            inner_radius,
                            clutch_height,
                            slice_degrees,
                            slice_rotation_degrees
                        );
                    }
                }
            } else {
                bottom_original_internal_cylinders(
                    diameter_studs,
                    inner_radius,
                    clutch_height,
                    support,
                    slice_degrees,
                    slice_rotation_degrees,
                    Edge_partial_tubes
                );
            }
        }
    }
}


module bottom_clutch_footprint_clip(
    inner_radius,
    clutch_height,
    slice_degrees,
    slice_rotation_degrees
) {
    if (slice_degrees < 360) {
        intersection() {
            cylinder(h = clutch_height, r = inner_radius, $fn = curve_detail);
            cake_slice_clip(inner_radius, clutch_height, slice_degrees, slice_rotation_degrees);
        }
    } else {
        cylinder(h = clutch_height, r = inner_radius, $fn = curve_detail);
    }
}


function clutch_tube_position(index, diameter_studs) =
    (index - (diameter_studs - 2) / 2) * base_unit;


module bottom_original_internal_cylinders(
    diameter_studs,
    inner_radius,
    clutch_height,
    support,
    slice_degrees,
    slice_rotation_degrees,
    allow_partial_tubes
) {
    for (ix = [-1 : diameter_studs - 1]) {
        for (iy = [-1 : diameter_studs - 1]) {
            x = clutch_tube_position(ix, diameter_studs);
            y = clutch_tube_position(iy, diameter_studs);
            full_tube = inside_round_footprint(x, y, inner_radius, cyl_radius);
            partial_tube = allow_partial_tubes &&
                overlaps_round_footprint(x, y, inner_radius, cyl_radius);
            fits_slice = anti_stud_tube_fits_slice(
                x,
                y,
                slice_degrees,
                slice_rotation_degrees
            );

            if ((full_tube || partial_tube) && fits_slice) {
                original_internal_cylinder(x, y, clutch_height, support);
            }
        }
    }
}


module bottom_slice_center_wall(radius, clutch_height, slice_degrees, slice_rotation_degrees) {
    cake_sector_solid(
        slice_center_closure_radius(radius),
        clutch_height,
        slice_degrees,
        slice_rotation_degrees
    );
}


module bottom_slice_side_wall_clamps(
    diameter_studs,
    inner_radius,
    clutch_height,
    slice_degrees,
    slice_rotation_degrees,
    require_paired_clamp = 0
) {
    for (face = [0 : 1]) {
        face_angle = face == 0 ?
            slice_rotation_degrees - slice_degrees / 2 :
            slice_rotation_degrees + slice_degrees / 2;
        interior_direction = face == 0 ? 1 : -1;

        for (ix = [0 : diameter_studs - 1]) {
            for (iy = [0 : diameter_studs - 1]) {
                x = grid_position(ix, diameter_studs);
                y = grid_position(iy, diameter_studs);

                if (
                    side_wall_clamp_candidate(
                        x,
                        y,
                        inner_radius,
                        slice_degrees,
                        slice_rotation_degrees,
                        face_angle,
                        interior_direction
                    ) &&
                    (
                        !require_paired_clamp ||
                        side_wall_clamp_candidate_count(
                            x,
                            y,
                            inner_radius,
                            slice_degrees,
                            slice_rotation_degrees
                        ) > 1
                    )
                ) {
                    side_wall_stud_clamp_rib(
                        x,
                        y,
                        face_angle,
                        interior_direction,
                        clutch_height
                    );
                }
            }
        }
    }
}


module bottom_slice_outer_wall_clamps(
    diameter_studs,
    inner_radius,
    clutch_height,
    slice_degrees,
    slice_rotation_degrees
) {
    for (ix = [0 : diameter_studs - 1]) {
        for (iy = [0 : diameter_studs - 1]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (
                outer_wall_clamp_candidate(
                    x,
                    y,
                    inner_radius,
                    slice_degrees,
                    slice_rotation_degrees
                )
            ) {
                outer_wall_stud_clamp_rib(x, y, inner_radius, clutch_height);
            }
        }
    }
}


module bottom_small_slice_side_wall_clamps(
    diameter_studs,
    inner_radius,
    clutch_height,
    slice_degrees,
    slice_rotation_degrees
) {
    for (ix = [0 : diameter_studs - 1]) {
        for (iy = [0 : diameter_studs - 1]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (
                small_slice_side_wall_clamp_target(
                    x,
                    y,
                    inner_radius,
                    slice_degrees,
                    slice_rotation_degrees
                )
            ) {
                side_wall_stud_clamp_rib(
                    x,
                    y,
                    slice_rotation_degrees - slice_degrees / 2,
                    1,
                    clutch_height
                );
                side_wall_stud_clamp_rib(
                    x,
                    y,
                    slice_rotation_degrees + slice_degrees / 2,
                    -1,
                    clutch_height
                );
                outer_wall_stud_clamp_rib(x, y, inner_radius, clutch_height);
            }
        }
    }
}


module side_wall_stud_clamp_rib(x, y, face_angle, interior_direction, clutch_height) {
    radial_x = radial_local_x(x, y, face_angle);
    inward_distance = radial_local_y(x, y, face_angle) * interior_direction;
    start_distance = side_wall_clamp_start_distance();
    end_distance = inward_distance - side_wall_clamp_stud_clearance();
    rib_length = max(0.1, end_distance - start_distance);
    wall_anchor_depth = min(rib_length, max(0.8, wall_thickness));
    wall_anchor_width = side_wall_clamp_tip_width();
    rib_width = wall_anchor_width;

    rotate([0, 0, face_angle])
        translate([
            radial_x,
            interior_direction * (start_distance + rib_length / 2),
            0
        ])
            rounded_wall_stud(rib_width, rib_length, clutch_height);

    rotate([0, 0, face_angle])
        translate([
            radial_x,
            interior_direction * (start_distance + wall_anchor_depth / 2),
            0
        ])
            rounded_wall_stud(wall_anchor_width, wall_anchor_depth, clutch_height);
}


module outer_wall_stud_clamp_rib(x, y, inner_radius, clutch_height) {
    stud_distance = sqrt(x * x + y * y);
    rib_angle = atan2(y, x);
    start_distance = outer_wall_clamp_anchor_distance(inner_radius);
    end_distance = stud_distance + side_wall_clamp_stud_clearance();
    rib_length = max(0.1, start_distance - end_distance);
    tip_depth = side_wall_clamp_tip_depth();
    tip_width = side_wall_clamp_tip_width();

    if (rib_length >= 0.6) {
        rotate([0, 0, rib_angle])
            translate([end_distance + rib_length / 2, 0, 0])
                rounded_wall_stud(rib_length, Slice_side_clamp_width, clutch_height);

        rotate([0, 0, rib_angle])
            translate([end_distance + tip_depth / 2, 0, 0])
                rounded_wall_stud(tip_depth, tip_width, clutch_height);
    }
}


module bottom_full_top_stud_clutches(
    diameter_studs,
    inner_radius,
    clutch_height,
    slice_degrees,
    slice_rotation_degrees
) {
    socket_radius = bottom_wall_socket_fit_radius();

    for (ix = [0 : diameter_studs - 1]) {
        for (iy = [0 : diameter_studs - 1]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (
                overlaps_round_footprint(x, y, inner_radius, socket_radius) &&
                inside_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, socket_radius)
            ) {
                translate([x, y, 0])
                    bottom_wall_stud_socket(clutch_height);
            }
        }
    }
}


function bottom_wall_socket_fit_radius() =
    sqrt(
        pow(stud_radius + Socket_clearance, 2) +
        pow(stud_radius + Socket_clearance + wall_thickness / 2, 2)
    );


function anti_stud_tube_fits_slice(
    x,
    y,
    slice_degrees,
    slice_rotation_degrees
) =
    slice_degrees < 360 ?
        overlaps_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, cyl_radius) :
        inside_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, cyl_radius);


function slice_bottom_wall_socket_count(
    diameter_studs,
    inner_radius,
    slice_degrees,
    slice_rotation_degrees
) =
    len([
        for (ix = [0 : diameter_studs - 1])
            for (iy = [0 : diameter_studs - 1])
                let(
                    x = grid_position(ix, diameter_studs),
                    y = grid_position(iy, diameter_studs),
                    socket_radius = bottom_wall_socket_fit_radius()
                )
                if (
                    overlaps_round_footprint(x, y, inner_radius, socket_radius) &&
                    inside_sector_footprint(
                        x,
                        y,
                        slice_degrees,
                        slice_rotation_degrees,
                        socket_radius
                    )
                )
                1
    ]);


function side_wall_clamp_stud_clearance() =
    stud_radius + Slice_side_clamp_clearance;

function side_wall_clamp_start_distance() =
    0;

function side_wall_clamp_tip_depth() =
    max(0.9, wall_thickness * 0.75);

function side_wall_clamp_tip_width() =
    max(Slice_side_clamp_width, wall_thickness * 1.8);

function outer_wall_clamp_anchor_distance(inner_radius) =
    inner_radius + max(0.2, wall_thickness * 0.5);

function outer_wall_clamp_visible_length(x, y, inner_radius) =
    inner_radius - (sqrt(x * x + y * y) + side_wall_clamp_stud_clearance());

function outer_wall_clamp_candidate(
    x,
    y,
    inner_radius,
    slice_degrees,
    slice_rotation_degrees
) =
    let(
        stud_clearance = side_wall_clamp_stud_clearance(),
        visible_length = outer_wall_clamp_visible_length(x, y, inner_radius)
    )
    overlaps_round_footprint(x, y, inner_radius, stud_clearance) &&
    inside_sector_footprint(
        x,
        y,
        slice_degrees,
        slice_rotation_degrees,
        stud_clearance
    ) &&
    visible_length >= 0.6 &&
    visible_length <= Slice_side_clamp_reach;

function side_wall_clamp_candidate(
    x,
    y,
    inner_radius,
    slice_degrees,
    slice_rotation_degrees,
    face_angle,
    interior_direction
) =
    let(
        stud_clearance = side_wall_clamp_stud_clearance(),
        radial_x = radial_local_x(x, y, face_angle),
        inward_distance = radial_local_y(x, y, face_angle) * interior_direction,
        start_distance = side_wall_clamp_start_distance(),
        end_distance = inward_distance - stud_clearance,
        rib_length = end_distance - start_distance
    )
    overlaps_round_footprint(x, y, inner_radius, stud_clearance) &&
    overlaps_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, stud_clearance) &&
    radial_x > stud_clearance * 0.5 &&
    radial_x < inner_radius + stud_clearance &&
    rib_length >= 0.6 &&
    rib_length <= Slice_side_clamp_reach;

function side_wall_clamp_candidate_count(
    x,
    y,
    inner_radius,
    slice_degrees,
    slice_rotation_degrees
) =
    len([
        for (face = [0 : 1])
            let(
                face_angle = face == 0 ?
                    slice_rotation_degrees - slice_degrees / 2 :
                    slice_rotation_degrees + slice_degrees / 2,
                interior_direction = face == 0 ? 1 : -1
            )
            if (
                side_wall_clamp_candidate(
                    x,
                    y,
                    inner_radius,
                    slice_degrees,
                    slice_rotation_degrees,
                    face_angle,
                    interior_direction
                )
            )
            1
    ]);

function small_slice_side_wall_clamp_target(
    x,
    y,
    inner_radius,
    slice_degrees,
    slice_rotation_degrees
) =
    side_wall_clamp_candidate(
        x,
        y,
        inner_radius,
        slice_degrees,
        slice_rotation_degrees,
        slice_rotation_degrees - slice_degrees / 2,
        1
    ) &&
    side_wall_clamp_candidate(
        x,
        y,
        inner_radius,
        slice_degrees,
        slice_rotation_degrees,
        slice_rotation_degrees + slice_degrees / 2,
        -1
    );


module single_stud_bottom_wall_ribs(inner_radius, clutch_height) {
    rib_height = min(clutch_height, short_wall_stud_height);

    for (angle = [0 : 90 : 270]) {
        single_stud_wall_clamp_rib(angle, inner_radius, rib_height);
    }
}


module single_stud_wall_clamp_rib(angle, inner_radius, rib_height) {
    start_distance = outer_wall_clamp_anchor_distance(inner_radius);
    end_distance = side_wall_clamp_stud_clearance();
    rib_length = max(0.1, start_distance - end_distance);
    rib_width = side_wall_clamp_tip_width();

    if (rib_length >= 0.6 && rib_height > 0.1) {
        rotate([0, 0, angle])
            translate([end_distance + rib_length / 2, 0, 0])
                rounded_wall_stud(rib_length, rib_width, rib_height);
    }
}


module bottom_wall_stud_socket(clutch_height, wall_length = 2 * (stud_radius + Socket_clearance)) {
    wall_height = clutch_height;

    for (angle = [0 : 90 : 270]) {
        rotate([0, 0, angle])
            translate([0, stud_radius + Socket_clearance, 0])
                rounded_wall_stud(wall_length, wall_thickness, wall_height);
    }
}


module rounded_wall_stud(length, thickness, height) {
    radius = min(rounded_corners, thickness / 2 - 0.02);

    if (radius <= 0) {
        cube([length, thickness, height], center = true);
    } else {
        linear_extrude(height = height, convexity = 10)
            offset(r = radius, $fn = corner_detail)
                offset(delta = -radius)
                    square([length, thickness], center = true);
    }
}


module original_internal_cylinder(x, y, height, support) {
    int_cyl_corner_radius = 0.6;

    translate([x, y, 0]) {
        difference() {
            union() {
                rotate_extrude($fn = curve_detail) {
                    union() {
                        translate([0, int_cyl_corner_radius])
                            square([cyl_radius, max(0.1, height - int_cyl_corner_radius)]);

                        square([max(0.1, cyl_radius - int_cyl_corner_radius), height]);

                        translate([
                            cyl_radius - int_cyl_corner_radius,
                            int_cyl_corner_radius,
                            0
                        ])
                            circle(r = int_cyl_corner_radius, $fn = corner_detail);
                    }
                }

                if (support >= 1) {
                    translate([0, 0, height]) {
                        rotate([-90, 0, 45])
                            linear_extrude(height = ridge_thickness, center = true)
                                polygon([[-base_unit * 0.7, 0], [base_unit * 0.7, 0], [0, 14]]);

                        rotate([-90, 0, -45])
                            linear_extrude(height = ridge_thickness, center = true)
                                polygon([[-base_unit * 0.7, 0], [base_unit * 0.7, 0], [0, 14]]);
                    }
                }
            }

            cylinder(
                h = height * 3,
                r = max(0.1, cyl_radius - cyl_thickness),
                center = true,
                $fn = curve_detail
            );

            if (internal_cylinder_cuts == 1) {
                cube(size = [cyl_radius * 2, 1, height + 2], center = true);
                cube(size = [1, cyl_radius * 2, height + 2], center = true);
            }
        }
    }
}


module baseplate_stud_reliefs(
    diameter_studs,
    radius,
    relief_radius,
    relief_depth,
    slice_degrees = 360,
    slice_rotation_degrees = 0
) {
    cut_radius = relief_radius + Socket_lead_in;

    for (ix = [-1 : diameter_studs]) {
        for (iy = [-1 : diameter_studs]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);
            round_wall_hit =
                overlaps_round_wall(x, y, radius, cut_radius) &&
                overlaps_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, cut_radius);
            radial_wall_hit =
                slice_degrees < 360 &&
                overlaps_round_footprint(x, y, radius, cut_radius) &&
                overlaps_sector_boundary(x, y, slice_degrees, slice_rotation_degrees, cut_radius);
            center_wall_hit =
                slice_degrees < 360 &&
                overlaps_round_footprint(
                    x,
                    y,
                    slice_center_closure_radius(radius),
                    cut_radius
                );

            if (round_wall_hit || radial_wall_hit || center_wall_hit) {
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


module original_top_studs(
    diameter_studs,
    height,
    radius,
    slice_degrees = 360,
    slice_rotation_degrees = 0
) {
    top_fit_margin = stud_radius + Top_edge_clearance;

    for (ix = [0 : diameter_studs - 1]) {
        for (iy = [0 : diameter_studs - 1]) {
            x = grid_position(ix, diameter_studs);
            y = grid_position(iy, diameter_studs);

            if (
                inside_round_footprint(x, y, radius, top_fit_margin) &&
                inside_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, top_fit_margin)
            ) {
                stud_extruded(x, y, height, top_stud_radius());
            }
        }
    }
}


function grid_position(index, count) = (index - (count - 1) / 2) * base_unit;

function top_stud_radius() =
    max(stud_wall_thickness + 0.2, stud_radius + Stud_radius_compensation);

function slice_face_cream_depth() =
    min(
        Slice_face_cream_groove_depth,
        Slice_face_cream_shell_groove_depth,
        wall_thickness * 0.25
    );

function slice_cream_shell_boundary_radius(radius) =
    max(0.1, radius - wall_thickness);

function slice_face_groove_join_overlap() =
    max(0.08, slice_face_cream_depth() + 0.03);

function slice_face_groove_center_overlap() =
    min(0.1, max(0.04, slice_face_cream_depth() * 0.35));

function slice_face_groove_end_radius(radius) =
    min(radius + 0.05, slice_cream_shell_boundary_radius(radius) + slice_face_groove_join_overlap());

function slice_center_closure_radius(radius) =
    min(
        max(0.1, slice_cream_shell_boundary_radius(radius) - 0.2),
        max(wall_thickness * 3, stud_radius + Socket_clearance + wall_thickness)
    );

function slice_face_groove_start_radius(radius) =
    -slice_face_groove_center_overlap();

function sector_wall_angle(inner_radius, thickness) =
    inner_radius > 0 ? asin(min(1, thickness / inner_radius)) : 90;

function angle_delta(angle, center) = ((angle - center + 540) % 360) - 180;

function radial_local_x(x, y, angle) =
    x * cos(angle) + y * sin(angle);

function radial_local_y(x, y, angle) =
    -x * sin(angle) + y * cos(angle);

function inside_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, margin) =
    slice_degrees >= 360 ? true :
    let(
        distance = sqrt(x * x + y * y),
        angular_margin = distance > margin ? asin(min(1, margin / distance)) : 180
    )
    abs(angle_delta(atan2(y, x), slice_rotation_degrees)) + angular_margin <=
        slice_degrees / 2 + 0.001;

function overlaps_sector_footprint(x, y, slice_degrees, slice_rotation_degrees, margin) =
    slice_degrees >= 360 ? true :
    let(
        distance = sqrt(x * x + y * y),
        angular_margin = distance > margin ? asin(min(1, margin / distance)) : 180
    )
    abs(angle_delta(atan2(y, x), slice_rotation_degrees)) - angular_margin <=
        slice_degrees / 2 + 0.001;

function overlaps_sector_boundary(x, y, slice_degrees, slice_rotation_degrees, margin) =
    slice_degrees >= 360 ? false :
    let(
        distance = sqrt(x * x + y * y),
        angular_margin = distance > margin ? asin(min(1, margin / distance)) : 180,
        delta = abs(angle_delta(atan2(y, x), slice_rotation_degrees))
    )
    delta + angular_margin >= slice_degrees / 2 - 0.001 &&
    delta - angular_margin <= slice_degrees / 2 + 0.001;

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
