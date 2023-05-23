// Copyright (c) 2022, 2023, Oracle and/or its affiliates.

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

const {lookup} = require('dns').promises;
const errors = require("../../errors.js");

String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{([0-9]+)}/g, function(match, index) {
    // check if the argument is there
    return typeof args[index] == 'undefined' ? match : args[index];
  });
};

// String formats for creating the TNS URL.
const DESCRIPTION_FORMAT = "(DESCRIPTION={0}{1}{2}{3})";
const DESCRIPTION_FORMAT_LB = "(DESCRIPTION=(LOAD_BALANCE=ON){0}{1}{2}{3})";
const ADDRESS_LIST_FORMAT = "(ADDRESS_LIST={0})";
const ADDRESS_LIST_FORMAT_LB = "(ADDRESS_LIST=(LOAD_BALANCE=ON){0})";
const ADDRESS_FORMAT = "(ADDRESS=(PROTOCOL={0})(HOST={1})(PORT={2}){3})";
const HTTPS_PROXY_FORMAT = "(HTTPS_PROXY={0})";
const HTTPS_PROXY_PORT_FORMAT = "(HTTPS_PROXY_PORT={0})";
const CONNECT_DATA_FORMAT = "(CONNECT_DATA={0}{1}{2}{3}{4}{5}{6})";
const SERVICE_NAME_FORMAT = "(SERVICE_NAME={0})";
const SERVER_MODE_FORMAT = "(SERVER={0})";
const INSTANCE_NAME_FORMAT = "(INSTANCE_NAME={0})";
const SERVICE_TAG_FORMAT = "(SERVICE_TAG={0})";
const POOL_CONNECTION_CLASS_FORMAT = "(POOL_CONNECTION_CLASS={0})";
const POOL_PURITY_FORMAT = "(POOL_PURITY={0})";
const CONNECTION_ID_PREFIX_FORMAT = "(CONNECTION_ID_PREFIX={0})";
const SECURITY_FORMAT = "(SECURITY={0})";
const SERVER_DN_MATCH_FORMAT = "(SSL_SERVER_DN_MATCH={0})";
const SERVER_DN_FORMAT = "(SSL_SERVER_CERT_DN={0})";
const MY_WALLET_DIR_FORMAT = "(MY_WALLET_DIRECTORY={0})";
const ENCRYPTION_CLIENT_FORMAT = "(ENCRYPTION_CLIENT={0})";
const ENCRYPTION_TYPES_CLIENT_FORMAT = "(ENCRYPTION_TYPES_CLIENT={0})";
const CRYPTO_CHECKSUM_CLIENT_FORMAT = "(CRYPTO_CHECKSUM_CLIENT={0})";
const CRYPTO_CHECKSUM_TYPES_CLIENT_FORMAT = "(CRYPTO_CHECKSUM_TYPES_CLIENT={0})";
const KEY_VALUE_FORMAT = "({0}={1})";


// The host information pattern of the EZConnect URL format.
/*
Used (?=) for lookahead and \\k<hostnames> for the backreference.Lookahead
and backreference together prevents catastrophic backtracking.
Test Case in oracle_private/ezconnectTest.js
*/

const HOSTNAMES_PATTERN = new RegExp("((?=(?<hostnames>(((\\[[A-z0-9:]+\\])|([A-z0-9][A-z0-9._-]+))[,]?)+)))\\k<hostnames>(:(?<port>\\d+)?)?", 'g');

// The EZConnect pattern without the extended settings part.
const EZ_URL_PATTERN = new RegExp("^((?<protocol>tcp|tcps):)?"
    + "(//)?"
    + "(?<hostinfo>(" + HOSTNAMES_PATTERN.source + "(?=([,]|[;]|[/]|[:]|$))([,]|[;])?)+)"
    + "(/(?<servicename>[A-z0-9][A-z0-9,-.]+)?)"
    + "?(:(?<servermode>dedicated|shared|pooled))"
    + "?(/(?<instance>[A-z0-9][A-z0-9]+))?$", 'ig');

//'=' separates the connection property name and value.
const EXT_DOUBLE_QT = '"';

// '=' separates the connection property name and value.
const EXT_KEY_VAL_SEP = '=';

// '&' separates the connection properties.
const EXT_PARAM_SEP = '&';

// The parameters which will be part of the DESCRIPTION node.
const DESCRIPTION_PARAMS = ["ENABLE", "FAILOVER", "LOAD_BALANCE",
  "RECV_BUF_SIZE", "SEND_BUF_SIZE", "SDU",
  "SOURCE_ROUTE", "RETRY_COUNT", "RETRY_DELAY",
  "CONNECT_TIMEOUT", "TRANSPORT_CONNECT_TIMEOUT", "RECV_TIMEOUT"];
/*
   DESCRIPTION
    This class takes care resolving the EZConnect format to Long TNS URL format.
    It also takes care of parsing the connection and url properties set in the url.
    The format of the EZConnect URL is :
    [[protocol:]//]host1[,host12;host13][:port1][,host2:port2][/service_name]
        [:server][/instance_name][?[key1=value1][&key2=value2]...

 */
class EZConnectResolver {
  constructor(url) {
    this.URL_PROPS_ALIAS = this.initializeUrlAlias();
    let jdbcUrlPrefix = url.indexOf('@');
    if (jdbcUrlPrefix != -1) {
      this.url = url.substring(jdbcUrlPrefix + 1);
      this.urlPrefix = url.substring(0, jdbcUrlPrefix + 1);
    } else {
      this.url = url;
      this.urlPrefix = "";
    }
    this.resolvedUrl = '';
    this.connectionProps = new Map();
    this.urlProps = new Map();
    this.lb = false;
  }

  /**
 * Returns the resolved long TNS String.
 * @return Resolved TNS URL.
 */
  async getResolvedUrl() {
    await this.parse();
    return this.resolvedUrl;
  }

  /**
   * First parse the extended settings part of the given url.
   * After parsing the extended settings if the remaining part of the URL is in
   * EZConnectURL format then resolve it to long TNS url format.
   */
  async parse() {
    // First try to parse the extended settings part of the URL.
    let parsedUrl = this.parseExtendedSettings(this.url);
    if (this.connectionProps.size === 0 && this.urlProps.size === 0) {
      // If we have not parsed anything then use the received url as is.
      parsedUrl = this.url;
    }

    if (parsedUrl.startsWith("(")) {
      // Skip resolve the URL if it is in TNS format,
      // TNS format starts with '('
      this.resolvedUrl = this.urlPrefix + parsedUrl;
    } else {
      // Try to resolve the EZConnectURL to Long TNS URL.
      this.resolvedUrl = this.urlPrefix + await this.resolveToLongURLFormat(parsedUrl);
    }
  }
  /**
  * Translate the given ezconnect url format to Long TNS format.
  * @param url EZConnect URL
  * @return Returns resolved TNS url.
  */
  async resolveToLongURLFormat(url) {
    // URL is in the following format
    // [protocol://]host1[,host13][:port1][,host2:port2][/service_name][:server][/instance_name]

    let urlWithoutWhiteSpaces = url.replace(/\s/g, "");
    let bool = 0;
    let protocol = null, hostInfo = null, serviceName = null, serverMode = null, instanceName = null;
    for (const match of urlWithoutWhiteSpaces.matchAll(EZ_URL_PATTERN)) {
      bool = 1;
      protocol = match.groups.protocol;
      hostInfo = match.groups.hostinfo;
      serviceName = match.groups.servicename;
      serverMode = match.groups.servermode;
      instanceName = match.groups.instance;
    }
    if (!bool) {
      // No Processing required as the URL is not in ezconnect format.
      errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'input string not in easy connect format', urlWithoutWhiteSpaces);
    }

    if (protocol == null) {
      if (!(url.includes("//")))
        protocol = 'TCP';
    }

    // Try to get the proxy information from URL properties
    let proxyHost = this.urlProps.get("HTTPS_PROXY");
    let proxyPort = this.urlProps.get("HTTPS_PROXY_PORT");
    let addressInfo =
      await this.buildAddressList(hostInfo, protocol, proxyHost, proxyPort);

    let connectionIdPrefix =
      this.urlProps.get("CONNECTION_ID_PREFIX");
    // Build the available information in TNS format.
    if (this.lb) {
      return DESCRIPTION_FORMAT_LB.format(this.buildDescriptionParams(), addressInfo,
        this.buildConnectData(serviceName, serverMode, instanceName,
          connectionIdPrefix), this.buildSecurityInfo(protocol));
    } else {
      return DESCRIPTION_FORMAT.format(this.buildDescriptionParams(), addressInfo,
        this.buildConnectData(serviceName, serverMode, instanceName,
          connectionIdPrefix), this.buildSecurityInfo(protocol));
    }

  }

  /**
   * Returns the CONNECT_DATA part of DESCRIPTION node of the TNS URL.
   * @param serviceName the database service name [optional].
   * @param serverMode dedicated or shared or pooled [optional].
   * @param instanceName the database instance name [optional].
   * @param connectionIdPrefix prefix which will be appended to the connection id [optional].
   * @return CONNECT_DATA as string
   */
  buildConnectData(serviceName,
    serverMode,
    instanceName,
    connectionIdPrefix) {

    let poolConnectionClass = this.urlProps.get("POOL_CONNECTION_CLASS");
    let poolPurity = this.urlProps.get("POOL_PURITY");
    let serviceTag = this.urlProps.get("SERVICE_TAG");

    return CONNECT_DATA_FORMAT.format(SERVICE_NAME_FORMAT.format(serviceName == null ? '' : serviceName),
      serverMode == null ? '' : SERVER_MODE_FORMAT.format(serverMode),
      instanceName == null ? '' : INSTANCE_NAME_FORMAT.format(instanceName),
      poolConnectionClass == null ? '' : POOL_CONNECTION_CLASS_FORMAT.format(poolConnectionClass),
      poolPurity == null ? '' : POOL_PURITY_FORMAT.format(POOL_PURITY_FORMAT),
      serviceTag == null ? '' : SERVICE_TAG_FORMAT.format(serviceTag),
      connectionIdPrefix == null ? '' : CONNECTION_ID_PREFIX_FORMAT.format(connectionIdPrefix));
  }
  /**
* Builds the address information of the DESCRIPTION node with the given
* information.
* @param hostInfo host and port information separated by comma.
                hosts can be grouped into a ADDRESS_LIST using semi-colon ';'
* @param protocol either tcp or tcps [optional].
* @param proxyHost host name of the proxy server [optional].
* @param proxyPort proxy server port [optional].
* @return address information of the DESCRIPTION node.
*/
  async buildAddressList(hostInfo, protocol,
    proxyHost, proxyPort) {
    let shost = '';
    let ipcnt = 0;
    let builder = new Array();
    let proxyInfo = '';
    if (proxyHost != null && proxyPort != null) {
      // Builds the proxy information if it is available
      proxyInfo = HTTPS_PROXY_FORMAT.format(proxyHost) + HTTPS_PROXY_PORT_FORMAT.format(proxyPort);
    }

    if (protocol == null) protocol = 'TCP';
    let naddr = 0;
    // ; groups the user into a ADDRESS_LIST
    let addressLists = hostInfo.split(";");
    for (let addressList in addressLists) {
      let addressNodeCount = 0;
      let addressListBuilder = new Array();
      for (const match of addressLists[addressList].matchAll(HOSTNAMES_PATTERN)) {
        let hostnames = (match.groups.hostnames).split(',');
        let port = match.groups.port;
        if (port == null) {
          port = '1521' + '';
        }
        for (let hname in hostnames) {
          addressListBuilder.push(this.getAddrStr(hostnames[hname], port, protocol, proxyInfo));
          shost = hostnames[hname];
          addressNodeCount++;
        }
      }
      naddr += addressNodeCount;
      if (addressLists.length > 1 && addressNodeCount > 1) {
        builder.push(ADDRESS_LIST_FORMAT_LB.format(addressListBuilder.join('')));
      } else if (addressLists.length > 1) {
        builder.push(ADDRESS_LIST_FORMAT.format(addressListBuilder.join('')));
      } else {
        builder.push(addressListBuilder.join(''));
      }
    }
    if (naddr == 1) {
      shost = shost.trim();
      // If it is IPV6 format address then remove the enclosing '[' and ']'
      if (shost.startsWith("[") && shost.endsWith("]"))
        shost = shost.substring(1, shost.length - 1);
      try {
        await lookup(shost);
        ipcnt++;
      } catch {
        // nothing
      }
      if (ipcnt == 0) {
        errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'could not resolve hostname', shost);
      }
    }

    if (addressLists.length < 2 && naddr > 1) {
      this.lb = true;
    }

    return builder.join('');

  }
  /**
* Builds address information using the given hostname, port, protocol and
* proxyinfo.
* @param hostName
* @param port
* @param protocol
* @param proxyInfo
* @return addressInfo
*/
  getAddrStr(hostName, port,
    protocol, proxyInfo) {
    let host = hostName.trim();
    // If it is IPV6 format address then remove the enclosing '[' and ']'
    if (host.startsWith("[") && host.endsWith("]"))
      host = host.substring(1, host.length - 1);

    return ADDRESS_FORMAT.format(protocol, host, port, proxyInfo);

  }
  /**
* Builds the parameters for the DESCRIPTION node using the parsed properties
* from the URL.
* @return Description Parameters String.
*/
  buildDescriptionParams() {
    if (this.urlProps.size === 0)
      return '';
    let builder = new Array();
    this.urlProps.forEach(function(v, k) {
      if (DESCRIPTION_PARAMS.includes(k)) // Add only if it is a DESCRIPTION node parameter
        builder.push(KEY_VALUE_FORMAT.format(k, v));
    });
    return builder.join('');
  }

  /**
* Builds the security section of the DESCRIPTION node, which contains the information
* about wallet location, server DN, encryption and checksum options.
* @return security node of the description as string.
*/
  buildSecurityInfo(protocol) {
    let securityInfo = new Array();
    if (protocol != null && protocol.toLowerCase() == "tcps") {
      // In EZConnect format if the DN match is not specified the enable it
      // by default for TCPS protocol.
      let serverDNMatch = this.urlProps.get("SSL_SERVER_DN_MATCH");
      let serverCertDN = this.urlProps.get("SSL_SERVER_CERT_DN");
      let walletDir = this.urlProps.get("MY_WALLET_DIRECTORY");
      if (serverDNMatch != null && (serverDNMatch == "false" || serverDNMatch == "off" || serverDNMatch == "no")) {
        securityInfo.push(SERVER_DN_MATCH_FORMAT.format(serverDNMatch));
      } else {
        securityInfo.push(SERVER_DN_MATCH_FORMAT.format('TRUE'));
      }
      if (serverCertDN != null)
        securityInfo.push(SERVER_DN_FORMAT.format(serverCertDN));

      if (walletDir != null)
        securityInfo.push(MY_WALLET_DIR_FORMAT.format(walletDir));

    } else {
      let encryptionClient = this.urlProps.get("ENCRYPTION_CLIENT");
      let encryptionClientTypes = this.urlProps.get("ENCRYPTION_TYPES_CLIENT");
      let checksumClient = this.urlProps.get("CRYPTO_CHECKSUM_CLIENT");
      let checksumClientTypes = this.urlProps.get("CRYPTO_CHECKSUM_TYPES_CLIENT");
      if (encryptionClient != null)
        securityInfo.push(ENCRYPTION_CLIENT_FORMAT.format(encryptionClient));
      if (encryptionClientTypes != null)
        securityInfo.push(ENCRYPTION_TYPES_CLIENT_FORMAT.format(encryptionClientTypes));
      if (checksumClient != null)
        securityInfo.push(CRYPTO_CHECKSUM_CLIENT_FORMAT.format(checksumClient));
      if (checksumClientTypes != null)
        securityInfo.push(CRYPTO_CHECKSUM_TYPES_CLIENT_FORMAT.format(checksumClientTypes));

    }
    return (securityInfo.length == 0) ?
      '' : SECURITY_FORMAT.format(securityInfo.join(''));
  }

  /**
   * If the URL has extended settings part appended to it, this method takes
   * care of parsing it.
   * Parses the Extended Settings and takes appropriate action based on the
   * settings type.
   * <URL>?<propertyName1>=<propertyValue1>&<propertyName2>=<propertyValue2>.
   * @param urlStr Database URL supplied by the application.
   * @return the parsed URL which does not contain the extended settings part.
   */
  parseExtendedSettings(urlStr) {
    let urlBytes = Array.from(urlStr.trim());
    let extendedSettingsIndex = this.findExtendedSettingPosition(urlBytes);

    if (extendedSettingsIndex == -1) {
      return urlStr; // No extended settings configuration found
    }
    this.parseExtendedProperties(urlBytes, (extendedSettingsIndex + 1));
    return urlStr.substring(0, extendedSettingsIndex);
  }
  /**
  * Loops through the chars of the extended settings part of the URL and
  * parses the connection properties.
  * @param urlChars URL in char[]
  * @param extIndex the begin index of the extended settings
  */
  parseExtendedProperties(urlChars, extIndex) {
    let key = null;
    let value = null;
    let token = new Array(urlChars.length);
    let tokenIndx = 0;
    let indices = '';
    for (let i = extIndex; i < urlChars.length; i++) {
      if (urlChars[i].trim() == '') {
        continue;   //if whitespace char, then ignore it
      }

      switch (urlChars[i]) {
        case EXT_DOUBLE_QT:
          indices = this.parseQuotedString(i, urlChars, tokenIndx, token);
          tokenIndx = indices[1];
          i = indices[0];
          break;

        // Hit a '=' assign the value up to this to param key and
        // reset the startIndex
        case EXT_KEY_VAL_SEP:
          if (key != null) {
            errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'unable to parse, invalid syntax', this.url);
          }
          key = token.join("").substring(0, tokenIndx).trim();
          tokenIndx = 0;
          break;

        // Hit a '&' assign the value up to this to param key and
        // reset the startIndex
        case EXT_PARAM_SEP:
          if (key == null) {
            errors.throwErr(errors.ERR_INVALID_EZCONNECT_SYNTAX, 'unable to parse, invalid syntax', this.url);
          }
          value = token.join("").substring(0, tokenIndx).trim();
          this.addParam(key, value);
          key = null;
          value = null;
          tokenIndx = 0;
          break;

        default:
          token[tokenIndx++] = urlChars[i];
      }
    }
    // We don't have any unassigned key, ignore the read chars.
    if (key != null) {
      value = token.join("").substring(0, tokenIndx).trim();
      this.addParam(key, value);
    }
  }

  /**
   * Parses the quoted string from the given startIndex of the urlChars and
   * return the length of the parsed quoted string.
   * @param startIndex index of the starting '"' in the urlChars
   * @param urlChars char[] of the url string.
   * @param tokenIndex starting index in the token char[] to store the result
   * @param token char[] to store the result
   * @return int[] int[0] - new index for urlChars, int[1] new index for token
   */
  parseQuotedString(startIndex, urlChars, tokenIndex, token) {
    let i = startIndex + 1; // look for closing '"' from the next index
    while (i < urlChars.length) {
      let curChar = urlChars[i];
      if (curChar == EXT_DOUBLE_QT) {
        // Got the " which ends the quoted block, so break the loop
        // Return the new indices, caller would resume from this new indices.
        return [i, tokenIndex];
      } else {
        token[tokenIndex++] = curChar;
      }
      i++;
    }
  }

  /**
   * Adds the given key and value to the connection properties.
   * @param key
   * @param value
   */
  addParam(key, value) {
    let aliasKeyName = key.toLowerCase();
    let propertyName = this.URL_PROPS_ALIAS.get(aliasKeyName);
    if (propertyName != null) {
      // if it is an URL alias then add to URL props
      this.urlProps.set(propertyName, value);
    } else {
      this.connectionProps.set(propertyName, value);
    }
  }

  findExtendedSettingPosition(urlBytes) {
    let urlNodeDepth = 0;
    for (let i = 0; i < urlBytes.length; i++) {
      if (urlBytes[i] == '(') urlNodeDepth++;
      else if (urlBytes[i] == ')') urlNodeDepth--;
      else if (urlBytes[i] == '?' && urlNodeDepth == 0) return i;
    }
    return -1;
  }

  /**
   * Initialize a Map with URL parameter alias. key is what we get from the
   * URL and the value is what we use while creating the TNS URL.
   * @return url alias map
   */
  initializeUrlAlias() {
    let aliasMap = new Map();
    aliasMap.set("enable", "ENABLE");
    aliasMap.set("failover", "FAILOVER");
    aliasMap.set("load_balance", "LOAD_BALANCE");
    aliasMap.set("recv_buf_size", "RECV_BUF_SIZE");
    aliasMap.set("send_buf_size", "SEND_BUF_SIZE");
    aliasMap.set("sdu", "SDU");
    aliasMap.set("source_route", "SOURCE_ROUTE");
    aliasMap.set("retry_count", "RETRY_COUNT");
    aliasMap.set("retry_delay", "RETRY_DELAY");
    aliasMap.set("https_proxy", "HTTPS_PROXY");
    aliasMap.set("https_proxy_port", "HTTPS_PROXY_PORT");
    aliasMap.set("connect_timeout", "CONNECT_TIMEOUT");
    aliasMap.set("transport_connect_timeout", "TRANSPORT_CONNECT_TIMEOUT");
    aliasMap.set("recv_timeout", "RECV_TIMEOUT");
    aliasMap.set("ssl_server_cert_dn", "SSL_SERVER_CERT_DN");
    aliasMap.set("ssl_server_dn_match", "SSL_SERVER_DN_MATCH");
    aliasMap.set("wallet_location", "MY_WALLET_DIRECTORY");
    aliasMap.set("encryption_client", "ENCRYPTION_CLIENT");
    aliasMap.set("encryption_types_client", "ENCRYPTION_TYPES_CLIENT");
    aliasMap.set("crypto_checksum_client", "CRYPTO_CHECKSUM_CLIENT");
    aliasMap.set("crypto_checksum_types_client", "CRYPTO_CHECKSUM_TYPES_CLIENT");
    aliasMap.set("pool_connection_class", "POOL_CONNECTION_CLASS");
    aliasMap.set("pool_purity", "POOL_PURITY");
    aliasMap.set("service_tag", "SERVICE_TAG");
    aliasMap.set("connection_id_prefix", "CONNECTION_ID_PREFIX");
    return aliasMap;
  }
}module.exports = EZConnectResolver;
