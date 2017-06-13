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
             "src/njs/src/njsIntLob.cpp",
             "odpi/src/dpiConn.c",
             "odpi/src/dpiContext.c",
             "odpi/src/dpiData.c",
             "odpi/src/dpiDeqOptions.c",
             "odpi/src/dpiEnqOptions.c",
             "odpi/src/dpiEnv.c",
             "odpi/src/dpiError.c",
             "odpi/src/dpiErrorMessages.h",
             "odpi/src/dpiGen.c",
             "odpi/src/dpiGlobal.c",
             "odpi/src/dpiImpl.h",
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
        "cflags"        : ['-fexceptions'],
        "cflags_cc"     : ['-fexceptions'],
        "libraries"     : ["-ldl"]
      }
    ],
    [
      'OS=="mac"', {
        "xcode_settings": {
          "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
          "GCC_ENABLE_CPP_RTTI": "YES"
        },
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "libraries"     : ["-ldl"]
      }
    ],
    [
      'OS=="aix"', {
          "libraries"     : ["-ldl"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
      }
    ],
    [
      'OS=="solaris"', {
          "libraries"     : ["-ldl"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions']
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
