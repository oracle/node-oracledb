---
name: Bug report
about: Create a report to help us improve
title: ''
labels: bug
assignees: ''

---

Starting from node-oracledb 6.0 onwards, we have the 'Thin' and 'Thick' modes. 
The Thin mode is written purely in JavaScript and does not require Oracle Client libraries to connect to Oracle Database. We have also made Thin mode as the default mode starting from node-oracledb 6.0. 
The Thick mode requires Oracle Client libraries and works similar to node-oracledb 5.5 and earlier versions.

Please see the following blogs to understand the  Thin and Thick modes in node-oracledb:

[Node-oracledb 6.0](https://medium.com/oracledevs/usher-in-a-new-era-with-the-node-oracledb-6-0-pure-javascript-thin-driver-e10e2af693b2)

[How do I choose between Thin and Thick modes](https://itnext.io/how-do-i-choose-between-thin-and-thick-modes-in-node-oracledb-6-0-c516d202a71f)


<!--

Thank you for using node-oracledb.

**See https://www.oracle.com/corporate/security-practices/assurance/vulnerability/reporting.html for how to report security issues**.

Please answer these questions so we can help you.

Use Markdown syntax, see https://docs.github.com/github/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax

-->

1. What versions are you using?

<!--

Give your database version.

Also run Node.js and show the output of:

    process.platform
    process.version
    process.arch
    require('oracledb').versionString
    require('oracledb').oracleClientVersionString

-->

2. Is it an error or a hang or a crash?

3. What error(s) or behavior you are seeing?

<!--

Cut and paste text showing the command you ran.  No screenshots.

Use a gist for long screen output and logs: see https://gist.github.com/

-->

4. Include a runnable Node.js script that shows the problem.

<!--

Include all SQL needed to create the database schema.

Use a gist for long code: see https://gist.github.com/

Format code by using three backticks on a line before and after code snippets, for example:

```
const oracledb = require('oracledb');
```

-->
