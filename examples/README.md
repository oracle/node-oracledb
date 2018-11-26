# Node-oracledb Examples

This directory contains [node-oracledb](https://www.npmjs.com/package/oracledb) examples.

To run the examples:

- [Install node-oracledb](https://oracle.github.io/node-oracledb/INSTALL.html#quickstart).


- Edit `dbconfig.js` and set your username, password and the database
connection string:

  ```
  module.exports = {
      user: "hr",
      password: "welcome",
      connectString:"localhost/orclpdb"
  };

  ```

- Then run the samples like:

  ```
  node example.js
  ```

- Some example require schema objects created by `demo.sql`.  For
  example, to load them in the HR schema run:

  ```
  sqlplus hr/welcome@localhost/orclpdb @demo.sql
  ```

  The demonstration objects can be dropped with `demodrop.sql`:

  ```
  sqlplus hr/welcome@localhost/orclpdb @demodrop.sql
  ```
