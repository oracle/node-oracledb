---
name: Installation Problems
about: Use this for node-oracledb installation questions
title: ''
labels: install & configuration
assignees: ''

---

<!--

Thank you for using node-oracledb.

Do these before creating a new issue:

    Review and follow the Installation Instructions: https://oracle.github.io/node-oracledb/INSTALL.html

    Review the troubleshooting tips https://oracle.github.io/node-oracledb/INSTALL.html#troubleshooting

    Review the user manual: https://oracle.github.io/node-oracledb/doc/api.html.

If you have a `DPI-1047`, `DPI-1050` or `DPI-1072` error, re-review the links above.

Please answer these questions so we can help you.

GitHub issues that are not updated for a month may be automatically closed.  Feel free to update them at any time.

-->

1. What versions are you using?

<!--

Give your database version.

Also run node and show the output of:

    process.platform
    process.version
    process.arch
    require('oracledb').versionString
    require('oracledb').oracleClientVersionString

-->

2. Describe the problem.

<!-- Cut and paste text showing the command you ran.  No screenshots. -->

3. Are you installing into vanilla Node.js, or using something like Electron?

4. Show the directory listing where your Oracle Client libraries are installed (e.g. the Instant Client directory).  Is it 64-bit or 32-bit?

5. Show what the `PATH` environment variable (on Windows) or `LD_LIBRARY_PATH` (on Linux) are set to?

6. Show any Oracle environment variables set (e.g. ORACLE_HOME, ORACLE_BASE).
