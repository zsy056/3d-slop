foreach(REQUIRED_VAR IN ITEMS SITE_SOURCE_PATH ARTIFACT_DIR PAGES_BUILD_DIR SOURCE_ROOT)
    if(NOT DEFINED ${REQUIRED_VAR})
        message(FATAL_ERROR "${REQUIRED_VAR} is required")
    endif()
endforeach()

if(NOT EXISTS "${SITE_SOURCE_PATH}")
    message(FATAL_ERROR "Pages source directory not found: ${SITE_SOURCE_PATH}")
endif()

if(NOT EXISTS "${ARTIFACT_DIR}")
    message(FATAL_ERROR "Artifact directory not found: ${ARTIFACT_DIR}")
endif()

file(MAKE_DIRECTORY "${PAGES_BUILD_DIR}")

file(
    GLOB PAGE_CHILDREN
    LIST_DIRECTORIES true
    "${PAGES_BUILD_DIR}/*"
    "${PAGES_BUILD_DIR}/.[!.]*"
    "${PAGES_BUILD_DIR}/..?*"
)

foreach(PAGE_CHILD IN LISTS PAGE_CHILDREN)
    file(REMOVE_RECURSE "${PAGE_CHILD}")
endforeach()

file(COPY "${SITE_SOURCE_PATH}/" DESTINATION "${PAGES_BUILD_DIR}")
file(COPY "${ARTIFACT_DIR}/" DESTINATION "${PAGES_BUILD_DIR}/dist")
