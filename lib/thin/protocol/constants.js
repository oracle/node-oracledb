// Copyright (c) 2022, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const constants = require('../../constants.js');
const dataHandlerConstants = require('../../impl/datahandlers/constants.js');

module.exports = {

  // constants from upper level exposed here in order to avoid having multiple
  // files containing constants
  BIND_IN: constants.BIND_IN,
  BIND_INOUT: constants.BIND_INOUT,
  BIND_OUT: constants.BIND_OUT,
  CLIENT_VERSION:
    constants.VERSION_MAJOR << 24 |
    constants.VERSION_MINOR << 20 |
    constants.VERSION_PATCH << 12,
  CSFRM_IMPLICIT: constants.CSFRM_IMPLICIT,
  CSFRM_NCHAR: constants.CSFRM_NCHAR,
  DRIVER_NAME: constants.DEFAULT_DRIVER_NAME + ' thn',
  PURITY_DEFAULT: constants.PURITY_DEFAULT,
  PURITY_NEW: constants.PURITY_NEW,
  PURITY_SELF: constants.PURITY_SELF,
  SYSASM: constants.SYSASM,
  SYSBKP: constants.SYSBACKUP,
  SYSDBA: constants.SYSDBA,
  SYSDG: constants.SYSDG,
  SYSKM: constants.SYSKM,
  SYSOPER: constants.SYSOPER,
  SYSRAC: constants.SYSRAC,

  // authentication modes
  AUTH_MODE_DEFAULT: 0,
  AUTH_MODE_PRELIM: 0x00000008,
  AUTH_MODE_SYSASM: 0x00008000,
  AUTH_MODE_SYSBKP: 0x00020000,
  AUTH_MODE_SYSDBA: 0x00000002,
  AUTH_MODE_SYSDGD: 0x00040000,
  AUTH_MODE_SYSKMT: 0x00080000,
  AUTH_MODE_SYSOPER: 0x00000004,
  AUTH_MODE_SYSRAC: 0x00100000,

  // TTC authentication modes
  TNS_AUTH_MODE_LOGON: 0x00000001,
  TNS_AUTH_MODE_CHANGE_PASSWORD: 0x00000002,
  TNS_AUTH_MODE_SYSDBA: 0x00000020,
  TNS_AUTH_MODE_SYSOPER: 0x00000040,
  TNS_AUTH_MODE_PRELIM: 0x00000080,
  TNS_AUTH_MODE_WITH_PASSWORD: 0x00000100,
  TNS_AUTH_MODE_SYSASM: 0x00400000,
  TNS_AUTH_MODE_SYSBKP: 0x01000000,
  TNS_AUTH_MODE_SYSDGD: 0x02000000,
  TNS_AUTH_MODE_SYSKMT: 0x04000000,
  TNS_AUTH_MODE_SYSRAC: 0x08000000,
  TNS_AUTH_MODE_IAM_TOKEN: 0x20000000,

  // packet types
  TNS_PACKET_TYPE_CONNECT: 1,
  TNS_PACKET_TYPE_ACCEPT: 2,
  TNS_PACKET_TYPE_REFUSE: 4,
  TNS_PACKET_TYPE_REDIRECT: 5,
  TNS_PACKET_TYPE_DATA: 6,
  TNS_PACKET_TYPE_RESEND: 11,
  TNS_PACKET_TYPE_MARKER: 12,
  TNS_PACKET_TYPE_CONTROL: 14,

  // data types
  TNS_DATA_TYPE_DEFAULT: 0,
  TNS_DATA_TYPE_VARCHAR: 1,
  TNS_DATA_TYPE_NUMBER: 2,
  TNS_DATA_TYPE_BINARY_INTEGER: 3,
  TNS_DATA_TYPE_FLOAT: 4,
  TNS_DATA_TYPE_STR: 5,
  TNS_DATA_TYPE_VNU: 6,
  TNS_DATA_TYPE_PDN: 7,
  TNS_DATA_TYPE_LONG: 8,
  TNS_DATA_TYPE_VCS: 9,
  TNS_DATA_TYPE_TIDDEF: 10,
  TNS_DATA_TYPE_ROWID: 11,
  TNS_DATA_TYPE_DATE: 12,
  TNS_DATA_TYPE_VBI: 15,
  TNS_DATA_TYPE_RAW: 23,
  TNS_DATA_TYPE_LONG_RAW: 24,
  TNS_DATA_TYPE_UB2: 25,
  TNS_DATA_TYPE_UB4: 26,
  TNS_DATA_TYPE_SB1: 27,
  TNS_DATA_TYPE_SB2: 28,
  TNS_DATA_TYPE_SB4: 29,
  TNS_DATA_TYPE_SWORD: 30,
  TNS_DATA_TYPE_UWORD: 31,
  TNS_DATA_TYPE_PTRB: 32,
  TNS_DATA_TYPE_PTRW: 33,
  TNS_DATA_TYPE_OER8: 34 + 256,
  TNS_DATA_TYPE_FUN: 35 + 256,
  TNS_DATA_TYPE_AUA: 36 + 256,
  TNS_DATA_TYPE_RXH7: 37 + 256,
  TNS_DATA_TYPE_NA6: 38 + 256,
  TNS_DATA_TYPE_OAC9: 39,
  TNS_DATA_TYPE_AMS: 40,
  TNS_DATA_TYPE_BRN: 41,
  TNS_DATA_TYPE_BRP: 42 + 256,
  TNS_DATA_TYPE_BRV: 43 + 256,
  TNS_DATA_TYPE_KVA: 44 + 256,
  TNS_DATA_TYPE_CLS: 45 + 256,
  TNS_DATA_TYPE_CUI: 46 + 256,
  TNS_DATA_TYPE_DFN: 47 + 256,
  TNS_DATA_TYPE_DQR: 48 + 256,
  TNS_DATA_TYPE_DSC: 49 + 256,
  TNS_DATA_TYPE_EXE: 50 + 256,
  TNS_DATA_TYPE_FCH: 51 + 256,
  TNS_DATA_TYPE_GBV: 52 + 256,
  TNS_DATA_TYPE_GEM: 53 + 256,
  TNS_DATA_TYPE_GIV: 54 + 256,
  TNS_DATA_TYPE_OKG: 55 + 256,
  TNS_DATA_TYPE_HMI: 56 + 256,
  TNS_DATA_TYPE_INO: 57 + 256,
  TNS_DATA_TYPE_LNF: 59 + 256,
  TNS_DATA_TYPE_ONT: 60 + 256,
  TNS_DATA_TYPE_OPE: 61 + 256,
  TNS_DATA_TYPE_OSQ: 62 + 256,
  TNS_DATA_TYPE_SFE: 63 + 256,
  TNS_DATA_TYPE_SPF: 64 + 256,
  TNS_DATA_TYPE_VSN: 65 + 256,
  TNS_DATA_TYPE_UD7: 66 + 256,
  TNS_DATA_TYPE_DSA: 67 + 256,
  TNS_DATA_TYPE_UIN: 68,
  TNS_DATA_TYPE_PIN: 71 + 256,
  TNS_DATA_TYPE_PFN: 72 + 256,
  TNS_DATA_TYPE_PPT: 73 + 256,
  TNS_DATA_TYPE_STO: 75 + 256,
  TNS_DATA_TYPE_ARC: 77 + 256,
  TNS_DATA_TYPE_MRS: 78 + 256,
  TNS_DATA_TYPE_MRT: 79 + 256,
  TNS_DATA_TYPE_MRG: 80 + 256,
  TNS_DATA_TYPE_MRR: 81 + 256,
  TNS_DATA_TYPE_MRC: 82 + 256,
  TNS_DATA_TYPE_VER: 83 + 256,
  TNS_DATA_TYPE_LON2: 84 + 256,
  TNS_DATA_TYPE_INO2: 85 + 256,
  TNS_DATA_TYPE_ALL: 86 + 256,
  TNS_DATA_TYPE_UDB: 87 + 256,
  TNS_DATA_TYPE_AQI: 88 + 256,
  TNS_DATA_TYPE_ULB: 89 + 256,
  TNS_DATA_TYPE_ULD: 90 + 256,
  TNS_DATA_TYPE_SLS: 91,
  TNS_DATA_TYPE_SID: 92 + 256,
  TNS_DATA_TYPE_NA7: 93 + 256,
  TNS_DATA_TYPE_LVC: 94,
  TNS_DATA_TYPE_LVB: 95,
  TNS_DATA_TYPE_CHAR: 96,
  TNS_DATA_TYPE_AVC: 97,
  TNS_DATA_TYPE_AL7: 98 + 256,
  TNS_DATA_TYPE_K2RPC: 99 + 256,
  TNS_DATA_TYPE_BINARY_FLOAT: 100,
  TNS_DATA_TYPE_BINARY_DOUBLE: 101,
  TNS_DATA_TYPE_CURSOR: 102,
  TNS_DATA_TYPE_RDD: 104,
  TNS_DATA_TYPE_XDP: 103 + 256,
  TNS_DATA_TYPE_OSL: 106,
  TNS_DATA_TYPE_OKO8: 107 + 256,
  TNS_DATA_TYPE_EXT_NAMED: 108,
  TNS_DATA_TYPE_INT_NAMED: 109,
  TNS_DATA_TYPE_EXT_REF: 110,
  TNS_DATA_TYPE_INT_REF: 111,
  TNS_DATA_TYPE_CLOB: 112,
  TNS_DATA_TYPE_BLOB: 113,
  TNS_DATA_TYPE_BFILE: 114,
  TNS_DATA_TYPE_CFILE: 115,
  TNS_DATA_TYPE_RSET: 116,
  TNS_DATA_TYPE_CWD: 117,
  TNS_DATA_TYPE_JSON: 119,
  TNS_DATA_TYPE_OAC122: 120,
  TNS_DATA_TYPE_UD12: 124 + 256,
  TNS_DATA_TYPE_AL8: 125 + 256,
  TNS_DATA_TYPE_LFOP: 126 + 256,
  TNS_DATA_TYPE_VECTOR: 127,
  TNS_DATA_TYPE_FCRT: 127 + 256,
  TNS_DATA_TYPE_DNY: 128 + 256,
  TNS_DATA_TYPE_OPR: 129 + 256,
  TNS_DATA_TYPE_PLS: 130 + 256,
  TNS_DATA_TYPE_XID: 131 + 256,
  TNS_DATA_TYPE_TXN: 132 + 256,
  TNS_DATA_TYPE_DCB: 133 + 256,
  TNS_DATA_TYPE_CCA: 134 + 256,
  TNS_DATA_TYPE_WRN: 135 + 256,
  TNS_DATA_TYPE_TLH: 137 + 256,
  TNS_DATA_TYPE_TOH: 138 + 256,
  TNS_DATA_TYPE_FOI: 139 + 256,
  TNS_DATA_TYPE_SID2: 140 + 256,
  TNS_DATA_TYPE_TCH: 141 + 256,
  TNS_DATA_TYPE_PII: 142 + 256,
  TNS_DATA_TYPE_PFI: 143 + 256,
  TNS_DATA_TYPE_PPU: 144 + 256,
  TNS_DATA_TYPE_PTE: 145 + 256,
  TNS_DATA_TYPE_CLV: 146,
  TNS_DATA_TYPE_RXH8: 148 + 256,
  TNS_DATA_TYPE_N12: 149 + 256,
  TNS_DATA_TYPE_AUTH: 150 + 256,
  TNS_DATA_TYPE_KVAL: 151 + 256,
  TNS_DATA_TYPE_DTR: 152,
  TNS_DATA_TYPE_DUN: 153,
  TNS_DATA_TYPE_DOP: 154,
  TNS_DATA_TYPE_VST: 155,
  TNS_DATA_TYPE_ODT: 156,
  TNS_DATA_TYPE_FGI: 157 + 256,
  TNS_DATA_TYPE_DSY: 158 + 256,
  TNS_DATA_TYPE_DSYR8: 159 + 256,
  TNS_DATA_TYPE_DSYH8: 160 + 256,
  TNS_DATA_TYPE_DSYL: 161 + 256,
  TNS_DATA_TYPE_DSYT8: 162 + 256,
  TNS_DATA_TYPE_DSYV8: 163 + 256,
  TNS_DATA_TYPE_DSYP: 164 + 256,
  TNS_DATA_TYPE_DSYF: 165 + 256,
  TNS_DATA_TYPE_DSYK: 166 + 256,
  TNS_DATA_TYPE_DSYY: 167 + 256,
  TNS_DATA_TYPE_DSYQ: 168 + 256,
  TNS_DATA_TYPE_DSYC: 169 + 256,
  TNS_DATA_TYPE_DSYA: 170 + 256,
  TNS_DATA_TYPE_OT8: 171 + 256,
  TNS_DATA_TYPE_DOL: 172,
  TNS_DATA_TYPE_DSYTY: 173 + 256,
  TNS_DATA_TYPE_AQE: 174 + 256,
  TNS_DATA_TYPE_KV: 175 + 256,
  TNS_DATA_TYPE_AQD: 176 + 256,
  TNS_DATA_TYPE_AQ8: 177 + 256,
  TNS_DATA_TYPE_TIME: 178,
  TNS_DATA_TYPE_TIME_TZ: 179,
  TNS_DATA_TYPE_TIMESTAMP: 180,
  TNS_DATA_TYPE_TIMESTAMP_TZ: 181,
  TNS_DATA_TYPE_INTERVAL_YM: 182,
  TNS_DATA_TYPE_INTERVAL_DS: 183,
  TNS_DATA_TYPE_EDATE: 184,
  TNS_DATA_TYPE_ETIME: 185,
  TNS_DATA_TYPE_ETTZ: 186,
  TNS_DATA_TYPE_ESTAMP: 187,
  TNS_DATA_TYPE_ESTZ: 188,
  TNS_DATA_TYPE_EIYM: 189,
  TNS_DATA_TYPE_EIDS: 190,
  TNS_DATA_TYPE_RFS: 193 + 256,
  TNS_DATA_TYPE_RXH10: 194 + 256,
  TNS_DATA_TYPE_DCLOB: 195,
  TNS_DATA_TYPE_DBLOB: 196,
  TNS_DATA_TYPE_DBFILE: 197,
  TNS_DATA_TYPE_DJSON: 198,
  TNS_DATA_TYPE_KPN: 198 + 256,
  TNS_DATA_TYPE_KPDNR: 199 + 256,
  TNS_DATA_TYPE_DSYD: 200 + 256,
  TNS_DATA_TYPE_DSYS: 201 + 256,
  TNS_DATA_TYPE_DSYR: 202 + 256,
  TNS_DATA_TYPE_DSYH: 203 + 256,
  TNS_DATA_TYPE_DSYT: 204 + 256,
  TNS_DATA_TYPE_DSYV: 205 + 256,
  TNS_DATA_TYPE_AQM: 206 + 256,
  TNS_DATA_TYPE_OER11: 207 + 256,
  TNS_DATA_TYPE_UROWID: 208,
  TNS_DATA_TYPE_AQL: 210 + 256,
  TNS_DATA_TYPE_OTC: 211 + 256,
  TNS_DATA_TYPE_KFNO: 212 + 256,
  TNS_DATA_TYPE_KFNP: 213 + 256,
  TNS_DATA_TYPE_KGT8: 214 + 256,
  TNS_DATA_TYPE_RASB4: 215 + 256,
  TNS_DATA_TYPE_RAUB2: 216 + 256,
  TNS_DATA_TYPE_RAUB1: 217 + 256,
  TNS_DATA_TYPE_RATXT: 218 + 256,
  TNS_DATA_TYPE_RSSB4: 219 + 256,
  TNS_DATA_TYPE_RSUB2: 220 + 256,
  TNS_DATA_TYPE_RSUB1: 221 + 256,
  TNS_DATA_TYPE_RSTXT: 222 + 256,
  TNS_DATA_TYPE_RIDL: 223 + 256,
  TNS_DATA_TYPE_GLRDD: 224 + 256,
  TNS_DATA_TYPE_GLRDG: 225 + 256,
  TNS_DATA_TYPE_GLRDC: 226 + 256,
  TNS_DATA_TYPE_OKO: 227 + 256,
  TNS_DATA_TYPE_DPP: 228 + 256,
  TNS_DATA_TYPE_DPLS: 229 + 256,
  TNS_DATA_TYPE_DPMOP: 230 + 256,
  TNS_DATA_TYPE_TIMESTAMP_LTZ: 231,
  TNS_DATA_TYPE_ESITZ: 232,
  TNS_DATA_TYPE_UB8: 233,
  TNS_DATA_TYPE_STAT: 234 + 256,
  TNS_DATA_TYPE_RFX: 235 + 256,
  TNS_DATA_TYPE_FAL: 236 + 256,
  TNS_DATA_TYPE_CKV: 237 + 256,
  TNS_DATA_TYPE_DRCX: 238 + 256,
  TNS_DATA_TYPE_KGH: 239 + 256,
  TNS_DATA_TYPE_AQO: 240 + 256,
  TNS_DATA_TYPE_PNTY: 241,
  TNS_DATA_TYPE_OKGT: 242 + 256,
  TNS_DATA_TYPE_KPFC: 243 + 256,
  TNS_DATA_TYPE_FE2: 244 + 256,
  TNS_DATA_TYPE_SPFP: 245 + 256,
  TNS_DATA_TYPE_DPULS: 246 + 256,
  TNS_DATA_TYPE_BOOLEAN: 252,
  TNS_DATA_TYPE_AQA: 253 + 256,
  TNS_DATA_TYPE_KPBF: 254 + 256,
  TNS_DATA_TYPE_TSM: 513,
  TNS_DATA_TYPE_MSS: 514,
  TNS_DATA_TYPE_KPC: 516,
  TNS_DATA_TYPE_CRS: 517,
  TNS_DATA_TYPE_KKS: 518,
  TNS_DATA_TYPE_KSP: 519,
  TNS_DATA_TYPE_KSPTOP: 520,
  TNS_DATA_TYPE_KSPVAL: 521,
  TNS_DATA_TYPE_PSS: 522,
  TNS_DATA_TYPE_NLS: 523,
  TNS_DATA_TYPE_ALS: 524,
  TNS_DATA_TYPE_KSDEVTVAL: 525,
  TNS_DATA_TYPE_KSDEVTTOP: 526,
  TNS_DATA_TYPE_KPSPP: 527,
  TNS_DATA_TYPE_KOL: 528,
  TNS_DATA_TYPE_LST: 529,
  TNS_DATA_TYPE_ACX: 530,
  TNS_DATA_TYPE_SCS: 531,
  TNS_DATA_TYPE_RXH: 532,
  TNS_DATA_TYPE_KPDNS: 533,
  TNS_DATA_TYPE_KPDCN: 534,
  TNS_DATA_TYPE_KPNNS: 535,
  TNS_DATA_TYPE_KPNCN: 536,
  TNS_DATA_TYPE_KPS: 537,
  TNS_DATA_TYPE_APINF: 538,
  TNS_DATA_TYPE_TEN: 539,
  TNS_DATA_TYPE_XSSCS: 540,
  TNS_DATA_TYPE_XSSSO: 541,
  TNS_DATA_TYPE_XSSAO: 542,
  TNS_DATA_TYPE_KSRPC: 543,
  TNS_DATA_TYPE_KVL: 560,
  TNS_DATA_TYPE_SESSGET: 563,
  TNS_DATA_TYPE_SESSREL: 564,
  TNS_DATA_TYPE_XSSDEF: 565,
  TNS_DATA_TYPE_PDQCINV: 572,
  TNS_DATA_TYPE_PDQIDC: 573,
  TNS_DATA_TYPE_KPDQCSTA: 574,
  TNS_DATA_TYPE_KPRS: 575,
  TNS_DATA_TYPE_KPDQIDC: 576,
  TNS_DATA_TYPE_RTSTRM: 578,
  TNS_DATA_TYPE_SESSRET: 579,
  TNS_DATA_TYPE_SCN6: 580,
  TNS_DATA_TYPE_KECPA: 581,
  TNS_DATA_TYPE_KECPP: 582,
  TNS_DATA_TYPE_SXA: 583,
  TNS_DATA_TYPE_KVARR: 584,
  TNS_DATA_TYPE_KPNGN: 585,
  TNS_DATA_TYPE_XSNSOP: 590,
  TNS_DATA_TYPE_XSATTR: 591,
  TNS_DATA_TYPE_XSNS: 592,
  TNS_DATA_TYPE_TXT: 593,
  TNS_DATA_TYPE_XSSESSNS: 594,
  TNS_DATA_TYPE_XSATTOP: 595,
  TNS_DATA_TYPE_XSCREOP: 596,
  TNS_DATA_TYPE_XSDETOP: 597,
  TNS_DATA_TYPE_XSDESOP: 598,
  TNS_DATA_TYPE_XSSETSP: 599,
  TNS_DATA_TYPE_XSSIDP: 600,
  TNS_DATA_TYPE_XSPRIN: 601,
  TNS_DATA_TYPE_XSKVL: 602,
  TNS_DATA_TYPE_XSSSDEF2: 603,
  TNS_DATA_TYPE_XSNSOP2: 604,
  TNS_DATA_TYPE_XSNS2: 605,
  TNS_DATA_TYPE_IMPLRES: 611,
  TNS_DATA_TYPE_OER19: 612,
  TNS_DATA_TYPE_UB1ARRAY: 613,
  TNS_DATA_TYPE_SESSSTATE: 614,
  TNS_DATA_TYPE_AC_REPLAY: 615,
  TNS_DATA_TYPE_AC_CONT: 616,
  TNS_DATA_TYPE_KPDNREQ: 622,
  TNS_DATA_TYPE_KPDNRNF: 623,
  TNS_DATA_TYPE_KPNGNC: 624,
  TNS_DATA_TYPE_KPNRI: 625,
  TNS_DATA_TYPE_AQENQ: 626,
  TNS_DATA_TYPE_AQDEQ: 627,
  TNS_DATA_TYPE_AQJMS: 628,
  TNS_DATA_TYPE_KPDNRPAY: 629,
  TNS_DATA_TYPE_KPDNRACK: 630,
  TNS_DATA_TYPE_KPDNRMP: 631,
  TNS_DATA_TYPE_KPDNRDQ: 632,
  TNS_DATA_TYPE_CHUNKINFO: 636,
  TNS_DATA_TYPE_SCN: 637,
  TNS_DATA_TYPE_SCN8: 638,
  TNS_DATA_TYPE_UD21: 639,
  TNS_DATA_TYPE_TNP: 640,
  TNS_DATA_TYPE_OAC: 646,
  TNS_DATA_TYPE_SESSSIGN: 647,
  TNS_DATA_TYPE_OER: 652,
  TNS_DATA_TYPE_UDS: 663,

  // data type representations
  TNS_TYPE_REP_NATIVE: 0,
  TNS_TYPE_REP_UNIVERSAL: 1,
  TNS_TYPE_REP_ORACLE: 10,

  // message types
  TNS_MSG_TYPE_PROTOCOL: 1,
  TNS_MSG_TYPE_DATA_TYPES: 2,
  TNS_MSG_TYPE_FUNCTION: 3,
  TNS_MSG_TYPE_ERROR: 4,
  TNS_MSG_TYPE_ROW_HEADER: 6,
  TNS_MSG_TYPE_ROW_DATA: 7,
  TNS_MSG_TYPE_PARAMETER: 8,
  TNS_MSG_TYPE_STATUS: 9,
  TNS_MSG_TYPE_IO_VECTOR: 11,
  TNS_MSG_TYPE_LOB_DATA: 14,
  TNS_MSG_TYPE_WARNING: 15,
  TNS_MSG_TYPE_DESCRIBE_INFO: 16,
  TNS_MSG_TYPE_PIGGYBACK: 17,
  TNS_MSG_TYPE_FLUSH_OUT_BINDS: 19,
  TNS_MSG_TYPE_BIT_VECTOR: 21,
  TNS_MSG_TYPE_SERVER_SIDE_PIGGYBACK: 23,
  TNS_MSG_TYPE_ONEWAY_FN: 26,
  TNS_MSG_TYPE_IMPLICIT_RESULTSET: 27,
  TNS_MSG_TYPE_RENEGOTIATE: 28,
  TNS_MSG_TYPE_END_OF_REQUEST: 29,
  TNS_MSG_TYPE_FAST_AUTH: 34,

  // parameter keyword numbers,
  TNS_KEYWORD_NUM_CURRENT_SCHEMA: 168,
  TNS_KEYWORD_NUM_EDITION: 172,
  TNS_KEYWORD_NUM_TRANSACTION_ID: 201,

  // bind flags
  TNS_BIND_USE_INDICATORS: 0x0001,
  TNS_BIND_USE_LENGTH: 0x0002,
  TNS_BIND_ARRAY: 0x0040,

  // bind directions
  TNS_BIND_DIR_OUTPUT: 16,
  TNS_BIND_DIR_INPUT: 32,
  TNS_BIND_DIR_INPUT_OUTPUT: 48,

  // execute options
  TNS_EXEC_OPTION_PARSE: 0x01,
  TNS_EXEC_OPTION_BIND: 0x08,
  TNS_EXEC_OPTION_DEFINE: 0x10,
  TNS_EXEC_OPTION_EXECUTE: 0x20,
  TNS_EXEC_OPTION_FETCH: 0x40,
  TNS_EXEC_OPTION_COMMIT: 0x100,
  TNS_EXEC_OPTION_COMMIT_REEXECUTE: 0x1,
  TNS_EXEC_OPTION_PLSQL_BIND: 0x400,
  TNS_EXEC_OPTION_DML_ROWCOUNTS: 0x4000,
  TNS_EXEC_OPTION_NOT_PLSQL: 0x8000,
  TNS_EXEC_OPTION_IMPLICIT_RESULTSET: 0x8000,
  TNS_EXEC_OPTION_DESCRIBE: 0x20000,
  TNS_EXEC_OPTION_NO_COMPRESSED_FETCH: 0x40000,
  TNS_EXEC_OPTION_BATCH_ERRORS: 0x80000,
  TNS_EXEC_OPTION_NO_IMPL_REL: 0x200000,

  // server side piggyback op codes
  TNS_SERVER_PIGGYBACK_QUERY_CACHE_INVALIDATION: 1,
  TNS_SERVER_PIGGYBACK_OS_PID_MTS: 2,
  TNS_SERVER_PIGGYBACK_TRACE_EVENT: 3,
  TNS_SERVER_PIGGYBACK_SESS_RET: 4,
  TNS_SERVER_PIGGYBACK_SYNC: 5,
  TNS_SERVER_PIGGYBACK_LTXID: 7,
  TNS_SERVER_PIGGYBACK_AC_REPLAY_CONTEXT: 8,
  TNS_SERVER_PIGGYBACK_EXT_SYNC: 9,
  TNS_SERVER_PIGGYBACK_SESS_SIGNATURE: 10,

  // session return constants
  TNS_SESSGET_SESSION_CHANGED: 4,

  // LOB operations
  TNS_LOB_OP_GET_LENGTH: 0x0001,
  TNS_LOB_OP_READ: 0x0002,
  TNS_LOB_OP_TRIM: 0x0020,
  TNS_LOB_OP_WRITE: 0x0040,
  TNS_LOB_OP_GET_CHUNK_SIZE: 0x4000,
  TNS_LOB_OP_CREATE_TEMP: 0x0110,
  TNS_LOB_OP_FREE_TEMP: 0x0111,
  TNS_LOB_OP_OPEN: 0x8000,
  TNS_LOB_OP_CLOSE: 0x10000,
  TNS_LOB_OP_IS_OPEN: 0x11000,
  TNS_LOB_OP_ARRAY: 0x80000,
  TNS_LOB_OP_FILE_OPEN: 0x0100,
  TNS_LOB_OP_FILE_CLOSE: 0x0200,
  TNS_LOB_OP_FILE_ISOPEN: 0x0400,
  TNS_LOB_OP_FILE_EXISTS: 0x0800,

  // LOB locator constants
  TNS_LOB_LOC_OFFSET_FLAG_1: 4,
  TNS_LOB_LOC_OFFSET_FLAG_3: 6,
  TNS_LOB_LOC_OFFSET_FLAG_4: 7,
  TNS_LOB_QLOCATOR_VERSION: 4,
  TNS_LOB_LOC_FIXED_OFFSET: 16,

  // LOB locator flags (byte 1)
  TNS_LOB_LOC_FLAGS_BLOB: 0x01,
  TNS_LOB_LOC_FLAGS_VALUE_BASED: 0x20,
  TNS_LOB_LOC_FLAGS_ABSTRACT: 0x40,

  // LOB locator flags (byte 2)
  TNS_LOB_LOC_FLAGS_INIT: 0x08,

  // LOB locator flags (byte 4)
  TNS_LOB_LOC_FLAGS_TEMP: 0x01,
  TNS_LOB_LOC_FLAGS_VAR_LENGTH_CHARSET: 0x80,

  // other LOB constants
  TNS_LOB_OPEN_READ_WRITE: 2,
  TNS_LOB_OPEN_READ_ONLY: 11,
  TNS_LOB_PREFETCH_FLAG: 0x2000000,

  // base JSON constants
  TNS_JSON_MAX_LENGTH: 32 * 1024 * 1024,

  // end-to-end metrics
  TNS_END_TO_END_ACTION: 0x0010,
  TNS_END_TO_END_CLIENT_IDENTIFIER: 0x0001,
  TNS_END_TO_END_CLIENT_INFO: 0x0100,
  TNS_END_TO_END_DBOP: 0x0200,
  TNS_END_TO_END_MODULE: 0x0008,

  // versions
  TNS_VERSION_MIN_ACCEPTED: 315,
  TNS_VERSION_MIN_LARGE_SDU: 315,

  // TTC functions
  TNS_FUNC_AUTH_PHASE_ONE: 118,
  TNS_FUNC_AUTH_PHASE_TWO: 115,
  TNS_FUNC_CLOSE_CURSORS: 105,
  TNS_FUNC_COMMIT: 14,
  TNS_FUNC_EXECUTE: 94,
  TNS_FUNC_FETCH: 5,
  TNS_FUNC_LOB_OP: 96,
  TNS_FUNC_LOGOFF: 9,
  TNS_FUNC_PING: 147,
  TNS_FUNC_ROLLBACK: 15,
  TNS_FUNC_SET_END_TO_END_ATTR: 135,
  TNS_FUNC_REEXECUTE: 4,
  TNS_FUNC_REEXECUTE_AND_FETCH: 78,
  TNS_FUNC_SET_SCHEMA: 152,
  TNS_FUNC_SESSION_GET: 162,
  TNS_FUNC_SESSION_RELEASE: 163,
  TNS_FUNC_SESSION_STATE: 176, // piggyback fn
  TNS_FUNC_CANCEL_ALL: 120, // piggyback fn
  TNS_FUNC_TPC_TXN_SWITCH: 103,
  TNS_FUNC_TPC_TXN_CHANGE_STATE: 104,

  // character sets and encodings
  TNS_CHARSET_UTF8: 873,
  TNS_CHARSET_UTF16: 2000,
  TNS_ENCODING_UTF8: "UTF-8",
  TNS_ENCODING_UTF16: "UTF-16LE",
  TNS_ENCODING_MULTI_BYTE: 0x01,
  TNS_ENCODING_CONV_LENGTH: 0x02,

  // compile time capability indices
  TNS_CCAP_SQL_VERSION: 0,
  TNS_CCAP_LOGON_TYPES: 4,
  TNS_CCAP_CTB_FEATURE_BACKPORT: 5,
  TNS_CCAP_FIELD_VERSION: 7,
  TNS_CCAP_SERVER_DEFINE_CONV: 8,
  TNS_CCAP_TTC1: 15,
  TNS_CCAP_OCI1: 16,
  TNS_CCAP_TDS_VERSION: 17,
  TNS_CCAP_RPC_VERSION: 18,
  TNS_CCAP_RPC_SIG: 19,
  TNS_CCAP_DBF_VERSION: 21,
  TNS_CCAP_LOB: 23,
  TNS_CCAP_TTC2: 26,
  TNS_CCAP_UB2_DTY: 27,
  TNS_CCAP_OCI2: 31,
  TNS_CCAP_CLIENT_FN: 34,
  TNS_CCAP_OCI3: 35,
  TNS_CCAP_TTC3: 37,
  TNS_CCAP_SESS_SIGNATURE_VERSION: 39,
  TNS_CCAP_TTC4: 40,
  TNS_CCAP_LOB2: 42,
  TNS_CCAP_TTC5: 44,
  TNS_CCAP_VECTOR_FEATURES: 52,
  TNS_CCAP_MAX: 53,

  // compile time capability values
  TNS_CCAP_SQL_VERSION_MAX: 6,
  TNS_CCAP_FIELD_VERSION_11_2: 6,
  TNS_CCAP_FIELD_VERSION_12_1: 7,
  TNS_CCAP_FIELD_VERSION_12_2: 8,
  TNS_CCAP_FIELD_VERSION_12_2_EXT1: 9,
  TNS_CCAP_FIELD_VERSION_18_1: 10,
  TNS_CCAP_FIELD_VERSION_18_1_EXT_1: 11,
  TNS_CCAP_FIELD_VERSION_19_1: 12,
  TNS_CCAP_FIELD_VERSION_19_1_EXT_1: 13,
  TNS_CCAP_FIELD_VERSION_20_1: 14,
  TNS_CCAP_FIELD_VERSION_20_1_EXT_1: 15,
  TNS_CCAP_FIELD_VERSION_21_1: 16,
  TNS_CCAP_FIELD_VERSION_23_1: 17,
  TNS_CCAP_FIELD_VERSION_23_1_EXT_1: 18,
  TNS_CCAP_FIELD_VERSION_23_1_EXT_2: 19,
  TNS_CCAP_FIELD_VERSION_23_1_EXT_3: 20,
  TNS_CCAP_FIELD_VERSION_23_1_EXT_4: 21,
  TNS_CCAP_FIELD_VERSION_23_1_EXT_5: 22,
  TNS_CCAP_FIELD_VERSION_23_1_EXT_6: 23,
  TNS_CCAP_FIELD_VERSION_23_4: 24,
  TNS_CCAP_FIELD_VERSION_MAX: 24,
  TNS_CCAP_O5LOGON: 8,
  TNS_CCAP_O5LOGON_NP: 2,
  TNS_CCAP_O7LOGON: 32,
  TNS_CCAP_O8LOGON_LONG_IDENTIFIER: 64,
  TNS_CCAP_O9LOGON_LONG_PASSWORD: 0x80,
  TNS_CCAP_END_OF_CALL_STATUS: 0x01,
  TNS_CCAP_IND_RCD: 0x08,
  TNS_CCAP_FAST_BVEC: 0x20,
  TNS_CCAP_FAST_SESSION_PROPAGATE: 0x10,
  TNS_CCAP_APP_CTX_PIGGYBACK: 0x80,
  TNS_CCAP_TDS_VERSION_MAX: 3,
  TNS_CCAP_RPC_VERSION_MAX: 7,
  TNS_CCAP_RPC_SIG_VALUE: 3,
  TNS_CCAP_DBF_VERSION_MAX: 1,
  TNS_CCAP_LTXID: 0x08,
  TNS_CCAP_IMPLICIT_RESULTS: 0x10,
  TNS_CCAP_BIG_CHUNK_CLR: 0x20,
  TNS_CCAP_KEEP_OUT_ORDER: 0x80,
  TNS_CCAP_LOB_UB8_SIZE: 0x01,
  TNS_CCAP_LOB_ENCS: 0x02,
  TNS_CCAP_LOB_PREFETCH_DATA: 0x04,
  TNS_CCAP_LOB_TEMP_SIZE: 0x08,
  TNS_CCAP_LOB_PREFETCH: 0x40,
  TNS_CCAP_LOB_12C: 0x80,
  TNS_CCAP_DRCP: 0x10,
  TNS_CCAP_ZLNP: 0x04,
  TNS_CCAP_INBAND_NOTIFICATION: 0x04,
  TNS_CCAP_END_OF_REQUEST: 0x20,
  TNS_CCAP_CLIENT_FN_MAX: 12,
  TNS_CCAP_LOB2_QUASI: 0x01,
  TNS_CCAP_LOB2_2GB_PREFETCH: 0x04,
  TNS_CCAP_CTB_IMPLICIT_POOL: 0x08,
  TNS_CCAP_VECTOR_SUPPORT: 0x08,
  TNS_CCAP_VECTOR_FEATURE_BINARY: 0x01,
  TNS_CCAP_VECTOR_FEATURE_SPARSE: 0x02,
  TNS_CCAP_TTC5_SESSIONLESS_TXNS: 0x20,
  TNS_CCAP_OCI3_OCSSYNC: 0x20,

  // runtime capability indices
  TNS_RCAP_COMPAT: 0,
  TNS_RCAP_TTC: 6,
  TNS_RCAP_MAX: 7,

  // runtime capability values
  TNS_RCAP_COMPAT_81: 2,
  TNS_RCAP_TTC_ZERO_COPY: 0x01,
  TNS_RCAP_TTC_32K: 0x04,

  /** Verifier types. */
  /**  SHA1 (salted). */
  TNS_VERIFIER_TYPE_11G_1: 0xb152,
  TNS_VERIFIER_TYPE_11G_2: 0x1b25,
  /** MultiRound SHA-512. */
  TNS_VERIFIER_TYPE_12C: 0x4815,

  // UDS flags
  TNS_UDS_FLAGS_IS_JSON: 0x00000100,
  TNS_UDS_FLAGS_IS_OSON: 0x00000800,

  // end of call status flags
  TNS_EOCS_FLAGS_TXN_IN_PROGRESS: 0x00000002,
  TNS_EOCS_FLAGS_SESS_RELEASE: 0x00008000,

  // transaction switching op codes
  TNS_TPC_TXN_START: 0x01,
  TNS_TPC_TXN_DETACH: 0x02,
  TNS_TPC_TXN_POST_DETACH: 0x04,

  // transaction change state op codes
  TNS_TPC_TXN_COMMIT: 0x01,
  TNS_TPC_TXN_ABORT: 0x02,
  TNS_TPC_TXN_PREPARE: 0x03,
  TNS_TPC_TXN_FORGET: 0x04,

  // transaction states
  TNS_TPC_TXN_STATE_PREPARE: 0,
  TNS_TPC_TXN_STATE_REQUIRES_COMMIT: 1,
  TNS_TPC_TXN_STATE_COMMITTED: 2,
  TNS_TPC_TXN_STATE_ABORTED: 3,
  TNS_TPC_TXN_STATE_READ_ONLY: 4,
  TNS_TPC_TXN_STATE_FORGOTTEN: 5,

  // sessionless transaction flag
  TNS_TPC_TRANS_SESSIONLESS: 0x00000010,

  // sessionless transaction format
  TNS_TPC_TRANS_SESSIONLESS_FORMAT: 0x4e5c3e,

  // sessionless sync version
  TNS_TPC_TRANS_TRANSACTION_ID_SYNC_VERSION_1: 0x01,

  // sessionless server states
  TNS_TPC_TRANS_TRANSACTION_ID_SYNC_SET: 0x40,
  TNS_TPC_TRANS_TRANSACTION_ID_SYNC_UNSET: 0x80,

  // sessionless state reason
  TNS_TPC_TRANS_TRANSACTION_ID_SYNC_SERVER: 0x01,
  TNS_TPC_TRANS_TRANSACTION_ID_SYNC_CLIENT: 0x02,
  TNS_TPC_TRANS_TRANSACTION_ID_SYNC_TXEND_XA: 0x03,


  // other constants
  TNS_ESCAPE_CHAR: 253,
  TNS_LONG_LENGTH_INDICATOR: dataHandlerConstants.TNS_LONG_LENGTH_INDICATOR,
  TNS_NULL_LENGTH_INDICATOR: dataHandlerConstants.TNS_NULL_LENGTH_INDICATOR,
  TNS_MAX_ROWID_LENGTH: 18,
  TNS_DURATION_SESSION: 10,
  TNS_MAX_LONG_LENGTH: 0x7fffffff,
  TNS_SDU: 8192,
  TNS_TDU: 65535,
  TNS_MAX_CONNECT_DATA: 230,
  TNS_MAX_UROWID_LENGTH: 3950,
  TNS_SERVER_CONVERTS_CHARS: 0x01, // server does charset conversion

  // drcp release mode
  DRCP_DEAUTHENTICATE: 0x00000002,

  // database object image flags
  TNS_OBJ_IS_VERSION_81: 0x80,
  TNS_OBJ_IS_DEGENERATE: 0x10,
  TNS_OBJ_IS_COLLECTION: 0x08,
  TNS_OBJ_NO_PREFIX_SEG: 0x04,
  TNS_OBJ_IMAGE_VERSION: 1,

  // database object flags
  TNS_OBJ_MAX_SHORT_LENGTH: 245,
  TNS_OBJ_ATOMIC_NULL: 253,
  TNS_OBJ_NON_NULL_OID: 0x02,
  TNS_OBJ_HAS_EXTENT_OID: 0x08,
  TNS_OBJ_TOP_LEVEL: 0x01,
  TNS_OBJ_HAS_INDEXES: 0x10,

  // database object collection types
  TNS_OBJ_PLSQL_INDEX_TABLE: 1,
  TNS_OBJ_NESTED_TABLE: 2,
  TNS_OBJ_VARRAY: 3,

  // database object TDS type codes
  TNS_OBJ_TDS_TYPE_CHAR: 1,
  TNS_OBJ_TDS_TYPE_DATE: 2,
  TNS_OBJ_TDS_TYPE_FLOAT: 5,
  TNS_OBJ_TDS_TYPE_NUMBER: 6,
  TNS_OBJ_TDS_TYPE_VARCHAR: 7,
  TNS_OBJ_TDS_TYPE_BOOLEAN: 8,
  TNS_OBJ_TDS_TYPE_RAW: 19,
  TNS_OBJ_TDS_TYPE_TIMESTAMP: 21,
  TNS_OBJ_TDS_TYPE_TIMESTAMP_TZ: 23,
  TNS_OBJ_TDS_TYPE_OBJ: 27,
  TNS_OBJ_TDS_TYPE_COLL: 28,
  TNS_OBJ_TDS_TYPE_CLOB: 29,
  TNS_OBJ_TDS_TYPE_BLOB: 30,
  TNS_OBJ_TDS_TYPE_TIMESTAMP_LTZ: 33,
  TNS_OBJ_TDS_TYPE_BINARY_FLOAT: 37,
  TNS_OBJ_TDS_TYPE_START_EMBED_ADT: 39,
  TNS_OBJ_TDS_TYPE_END_EMBED_ADT: 40,
  TNS_OBJ_TDS_TYPE_SUBTYPE_MARKER: 43,
  TNS_OBJ_TDS_TYPE_EMBED_ADT_INFO: 44,
  TNS_OBJ_TDS_TYPE_BINARY_DOUBLE: 45,

  // xml type constants
  TNS_XML_TYPE_LOB: 0x0001,
  TNS_XML_TYPE_STRING: 0x0004,
  TNS_XML_TYPE_FLAG_SKIP_NEXT_4: 0x100000,

  // errors
  TNS_ERR_INCONSISTENT_DATA_TYPES: 932,
  TNS_ERR_VAR_NOT_IN_SELECT_LIST: 1007,
  TNS_ERR_INBAND_MESSAGE: 12573,
  TNS_ERR_INVALID_SERVICE_NAME: 12514,
  TNS_ERR_INVALID_SID: 12505,
  TNS_ERR_NO_DATA_FOUND: 1403,
  TNS_ERR_SESSION_SHUTDOWN: 12572,

  // warnings
  TNS_WARN_COMPILATION_CREATE: 0x20,

  // vector constants
  TNS_VECTOR_MAX_LENGTH: 1048576,
  VECTOR_FORMAT_FLEX: 0,
  VECTOR_META_FLAG_FLEXIBLE_DIM: 1,
  VECTOR_META_FLAG_SPARSE: 2,

  // other constants
  PACKET_HEADER_SIZE: 8,
  NUMBER_AS_TEXT_CHARS: 172,
  CHUNKED_BYTES_CHUNK_SIZE: 65536,

  // Network Header flags for Data packet
  TNS_DATA_FLAGS_END_OF_REQUEST: 0x2000,

  TNS_BASE64_ALPHABET_ARRAY: Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
  TNS_EXTENT_OID: Buffer.from('00000000000000000000000000010001', 'hex')
};
