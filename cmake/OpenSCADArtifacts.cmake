set(ARTIFACT_DIR "${CMAKE_SOURCE_DIR}/dist" CACHE PATH "Directory for generated STL and image artifacts")
set(OPENSCAD_IMAGE_SIZE "1200,900" CACHE STRING "Rendered PNG size as width,height")
set(OPENSCAD_CAMERA "0,0,0,60,0,45,140" CACHE STRING "OpenSCAD camera as translate_x,y,z,rot_x,y,z,dist")
option(OPENSCAD_BUILD_IMAGES "Build rendered PNG image artifacts" ON)
option(OPENSCAD_RENDER_IMAGES "Use full CGAL render for PNG exports" ON)
option(OPENSCAD_HARDWARNINGS "Treat OpenSCAD warnings as errors" OFF)
option(OPENSCAD_USE_XVFB "Run OpenSCAD through xvfb-run, useful for headless Linux PNG exports" OFF)

if(DEFINED ENV{OPENSCAD_EXECUTABLE} AND NOT "$ENV{OPENSCAD_EXECUTABLE}" STREQUAL "")
    set(
        OPENSCAD_EXECUTABLE
        "$ENV{OPENSCAD_EXECUTABLE}"
        CACHE FILEPATH
        "Path to the OpenSCAD command-line executable"
        FORCE
    )
endif()

find_program(
    OPENSCAD_EXECUTABLE
    NAMES openscad openscad.com openscad.exe OpenSCAD
    PATHS
        "/Applications/OpenSCAD.app/Contents/MacOS"
        "/Applications/OpenSCAD-nightly.app/Contents/MacOS"
    DOC "Path to the OpenSCAD command-line executable"
    REQUIRED
)

if(NOT EXISTS "${OPENSCAD_EXECUTABLE}")
    message(FATAL_ERROR "OpenSCAD executable does not exist: ${OPENSCAD_EXECUTABLE}")
endif()

set(OPENSCAD_COMMAND "${OPENSCAD_EXECUTABLE}")
if(OPENSCAD_USE_XVFB)
    find_program(XVFB_RUN_EXECUTABLE NAMES xvfb-run REQUIRED)
    set(OPENSCAD_COMMAND "${XVFB_RUN_EXECUTABLE}" -a "${OPENSCAD_EXECUTABLE}")
endif()

set(STL_DIR "${ARTIFACT_DIR}/stl")
set(IMAGE_DIR "${ARTIFACT_DIR}/images")

set(OPENSCAD_COMMON_ARGS)
if(OPENSCAD_HARDWARNINGS)
    list(APPEND OPENSCAD_COMMON_ARGS --hardwarnings)
endif()

set(OPENSCAD_IMAGE_ARGS
    --autocenter
    --viewall
    --projection=ortho
    "--camera=${OPENSCAD_CAMERA}"
    "--imgsize=${OPENSCAD_IMAGE_SIZE}"
)
if(OPENSCAD_RENDER_IMAGES)
    list(APPEND OPENSCAD_IMAGE_ARGS --render)
endif()

define_property(GLOBAL PROPERTY OPENSCAD_STL_OUTPUTS)
define_property(GLOBAL PROPERTY OPENSCAD_IMAGE_OUTPUTS)

function(add_openscad_model MODEL_FILE PRESET_FILE)
    cmake_parse_arguments(ARG "" "" "PRESETS" ${ARGN})
    get_filename_component(MODEL_PATH "${MODEL_FILE}" ABSOLUTE BASE_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
    get_filename_component(PRESET_PATH "${PRESET_FILE}" ABSOLUTE BASE_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
    get_filename_component(MODEL_NAME "${MODEL_PATH}" NAME_WE)

    if(NOT EXISTS "${MODEL_PATH}")
        message(FATAL_ERROR "OpenSCAD model not found: ${MODEL_PATH}")
    endif()

    if(NOT EXISTS "${PRESET_PATH}")
        message(FATAL_ERROR "OpenSCAD preset file not found: ${PRESET_PATH}")
    endif()

    if(NOT ARG_PRESETS)
        file(READ "${PRESET_PATH}" PRESET_JSON)
        string(JSON PRESET_COUNT LENGTH "${PRESET_JSON}" parameterSets)

        if(PRESET_COUNT EQUAL 0)
            message(FATAL_ERROR "OpenSCAD preset file has no parameterSets: ${PRESET_PATH}")
        endif()

        math(EXPR LAST_PRESET_INDEX "${PRESET_COUNT} - 1")
        foreach(PRESET_INDEX RANGE 0 ${LAST_PRESET_INDEX})
            string(JSON PRESET_NAME MEMBER "${PRESET_JSON}" parameterSets ${PRESET_INDEX})
            list(APPEND ARG_PRESETS "${PRESET_NAME}")
        endforeach()
    endif()

    file(GLOB_RECURSE MODEL_SCAD_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/*.scad")

    foreach(PRESET IN LISTS ARG_PRESETS)
        set(STL_OUTPUT "${STL_DIR}/${MODEL_NAME}.${PRESET}.stl")
        set(IMAGE_OUTPUT "${IMAGE_DIR}/${MODEL_NAME}.${PRESET}.png")

        add_custom_command(
            OUTPUT "${STL_OUTPUT}"
            COMMAND "${CMAKE_COMMAND}" -E make_directory "${STL_DIR}"
            COMMAND ${OPENSCAD_COMMAND}
                ${OPENSCAD_COMMON_ARGS}
                --export-format asciistl
                -o "${STL_OUTPUT}"
                -p "${PRESET_PATH}"
                -P "${PRESET}"
                "${MODEL_PATH}"
            DEPENDS "${MODEL_PATH}" "${PRESET_PATH}" ${MODEL_SCAD_SOURCES}
            COMMENT "Exporting STL ${MODEL_NAME}.${PRESET}"
            VERBATIM
            COMMAND_EXPAND_LISTS
        )

        add_custom_command(
            OUTPUT "${IMAGE_OUTPUT}"
            COMMAND "${CMAKE_COMMAND}" -E make_directory "${IMAGE_DIR}"
            COMMAND ${OPENSCAD_COMMAND}
                ${OPENSCAD_COMMON_ARGS}
                ${OPENSCAD_IMAGE_ARGS}
                -o "${IMAGE_OUTPUT}"
                -p "${PRESET_PATH}"
                -P "${PRESET}"
                "${MODEL_PATH}"
            DEPENDS "${MODEL_PATH}" "${PRESET_PATH}" ${MODEL_SCAD_SOURCES}
            COMMENT "Rendering PNG ${MODEL_NAME}.${PRESET}"
            VERBATIM
            COMMAND_EXPAND_LISTS
        )

        add_custom_target("${MODEL_NAME}.${PRESET}.stl" DEPENDS "${STL_OUTPUT}")

        set_property(GLOBAL APPEND PROPERTY OPENSCAD_STL_OUTPUTS "${STL_OUTPUT}")

        if(OPENSCAD_BUILD_IMAGES)
            add_custom_target("${MODEL_NAME}.${PRESET}.png" DEPENDS "${IMAGE_OUTPUT}")
            set_property(GLOBAL APPEND PROPERTY OPENSCAD_IMAGE_OUTPUTS "${IMAGE_OUTPUT}")
        endif()
    endforeach()
endfunction()

function(add_openscad_artifact_targets)
    get_property(ALL_STL_OUTPUTS GLOBAL PROPERTY OPENSCAD_STL_OUTPUTS)
    get_property(ALL_IMAGE_OUTPUTS GLOBAL PROPERTY OPENSCAD_IMAGE_OUTPUTS)

    if(ALL_STL_OUTPUTS)
        add_custom_target(stl DEPENDS ${ALL_STL_OUTPUTS})
    else()
        add_custom_target(stl)
    endif()

    if(ALL_IMAGE_OUTPUTS)
        add_custom_target(images DEPENDS ${ALL_IMAGE_OUTPUTS})
    else()
        add_custom_target(images)
    endif()

    if(ALL_STL_OUTPUTS OR ALL_IMAGE_OUTPUTS)
        add_custom_target(artifacts ALL DEPENDS ${ALL_STL_OUTPUTS} ${ALL_IMAGE_OUTPUTS})
    else()
        add_custom_target(artifacts ALL)
    endif()

    message(STATUS "OpenSCAD executable: ${OPENSCAD_EXECUTABLE}")
    message(STATUS "Artifact directory: ${ARTIFACT_DIR}")
    message(STATUS "Build image artifacts: ${OPENSCAD_BUILD_IMAGES}")
endfunction()

function(add_pages_site SITE_SOURCE_DIR)
    get_filename_component(SITE_SOURCE_PATH "${SITE_SOURCE_DIR}" ABSOLUTE BASE_DIR "${CMAKE_SOURCE_DIR}")
    set(PAGES_BUILD_DIR "${CMAKE_BINARY_DIR}/pages" CACHE PATH "Directory for assembled GitHub Pages site")

    if(NOT EXISTS "${SITE_SOURCE_PATH}")
        message(FATAL_ERROR "Pages source directory not found: ${SITE_SOURCE_PATH}")
    endif()

    add_custom_target(
        catalog
        COMMAND "${CMAKE_COMMAND}" -E make_directory "${CMAKE_BINARY_DIR}/generated"
        COMMAND "${CMAKE_COMMAND}"
            "-DCATALOG_OUTPUT_PATH=${CMAKE_BINARY_DIR}/generated/catalog.json"
            "-DSOURCE_ROOT=${CMAKE_SOURCE_DIR}"
            -P "${CMAKE_SOURCE_DIR}/cmake/GenerateCatalog.cmake"
        COMMENT "Generating model catalog"
        VERBATIM
    )

    add_custom_target(
        pages
        COMMAND "${CMAKE_COMMAND}"
            "-DSITE_SOURCE_PATH=${SITE_SOURCE_PATH}"
            "-DARTIFACT_DIR=${ARTIFACT_DIR}"
            "-DPAGES_BUILD_DIR=${PAGES_BUILD_DIR}"
            "-DSOURCE_ROOT=${CMAKE_SOURCE_DIR}"
            -P "${CMAKE_SOURCE_DIR}/cmake/AssemblePages.cmake"
        COMMAND "${CMAKE_COMMAND}"
            "-DCATALOG_OUTPUT_PATH=${PAGES_BUILD_DIR}/catalog.json"
            "-DSOURCE_ROOT=${CMAKE_SOURCE_DIR}"
            -P "${CMAKE_SOURCE_DIR}/cmake/GenerateCatalog.cmake"
        DEPENDS artifacts
        COMMENT "Assembling GitHub Pages site"
        VERBATIM
    )
endfunction()
