*Delete unnecessary parts of this template.*

### For general questions:

Describe exactly what you did and what you want to happen.
Use the questions at the bottom of this template as a guide.

Use Markdown syntax, particularly for code blocks: see https://help.github.com/articles/basic-writing-and-formatting-syntax/#quoting-code

Use a gist for screen output and logs: see https://gist.github.com/ **Do not paste long output into this issue**.

### For security issues:

See https://www.oracle.com/support/assurance/vulnerability-remediation/reporting-security-vulnerabilities.html for how to report security issues.

### For installation issues:

- Review the install instructions https://oracle.github.io/node-oracledb/INSTALL.html

- Review the troubleshooting tips https://oracle.github.io/node-oracledb/INSTALL.html#troubleshooting

#### Answer the following questions:

1. What is your Node.js version: use `console.log(process.version)`?  Is it 64-bit or 32-bit: use `console.log(process.arch)`?

2. What is your node-oracledb version: use `console.log(oracledb.versionString)`?

3. What *exact* command caused the problem (e.g. what command did you try to install with)?  Who were you logged in as?

4. What error(s) you are seeing?

5. What OS (and version) is Node.js executing on: use `console.log(process.platform)`?

6. What is your Oracle client (e.g. Instant Client) version: use `console.log(oracledb.oracleClientVersionString)`?  Is it 64-bit or 32-bit?  How was it installed?  Where is it installed?

7. What is your Oracle Database version: use `console.log(connection.oracleServerVersionString)`?

8. What is the `PATH` environment variable (on Windows) or `LD_LIBRARY_PATH` (on Linux) set to?  On macOS, what is in `~/lib`?

9. What Oracle environment variables did you set?  How *exactly* did you set them?

10. Do you have a small, single Node.js script that immediately runs to show us the problem?
