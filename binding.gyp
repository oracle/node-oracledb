{
  "targets": [
  {
    "target_name" : "oracledb",
    "sources" : [
             "src/njs/src/njsCommon.cpp",
             "src/njs/src/njsOracle.cpp",
             "src/njs/src/njsPool.cpp",
             "src/njs/src/njsConnection.cpp",
             "src/njs/src/njsResultSet.cpp",
             "src/njs/src/njsMessages.cpp",
             "src/njs/src/njsIntLob.cpp"
    ],
    "conditions" : [
    [
      'OS=="linux"', {
        "variables" : {
          "dpi_inc_dir%" : "$(DPI_INC_DIR)",
          "dpi_lib_dir%" : "$(DPI_LIB_DIR)",
        },
        "cflags"        : ['-fexceptions'],
        "cflags_cc"     : ['-fexceptions'],
        "libraries"     : ["-ldpi"],
        "link_settings" : {
           "libraries"  : ['-L<(dpi_lib_dir)']
        }
      }
    ],
    [
      'OS=="mac"', {
        "xcode_settings": {
          "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
          "GCC_ENABLE_CPP_RTTI": "YES"
        },
        "variables" : {
          "dpi_inc_dir%" : "$(DPI_INC_DIR)",
          "dpi_lib_dir%" : "$(DPI_LIB_DIR)",
          },
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "libraries"     : ["-ldpi"],
          "link_settings" : {
             "libraries"  : ['-L<(dpi_lib_dir)']
        }
      }
    ],
    [
      'OS=="aix"', {
        "variables" : {
          "dpi_inc_dir%" : "$(DPI_INC_DIR)",
          "dpi_lib_dir%" : "$(DPI_LIB_DIR)",
          },
          "libraries"     : ["-ldpi"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "link_settings" : {
             "libraries"  : ['-L<(dpi_lib_dir)']
        }
      }
    ],
    [
      'OS=="solaris"', {
        "variables" : {
          "dpi_inc_dir%" : "$(DPI_INC_DIR)",
          "dpi_lib_dir%" : "$(DPI_LIB_DIR)",
          },
          "libraries"     : ["-ldpi"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "link_settings" : {
             "libraries"  : ['-L<(dpi_lib_dir)']
        }
      }
    ],
    [
      "OS=='win'", {
        "variables" : {
          "dpi_inc_dir%" : "$(DPI_INC_DIR)",
          "dpi_lib_dir%" : "$(DPI_LIB_DIR)",
        },
        "link_settings": {
             "libraries": [
                 "-ldpi",
             ]
         },
        "configurations" : {
          "Release" : {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "RuntimeLibrary": 0,
                "Optimization": 3,
                "FavorSizeOrSpeed": 1,
                "InlineFunctionExpansion": 2,
                "WholeProgramOptimization": "true",
                "OmitFramePointers": "true",
                "EnableFunctionLevelLinking": "true",
                "EnableIntrinsicFunctions": "true",
                "RuntimeTypeInfo": "false",
                "PreprocessorDefinitions": [
                  "WIN32_LEAN_AND_MEAN"
                ],
                "ExceptionHandling": "0",
                "AdditionalOptions": [
                  "/EHsc"
                ]
              },
              "VCLibrarianTool": {
                "AdditionalOptions": [
                    "/LTCG"
                ]
              },
              "VCLinkerTool": {
                "LinkTimeCodeGeneration": 1,
                "OptimizeReferences": 2,
                "EnableCOMDATFolding": 2,
                "LinkIncremental": 1,
                "AdditionalLibraryDirectories": [
                    "<(dpi_lib_dir)"
                ]
              }
            }
          },
          "Debug": {
              "msvs_settings": {
                  "VCCLCompilerTool": {
                    "PreprocessorDefinitions": [
                      "WIN32_LEAN_AND_MEAN"
                    ],
                    "ExceptionHandling": "0",
                    "AdditionalOptions": [
                        "/EHsc"
                    ]
                  },
                  "VCLibrarianTool": {
                      "AdditionalOptions": [
                          "/LTCG"
                      ]
                  },
                  "VCLinkerTool": {
                      "LinkTimeCodeGeneration": 1,
                      "LinkIncremental": 1,
                      "AdditionalLibraryDirectories": [
                          "<(dpi_lib_dir)"
                      ]
                  }
              }
          }
        }
      }
    ],
  ],
  "include_dirs"  : [ "<(dpi_inc_dir)",
                      "<!(node -e \"require('nan')\")"
    ],
  }
  ]
}
