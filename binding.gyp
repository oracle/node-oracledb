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
    "include_dirs"  : [ "src/dpic/include",
                      "<!(node -e \"require('nan')\")"
    ],
    "libraries" : ['-ldpi'],
    "conditions" : [
    [
      'OS=="linux"', {
        "cflags"        : ['-fexceptions'],
        "cflags_cc"     : ['-fexceptions'],
        "link_settings" : {
            "libraries" : [ '-L $(srcdir)/src/dpic/src' ]
        },
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
        "libraries"     : ["-ldpi"],
        "link_settings" : {
           "libraries"  : ['-L $(srcdir)/src/dpic/src']
        }
      }
    ],
    [
      'OS=="aix"', {
          "libraries"     : ["-ldpi"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "link_settings" : {
          "libraries"     : ['-L $(srcdir)/src/dpic/src']
        }
      }
    ],
    [
      'OS=="solaris"', {
          "libraries"     : ["-ldpi"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "link_settings" : {
             "libraries"  : ['-L $(srcdir)/src/dpic/src']
        }
      }
    ],
    [
      "OS=='win'", {
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
                    "$(srcdir)/src/dpic/src"
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
                          "$(srcdir)/src/dpic/src"
                      ]
                  }
              }
          }
        }
      }
    ],
  ],
  }
  ]
}
