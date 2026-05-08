foreach(REQUIRED_VAR IN ITEMS CATALOG_OUTPUT_PATH SOURCE_ROOT)
    if(NOT DEFINED ${REQUIRED_VAR})
        message(FATAL_ERROR "${REQUIRED_VAR} is required")
    endif()
endforeach()

find_package(Python3 REQUIRED COMPONENTS Interpreter)

execute_process(
    COMMAND
        "${Python3_EXECUTABLE}"
        "${CMAKE_CURRENT_LIST_DIR}/generate_catalog.py"
        "--output"
        "${CATALOG_OUTPUT_PATH}"
        "--source-root"
        "${SOURCE_ROOT}"
    RESULT_VARIABLE GENERATE_CATALOG_RESULT
)

if(NOT GENERATE_CATALOG_RESULT EQUAL 0)
    message(FATAL_ERROR "Catalog generation failed")
endif()
