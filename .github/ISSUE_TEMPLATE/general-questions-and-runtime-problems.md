---
name: General Questions and Runtime Problems
about: For general node-oracledb questions
title: ''
labels: question
assignees: ''

---

1. Review the [user manual](https://oracle.github.io/node-oracledb/doc/api.html)

2. Describe the problem
**Cut and paste text showing the command you ran.  No screenshots.  Use a gist for long screen output and logs: see https://gist.github.com/**.

3. Include a runnable Node.js script that shows the problem.
Include all SQL needed to create the database schema.  Use Markdown syntax, see https://help.github.com/github/writing-on-github/basic-writing-and-formatting-syntax

   The more details you give, the more we can help.

4. Run node and show the output of:

```
process.platform
process.version
process.arch
require('oracledb').versionString
require('oracledb').oracleClientVersionString
```

5. What is your Oracle Database version?
