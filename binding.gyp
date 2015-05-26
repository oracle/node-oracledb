{
  "targets": [
  {
    "target_name" : "oracledb",
    "sources" : [
             "src/njs/src/njsOracle.cpp",
             "src/njs/src/njsPool.cpp",
             "src/njs/src/njsConnection.cpp",
             "src/njs/src/njsMessages.cpp",
             "src/dpi/src/dpiEnv.cpp",
             "src/dpi/src/dpiEnvImpl.cpp",
             "src/dpi/src/dpiException.cpp",
             "src/dpi/src/dpiExceptionImpl.cpp",
             "src/dpi/src/dpiConnImpl.cpp",
             "src/dpi/src/dpiDateTimeArrayImpl.cpp",
             "src/dpi/src/dpiPoolImpl.cpp",
             "src/dpi/src/dpiStmtImpl.cpp",
             "src/dpi/src/dpiUtils.cpp"
    ],
    "conditions" : [
    [
      'OS=="linux"', {
        "variables" : {
        "oci_inc_dir%" : "<!(if [ -z $OCI_INC_DIR ]; then OCI_LIB_DIR=`ls -d /usr/lib/oracle/*/client*/lib/libclntsh.* 2> /dev/null | tail -1 | sed -e 's#/libclntsh[^/]*##'`; if [ -z $OCI_LIB_DIR ]; then if [ -d \"$ORACLE_HOME\" ]; then echo $ORACLE_HOME/rdbms/public; else echo \"/opt/oracle/instantclient/sdk/include/\"; fi; else OCI_INC_DIR=`echo $OCI_LIB_DIR | sed -e 's!^/usr/lib/oracle/\(.*\)/client\([64]*\)*/lib[/]*$!/usr/include/oracle/\\1/client\\2!'`; if [ -z $OCI_INC_DIR ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo $OCI_INC_DIR; fi; fi; else echo $OCI_INC_DIR; fi;)",
        "oci_lib_dir%" : "<!(if [ -z $OCI_LIB_DIR ]; then OCI_LIB_DIR=`ls -d /usr/lib/oracle/*/client*/lib/libclntsh.* 2> /dev/null | tail -1 | sed -e 's#/libclntsh[^/]*##'`; if [ -z $OCI_LIB_DIR ]; then if [ -d \"$ORACLE_HOME\" ]; then echo $ORACLE_HOME/lib; else echo \"/opt/oracle/instantclient/\"; fi; else echo $OCI_LIB_DIR; fi; else echo $OCI_LIB_DIR; fi;)",
        "oci_rpath%" : "<!(if [ -z $OCI_LIB_DIR ]; then OCI_LIB_DIR=`ls -d /usr/lib/oracle/*/client*/lib/libclntsh.* 2> /dev/null | tail -1 | sed -e 's#/libclntsh[^/]*##'`; if [ -z $OCI_LIB_DIR ]; then if [ -d \"$ORACLE_HOME\" ]; then if [ -z \"${FORCE_RPATH+x}\" ]; then echo \"\"; else echo \"-Wl,-rpath,$ORACLE_HOME/lib\"; fi; else if [ -z \"${FORCE_RPATH+x}\" ]; then echo \"\"; else echo \"-Wl,-rpath,/opt/oracle/instantclient\"; fi; fi; else echo \"-Wl,-rpath,$OCI_LIB_DIR\"; fi; else if [ -z \"${FORCE_RPATH+x}\" ]; then echo \"\"; else echo \"-Wl,-rpath,$OCI_LIB_DIR\"; fi; fi;)",
        },
        "cflags"        : ['-fexceptions'],
        "cflags_cc"     : ['-fexceptions'],
        "libraries"     : ["-lclntsh"],
        "link_settings" : {
           "libraries"  : ['-L<(oci_lib_dir) <(oci_rpath)']
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
          "oci_inc_dir%" : "<!(if [ -z $OCI_INC_DIR ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo $OCI_INC_DIR; fi)",
          "oci_lib_dir%" : "<!(if [ -z $OCI_LIB_DIR ]; then echo \"/opt/oracle/instantclient/\"; else echo $OCI_LIB_DIR; fi)",
          },
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "libraries"     : ["-lclntsh"],
          "link_settings" : {
             "libraries"  : ['-L<(oci_lib_dir)']
        }
      }
    ],
    [
      'OS=="aix"', {
        "variables" : {
          "oci_inc_dir%" : '<!(echo ${OCI_INC_DIR:="/opt/oracle/instantclient/sdk/include/"})',
          "oci_lib_dir%" : '<!(echo ${OCI_LIB_DIR:="/opt/oracle/instantclient/"})',
          },
          "libraries"     : ["-lclntsh"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "link_settings" : {
             "libraries"  : ['-L<(oci_lib_dir)']
        }
      }
    ],
    [
      'OS=="solaris"', {
        "variables" : {
          "oci_inc_dir%" : "<!(if [ -z $OCI_INC_DIR ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo $OCI_INC_DIR; fi)",
          "oci_lib_dir%" : "<!(if [ -z $OCI_LIB_DIR ]; then echo \"/opt/oracle/instantclient/\"; else echo $OCI_LIB_DIR; fi)",
          },
          "libraries"     : ["-lclntsh"],
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "link_settings" : {
             "libraries"  : ['-L<(oci_lib_dir)']
        }
      }
    ],
    [
      "OS=='win'", {
        "variables" : {
          "oci_lib_dir%": "<!(IF DEFINED OCI_LIB_DIR (echo %OCI_LIB_DIR%) ELSE (echo C:\oracle\instantclient\sdk\lib\msvc))", 
          "oci_inc_dir%": "<!(IF DEFINED OCI_INC_DIR (echo %OCI_INC_DIR%) ELSE (echo C:\oracle\instantclient\sdk\include))", 
        },
        "link_settings": {
             "libraries": [
                 "-loci",
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
                    "<(oci_lib_dir)"
                ]
              }
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
                          "<(oci_lib_dir)"
                      ]
                  }
              }
          }
      }
    ],
  ],
  "include_dirs"  : [ "<(oci_inc_dir)",
                      "src/dpi/src/",
                      "src/dpi/include/",
                      "<!(node -e \"require('nan')\")"
    ],
  }
  ]
}
