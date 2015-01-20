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
          "oci_inc_dir%" : "<!(if [ -z $OCI_INC_DIR ]; then echo \"/usr/include/oracle/12.1/client64/\"; else echo $OCI_INC_DIR; fi)",
          "oci_lib_dir%" : "<!(if [ -z $OCI_LIB_DIR ]; then echo \"/usr/lib/oracle/12.1/client64/lib/\"; else echo $OCI_LIB_DIR; fi)",
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
          "oci_inc_dir%" : "<!(if [ -z $OCI_INC_DIR ]; then echo \"/opt/oracle/instantclient_11_2/sdk/include/\"; else echo $OCI_INC_DIR; fi)",
          "oci_lib_dir%" : "<!(if [ -z $OCI_LIB_DIR ]; then echo \"/opt/oracle/instantclient_11_2/\"; else echo $OCI_LIB_DIR; fi)",
        }
      }
    ],
    [
      'OS=="solaris"', {
        "variables" : {
          "oci_inc_dir%" : "<!(if [ -z $OCI_INC_DIR ]; then echo \"/opt/oracle/instantclient_12_1/sdk/include/\"; else echo $OCI_INC_DIR; fi)",
          "oci_lib_dir%" : "<!(if [ -z $OCI_LIB_DIR ]; then echo \"/opt/oracle/instantclient_12_1/\"; else echo $OCI_LIB_DIR; fi)",
        }
      }
    ]
    ],
  "cflags"        : ['-fexceptions'],
  "cflags_cc"     : ['-fexceptions'],
  "include_dirs"  : [ "<(oci_inc_dir)",
                      "src/dpi/src/",
                      "src/dpi/include/"
  ],
  "libraries"     : ["-lclntsh"],
  "link_settings" : {
     "libraries"  : ['-L<(oci_lib_dir)'] 
    }
  }
  ]
}
