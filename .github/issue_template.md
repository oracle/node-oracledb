*Delete irrelevant parts of this template.*

### For general questions:

Describe exactly what you did and what you want to happen.
Use the questions at the bottom of this template as a guide.

Use Markdown syntax, particularly for code blocks: see https://help.github.com/articles/basic-writing-and-formatting-syntax/#quoting-code

### For security issues:

See https://www.oracle.com/support/assurance/vulnerability-remediation/reporting-security-vulnerabilities.html for how to report security issues.

### For installation issues:

Use a gist for screen output and logs: see https://gist.github.com/
**Do not paste long output into this issue**

Review the install instructions at https://github.com/oracle/node-oracledb/blob/master/INSTALL.md

Use `npm install --verbose oracledb`.  Review your output and logs.
Try to install in a different way.  **Google anything that looks like an error.**  Try some potential solutions.

For Node 4 onwards, you need a compiler with C++11 support.  On Linux use GCC 4.7 or later.

Did the error indicate a network connection issue?  Do you need to set `http_proxy`?

Try running `npm cache clean` and deleting the `node_modules/oracledb` directory.

Do you have an old version of `node-gyp` installed?  Try updating it.  Also try deleting `$HOME/.node-gyp` or equivalent.

#### Answer the following questions:

1. What is your version of Node.js?  Run examples/version.js to find versions.

2. What version of node-oracledb are you using?

3. What is the version of your Oracle client (e.g. Instant Client)?  How was it installed?  Where it is installed?

4. What is the version of Oracle Database?

5. What is your OS and version?

6. What compiler version did you use?  For example, with GCC, run `gcc --version`

7. What environment variables did you set?  How *exactly* did you set them?

8. What *exact* command caused the problem (e.g. what command did you try to install with)?  Who were you logged in as?

9. What error(s) you are seeing?
