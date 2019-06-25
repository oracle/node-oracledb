---
name: Installation Questions
about: Use this for node-oracledb installation questions
title: ''
labels: install & configuration
assignees: ''

---

# Do these first

- Review and follow the [installation instructions](https://oracle.github.io/node-oracledb/INSTALL.html) 

- Review the [troubleshooting tips](https://oracle.github.io/node-oracledb/INSTALL.html#troubleshooting) 

- If you have a `DPI-1047` error, review both the above again before opening an issue.

# Answer the following questions

1. What error(s) you are seeing? 
**Cut and paste text showing the command you ran.  No screenshots. Use a gist for screen output and logs: see https://gist.github.com/ Do not paste long output into this issue**.

2. Run node and show the output of:

```
process.platform
process.version
process.arch
```

3. Are you installing into vanilla Node.js, or using something like Electron?

4. Show the directory listing where your Oracle client libraries are installed (e.g. the Instant Client directory).  Is it 64-bit or 32-bit?  

5. Show what the `PATH` environment variable (on Windows) or `LD_LIBRARY_PATH` (on Linux) are set to?  On macOS, show what is in `~/lib`.

6. Show any Oracle environment variables set (e.g. ORACLE_HOME, ORACLE_BASE).
