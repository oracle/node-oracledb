---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

**See https://www.oracle.com/corporate/security-practices/assurance/vulnerability/reporting.html for how to report security issues**.

1. With the async/await programming style, make sure you are using 'await' in the right places.

2. Is it an error or a hang or a crash?

3. What error(s) you are seeing?
**Cut and paste text showing the command you ran.  No screenshots.  Use a gist for long screen output and logs: see https://gist.github.com/**.

4. Include a runnable Node.js script that shows the problem.
Include all SQL needed to create the database schema.  Use Markdown syntax, see https://help.github.com/github/writing-on-github/basic-writing-and-formatting-syntax

5. Run node and show the output of:

```
process.platform
process.version
process.arch
require('oracledb').versionString
require('oracledb').oracleClientVersionString
```

6. What is your Oracle Database version?
