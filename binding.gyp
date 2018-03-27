{
  "targets": [
  {
    "target_name" : "oracledb",
    "sources" : [
             "src/njsCommon.cpp",
             "src/njsOracle.cpp",
             "src/njsPool.cpp",
             "src/njsConnection.cpp",
             "src/njsResultSet.cpp",
             "src/njsMessages.cpp",
             "src/njsIntLob.cpp",
             "odpi/src/dpiConn.c",
             "odpi/src/dpiContext.c",
             "odpi/src/dpiData.c",
             "odpi/src/dpiDebug.c",
             "odpi/src/dpiDeqOptions.c",
             "odpi/src/dpiEnqOptions.c",
             "odpi/src/dpiEnv.c",
             "odpi/src/dpiError.c",
             "odpi/src/dpiGen.c",
             "odpi/src/dpiGlobal.c",
             "odpi/src/dpiHandleList.c",
             "odpi/src/dpiHandlePool.c",
             "odpi/src/dpiLob.c",
             "odpi/src/dpiMsgProps.c",
             "odpi/src/dpiObjectAttr.c",
             "odpi/src/dpiObject.c",
             "odpi/src/dpiObjectType.c",
             "odpi/src/dpiOci.c",
             "odpi/src/dpiOracleType.c",
             "odpi/src/dpiPool.c",
             "odpi/src/dpiRowid.c",
             "odpi/src/dpiStmt.c",
             "odpi/src/dpiSubscr.c",
             "odpi/src/dpiUtils.c",
             "odpi/src/dpiVar.c"
    ],
    "conditions" : [
    [
      'OS=="linux"', {
        "variables" : {
          "dpi_check%"    : "<!(INSTURL=\"https://oracle.github.io/node-oracledb/INSTALL.html#github\"; ERR=\"oracledb ERR! Error:\"; if [ -f odpi/include/dpi.h ]; then echo \"Has dpi.h\"; else echo \"$ERR Cannot find odpi/include/dpi.h.  For GitHub ZIP downloads you must separately download the odpi subdirectory from GitHub.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi;)"
        },
        "cflags"        : ['-fexceptions'],
        "cflags_cc"     : ['-fexceptions'],
        "libraries"     : ['-ldl', '-lpthread'],
      }
    ],
    [
      'OS=="mac"', {
        "variables" : {
          "dpi_check%"    : "<!(INSTURL=\"https://oracle.github.io/node-oracledb/INSTALL.html#github\"; ERR=\"oracledb ERR! Error:\"; if [ -f odpi/include/dpi.h ]; then echo \"Has dpi.h\"; else echo \"$ERR Cannot find odpi/include/dpi.h.  For GitHub ZIP downloads you must separately download the odpi subdirectory from GitHub.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi;)"
        },
        "xcode_settings": {
          "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
          "GCC_ENABLE_CPP_RTTI": "YES"
        },
          "libraries"     : ['-ldl', '-lpthread']
      }
    ],
    [
      'OS=="aix"', {
        "variables" : {
          "dpi_check%"    : "<!(INSTURL=\"https://oracle.github.io/node-oracledb/INSTALL.html#github\"; ERR=\"oracledb ERR! Error:\"; if [ -f odpi/include/dpi.h ]; then echo \"Has dpi.h\"; else echo \"$ERR Cannot find odpi/include/dpi.h.  For GitHub ZIP downloads you must separately download the odpi subdirectory from GitHub.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi;)"
        },
        "cflags"        : ['-fexceptions', '-fsigned-char'],
        "cflags_cc"     : ['-fexceptions', '-fsigned-char'],
        "libraries"     : ['-ldl', '-lpthread'],
      }
    ],
    [
      'OS=="solaris"', {
        "variables" : {
          "dpi_check%"    : "<!(INSTURL=\"https://oracle.github.io/node-oracledb/INSTALL.html#github\"; ERR=\"oracledb ERR! Error:\"; if [ -f odpi/include/dpi.h ]; then echo \"Has dpi.h\"; else echo \"$ERR Cannot find odpi/include/dpi.h.  For GitHub ZIP downloads you must separately download the odpi subdirectory from GitHub.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi;)"
        },
        "cflags"        : ['-fexceptions'],
        "cflags_cc"     : ['-fexceptions'],
        "libraries"     : ['-ldl', '-lpthread'],
      }
    ],
    [
      "OS=='win'", {
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
                  }
              }
          }
        }
      }
    ],
  ],
  "include_dirs"  : [ "odpi/src/",
                      "odpi/include/",
                      "<!(node -e \"require('nan')\")"
    ],
  }
  ]
}
