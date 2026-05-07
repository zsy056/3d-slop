cmake_minimum_required(VERSION 3.21)

project(3d_slop NONE)

include(cmake/OpenSCADArtifacts.cmake)

add_subdirectory(d-bricks)

add_openscad_artifact_targets()
add_pages_site(site)
