*Delete irrelevant parts of this template.*

### For general questions:

Describe exactly what you did and what you want to happen.
Use the questions at the bottom of this template as a guide.

Use Markdown syntax, particularly for code blocks: see https://help.github.com/articles/basic-writing-and-formatting-syntax/

### For security issues:

See https://www.oracle.com/support/assurance/vulnerability-remediation/reporting-security-vulnerabilities.html for how to report security issues.

### For installation issues:

Use a gist for screen output and logs: see https://gist.github.com/
**Do not paste long output into this issue**

Review the install instructions at https://github.com/oracle/node-oracledb/blob/master/INSTALL.md

Use the `--verbose` option for `npm install oracledb`.  Review your output and logs.
Try to install in a different way.  **Google anything that looks like an error.**  Try some potential solutions.

For Node 4 onwards, you need a compiler with C++11 support.  On Linux use GCC 4.7 or later.

Did the error indicate a network connection issue?  Do you need to set `http_proxy`?

Try running `npm cache clean` and deleting the `node_modules/oracledb` directory.

Do you have an old version of `node-gyp` installed?  Try updating it.  Also try deleting `$HOME/.node-gyp` or equivalent.

#### Answer the following questions:

1. What error(s) you are seeing?

2. What *exact* command caused the problem (e.g. what command did you try to install with)?  Who were you logged in as?

3. What environment variables did you set?  How *exactly* did you set them?

4. What is your version of Node.js?

5. What is your version of the Oracle client (e.g. Instant Client)?  How was it installed?  Where it is installed?

6. What is your OS and version?

7. What compiler version did you use?  For example, with GCC, run `gcc --version`
