---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

1. With the async/await programming style, make sure you are using 'await' in the right places.

2. What error(s) you are seeing? 
**Cut and paste text showing the command you ran.  No screenshots. Use a gist for screen output and logs: see https://gist.github.com/ Do not paste long output into this issue**.

3. Is it a hang or a crash?

4. Include a runnable Node.js script that shows the problem.
Include all SQL needed to create the database schema.

5. Show the output of these in the version of Node.js you are installing on:

```
process.platform
process.version
process.arch
require('oracledb').versionString
```

6. What is your Oracle Database version?
