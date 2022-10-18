.. _nls:

*************************************************
Globalization and National Language Support (NLS)
*************************************************

Node-oracledb can use Oracle’s `National Language Support
(NLS) <https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=NLSPG>`__
to assist in globalizing applications.

Node-oracledb always uses Oracle’s AL32UTF8 character set internally.
Data will be converted between AL32UTF8 and the database character set
when it is inserted into, or queried from, the database. The environment
variable ``NLS_LANG`` can be used to configure the Oracle ‘client’
(i.e. node-oracledb) language and territory only. For information on
``NLS_LANG``, see `NLS_LANG Frequently Asked
Questions <https://www.oracle.com/database/technologies/faq-nls-lang.html>`__.

Oracle NLS environment variables, or statements like ``ALTER SESSION``,
can be used to configure further aspects of node-oracledb data access
globalization. Examples are ``NLS_NUMERIC_CHARACTERS`` (discussed in
:ref:`Fetching Numbers <numberhandling>`), and ``NLS_DATE_FORMAT``
(discussed in :ref:`Fetching Numbers and Dates as String
<fetchasstringhandling>`). Refer to `NLS Documentation <https://www.oracle.
com/pls/topic/lookup?ctx=dblatest&id=GUID-D5C74C82-8622-46F4-8760-
0F8ABA28A816>`__ for others.

To find the database character set, execute the query:

.. code:: sql

   SELECT value AS db_charset
   FROM nls_database_parameters
   WHERE parameter = 'NLS_CHARACTERSET'

To find the database `‘national character set’ <https://www.oracle.com/pls/
topic/lookup?ctx=dblatest&id=GUID-AA8D783D-7337-4A61-BD7D-5DB580C46D9A>`__
used for NCHAR and related types, execute the query:

.. code:: sql

   SELECT value AS db_ncharset
   FROM nls_database_parameters
   WHERE parameter = 'NLS_NCHAR_CHARACTERSET'

The general Oracle statement to find the ‘client’ character set is:

.. code:: sql

   SELECT DISTINCT client_charset AS client_charset
   FROM v$session_connect_info
   WHERE sid = SYS_CONTEXT('USERENV', 'SID');

In node-oracledb this will always show AL32UTF8.
