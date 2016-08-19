{
  "targets": [
  {
    "target_name" : "oracledb",
    "sources" : [
             "src/njs/src/njsOracle.cpp",
             "src/njs/src/njsPool.cpp",
             "src/njs/src/njsConnection.cpp",
             "src/njs/src/njsResultSet.cpp",
             "src/njs/src/njsMessages.cpp",
             "src/njs/src/njsIntLob.cpp",
             "src/dpi/src/dpiEnv.cpp",
             "src/dpi/src/dpiEnvImpl.cpp",
             "src/dpi/src/dpiException.cpp",
             "src/dpi/src/dpiExceptionImpl.cpp",
             "src/dpi/src/dpiConnImpl.cpp",
             "src/dpi/src/dpiDateTimeArrayImpl.cpp",
             "src/dpi/src/dpiPoolImpl.cpp",
             "src/dpi/src/dpiStmtImpl.cpp",
             "src/dpi/src/dpiUtils.cpp",
             "src/dpi/src/dpiLob.cpp",
             "src/dpi/src/dpiCommon.cpp"
    ],
    "conditions" : [
    [
      'OS=="linux"', {
        "variables" : {
          "oci_inc_dir%" : "<!(INSTURL=\"https://github.com/oracle/node-oracledb/blob/master/INSTALL.md\"; ERR=\"node-oracledb ERR! Error:\"; if [ -z $OCI_INC_DIR ]; then OCI_LIB_DIR=`ls -d /usr/lib/oracle/*/client*/lib/libclntsh.* 2> /dev/null | tail -1 | sed -e 's#/libclntsh[^/]*##'`; if [ -z $OCI_LIB_DIR ]; then if [ -z \"$ORACLE_HOME\" ]; then if [ -f /opt/oracle/instantclient/sdk/include/oci.h ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo \"$ERR Cannot find Oracle client header files.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f $ORACLE_HOME/rdbms/public/oci.h ]; then echo $ORACLE_HOME/rdbms/public; else echo \"$ERR Cannot find \$ORACLE_HOME/rdbms/public/oci.h\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi; else OCI_INC_DIR=`echo $OCI_LIB_DIR | sed -e 's!^/usr/lib/oracle/\(.*\)/client\([64]*\)*/lib[/]*$!/usr/include/oracle/\\1/client\\2!'`; if [ -z $OCI_INC_DIR ]; then if [ -f /opt/oracle/instantclient/sdk/include/oci.h ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo \"$ERR Cannot find Oracle client header files.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f \"$OCI_INC_DIR/oci.h\" ]; then echo $OCI_INC_DIR; else echo \"$ERR Cannot find \$OCI_INC_DIR/oci.h\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi; fi; else if [ -f \"$OCI_INC_DIR/oci.h\" ]; then echo $OCI_INC_DIR; else echo \"$ERR Cannot find \$OCI_INC_DIR/oci.h\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi;)",
          "oci_lib_dir%" : "<!(INSTURL=\"https://github.com/oracle/node-oracledb/blob/master/INSTALL.md\"; ERR=\"node-oracledb ERR! Error:\"; if [ -z $OCI_LIB_DIR ]; then OCI_LIB_DIR=`ls -d /usr/lib/oracle/*/client*/lib/libclntsh.* 2> /dev/null | tail -1 | sed -e 's#/libclntsh[^/]*##'`; if [ -z $OCI_LIB_DIR ]; then if [ -z \"$ORACLE_HOME\" ]; then if [ -f /opt/oracle/instantclient/libclntsh.so ]; then echo \"/opt/oracle/instantclient/\"; else echo \"$ERR Cannot find Oracle library libclntsh.so\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f \"$ORACLE_HOME/lib/libclntsh.so\" ]; then echo $ORACLE_HOME/lib; else echo \"$ERR Cannot find \$ORACLE_HOME/lib/libclntsh.so\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi; else if [ -f \"$OCI_LIB_DIR/libclntsh.so\" ]; then echo $OCI_LIB_DIR; else echo \"$ERR Cannot find \$OCI_LIB_DIR/libclntsh.so\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi; else if [ -f \"$OCI_LIB_DIR/libclntsh.so\" ]; then echo $OCI_LIB_DIR; else echo \"$ERR Cannot find \$OCI_LIB_DIR/libclntsh.so\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi;)",
          "oci_rpath%"   : "<!(if [ -z $OCI_LIB_DIR ]; then OCI_LIB_DIR=`ls -d /usr/lib/oracle/*/client*/lib/libclntsh.* 2> /dev/null | tail -1 | sed -e 's#/libclntsh[^/]*##'`; if [ -z $OCI_LIB_DIR ]; then if [ -d \"$ORACLE_HOME\" ]; then if [ -z \"${FORCE_RPATH+x}\" ]; then echo \"\"; else echo \"-Wl,-rpath,$ORACLE_HOME/lib\"; fi; else if [ -z \"${FORCE_RPATH+x}\" ]; then echo \"\"; else echo \"-Wl,-rpath,/opt/oracle/instantclient\"; fi; fi; else echo \"-Wl,-rpath,$OCI_LIB_DIR\"; fi; else if [ -z \"${FORCE_RPATH+x}\" ]; then echo \"\"; else echo \"-Wl,-rpath,$OCI_LIB_DIR\"; fi; fi;)",
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
          "oci_inc_dir%" : "<!(INSTURL=\"https://github.com/oracle/node-oracledb/blob/master/INSTALL.md#instosx\"; ERR=\"node-oracledb ERR! Error:\"; if [ -z $OCI_INC_DIR ]; then if [ -f /opt/oracle/instantclient/sdk/include/oci.h ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo \"$ERR Cannot find Oracle client header files.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f \"$OCI_INC_DIR/oci.h\" ]; then echo $OCI_INC_DIR; else echo \"$ERR Cannot find \$OCI_INC_DIR/oci.h\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi;)",
          "oci_lib_dir%" : "<!(INSTURL=\"https://github.com/oracle/node-oracledb/blob/master/INSTALL.md#instosx\"; ERR=\"node-oracledb ERR! Error:\"; if [ -z $OCI_LIB_DIR ]; then if [ -f /opt/oracle/instantclient/libclntsh.dylib ]; then echo \"/opt/oracle/instantclient/\"; else echo \"$ERR Cannot find /opt/oracle/instantclient/libclntsh.dylib\" >&2; echo \"$ERR Do you need to run 'cd /opt/oracle/instantclient && ln -s libclntsh.dylib.* libclntsh.dylib'?\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f \"$OCI_LIB_DIR/libclntsh.dylib\" ]; then echo $OCI_LIB_DIR; else echo \"$ERR Cannot find \$OCI_LIB_DIR/libclntsh.dylib\" >&2; echo \"$ERR Do you need to run 'cd \$OCI_LIB_DIR && ln -s libclntsh.dylib.* libclntsh.dylib'?\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi;)",
          },
          "cflags"        : ['-fexceptions'],
          "cflags_cc"     : ['-fexceptions'],
          "libraries"     : ["-lclntsh"],
          "link_settings" : {
             "libraries"  : ['-L<(oci_lib_dir) -Wl,-rpath,<(oci_lib_dir)']
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
          "cflags"        : ['-fexceptions', '-fsigned-char'],
          "cflags_cc"     : ['-fexceptions', '-fsigned-char'],
          "link_settings" : {
             "libraries"  : ['-L<(oci_lib_dir)']
        }
      }
    ],
    [
      'OS=="solaris"', {
        "variables" : {
          "oci_inc_dir%" : "<!(INSTURL=\"https://github.com/oracle/node-oracledb/blob/master/INSTALL.md\"; ERR=\"node-oracledb ERR! Error:\"; if [ -z $OCI_INC_DIR ]; then if [ -f /opt/oracle/instantclient/sdk/include/oci.h ]; then echo \"/opt/oracle/instantclient/sdk/include/\"; else echo \"$ERR Cannot find Oracle client header files.\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f \"$OCI_INC_DIR/oci.h\" ]; then echo $OCI_INC_DIR; else echo \"$ERR Cannot find \$OCI_INC_DIR/oci.h\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi;)",
          "oci_lib_dir%" : "<!(INSTURL=\"https://github.com/oracle/node-oracledb/blob/master/INSTALL.md\"; ERR=\"node-oracledb ERR! Error:\"; if [ -z $OCI_LIB_DIR ]; then if [ -f /opt/oracle/instantclient/libclntsh.so ]; then echo \"/opt/oracle/instantclient/\"; else echo \"$ERR Cannot find /opt/oracle/instantclient/libclntsh.so\" >&2; echo \"$ERR Do you need to run 'cd /opt/oracle/instantclient && ln -s libclntsh.so.* libclntsh.so'?\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; else if [ -f \"$OCI_LIB_DIR/libclntsh.so\" ];     then echo $OCI_LIB_DIR; else echo \"$ERR Cannot find \$OCI_LIB_DIR/libclntsh.so\" >&2; echo \"$ERR Do you need to run 'cd \$OCI_LIB_DIR && ln -s libclntsh.so.* libclntsh.so'?\" >&2; echo \"$ERR See $INSTURL\" >&2; echo \"\" >&2; fi; fi;)",
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
