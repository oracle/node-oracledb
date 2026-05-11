.. _pipelineclass:

*******************
API: Pipeline Class
*******************

Pipeline objects represent a pipeline used to execute multiple database
operations concurrently. This class can be used to create Pipeline objects.

.. note::

    True pipelining is only supported in Oracle AI Database 26ai (or later)
    when using node-oracledb Thin mode.

See :ref:`pipelining` for more information.

.. versionadded:: 7.0

.. _pipelinemethods:

Pipeline Methods
================

.. method:: pipeline.addCommit()

    .. code-block:: javascript

        addCommit();

    This synchronous method adds a commit operation to the pipeline.

.. method:: pipeline.addExecute()

    .. code-block:: javascript

        addExecute(String statement [, Object parameters [, Object options]]);
        addExecute(String statement [, Array parameters [, Object options]]);

    This synchronous method adds a statement execution operation to the
    pipeline using the specified parameters.

    Do not use this for queries that return rows. Instead use
    :meth:`pipeline.addFetchAll()`, :meth:`pipeline.addFetchMany()`, or
    :meth:`pipeline.addFetchOne()`.

    The parameters of the ``pipeline.addExecute()`` method are:

    .. _addexecute:

    .. list-table-with-summary:: pipeline.addExecute() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``statement``
          - String
          - The SQL statement to be executed.
        * - ``parameters``
          - Object or Array
          - The values or variables to be bound to the executed statement. This parameter is needed if there are bind parameters in the SQL statement.

            It can either be an object that associates values or JavaScript variables to the statement's bind variables by name, or an array of values or JavaScript variables that associate to the statement's bind variables by their relative positions. See :ref:`Bind Parameters for Prepared Statements <bind>` for more details on binding.

            If a bind value is an object, this parameter may have properties similar to the :ref:`bindParams <executebindParams>` of :meth:`connection.execute()`. For more information on these properties, see :ref:`bindParams Parameter Properties <executebindparamsproperties>`.
        * - ``options``
          - Object
          - The optional parameter that may be used to control statement execution.

            The properties that can be specified in this parameter are ``autoCommit``, ``fetchArraySize``, ``maxRows``, ``outFormat``, and ``prefetchRows``. For more information on these properties, see :ref:`executeoptionsparams`.

            Using an option that is not supported in ``addExecute()`` will raise the ``NJS-182 - Execute option '<option-name>' is not supported in pipeline mode`` error.

.. method:: pipeline.addExecuteMany()

    .. code-block:: javascript

        addExecuteMany(String statement, Array parameters [, Object options]);
        addExecuteMany(String statement, Number numIterations [, Object options]);

    This synchronous method adds a batch statement execution operation to the
    pipeline using the specified parameters. This can be used to insert,
    update, or delete multiple rows in a table. It can also invoke a PL/SQL
    procedure multiple times.

    The parameters of the ``pipeline.addExecuteMany()`` method are:

    .. _addexecutemany:

    .. list-table-with-summary:: pipeline.addExecuteMany() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``statement``
          - String
          - The SQL or PL/SQL statement to be executed.
        * - ``parameters``
          - Array
          - The values or variables to be bound to the executed statement. It must be an array of arrays (for 'bind by position') or an array of objects whose keys match the bind variable names in the SQL statement (for 'bind by name').
        * - ``numIterations``
          - Number
          - The number of iterations. This parameter is used if there are no bind values, or values have been previously bound.
        * - ``options``
          - Object
          - The optional parameter that may be used to control statement execution.

            The properties that can be specified in this parameter are ``autoCommit``, ``fetchArraySize``, ``maxRows``, ``outFormat``, ``prefetchRows``, and ``bindDefs``. For more information on these properties, see :ref:`optionsexecutemany`.

            Using an option that is not supported in ``addExecuteMany()`` will raise the ``NJS-182 - Execute option '<option-name>' is not supported in pipeline mode`` error.

.. method:: pipeline.addFetchAll()

    .. code-block:: javascript

        addFetchAll(String statement [, Object parameters [, Object options [, Number fetchArraySize [, Boolean fetchLobs]]]]);
        addFetchAll(String statement [, Array parameters [, Object options [, Number fetchArraySize [, Boolean fetchLobs]]]]);

    This synchronous method adds a fetch operation to the pipeline that
    returns all of the rows.

    The parameters of the ``pipeline.addFetchAll()`` method are:

    .. _addfetchall:

    .. list-table-with-summary:: pipeline.addFetchAll() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``statement``
          - String
          - The SQL or PL/SQL statement to be executed.
        * - ``parameters``
          - Object or Array
          - The values or variables to be bound to the executed statement. This parameter is needed if there are bind parameters in the SQL statement.

            It can either be an object that associates values or JavaScript variables to the statement's bind variables by name, or an array of values or JavaScript variables that associate to the statement's bind variables by their relative positions. See :ref:`Bind Parameters for Prepared Statements <bind>` for more details on binding.

            If a bind value is an object, this parameter may have properties similar to the :ref:`bindParams <executebindParams>` of :meth:`connection.execute()`. For more information on these properties, see :ref:`bindParams Parameter Properties <executebindparamsproperties>`.
        * - ``options``
          - Object
          - The optional parameter that may be used to control statement execution.

            The properties that can be specified in this parameter are ``autoCommit``, ``fetchArraySize``, ``maxRows``, ``outFormat``, and ``prefetchRows``. For more information on these properties, see :ref:`executeoptionsparams`.

            Using an option that is not supported in ``addFetchAll()`` will raise the ``NJS-182 - Execute option '<option-name>' is not supported in pipeline mode`` error.
        * - ``fetchArraySize``
          - Number
          - The size of an internal buffer that is used for fetching query rows from Oracle Database.
        * - ``fetchLobs``
          - Boolean
          - Determines whether to return LOB objects, or string or buffer value when fetching LOB columns.

            The default value is *true*.

.. method:: pipeline.addFetchMany()

    .. code-block:: javascript

        addFetchMany(String statement [, Object parameters [, Object options [, Number numRows [, Boolean fetchLobs]]]]);
        addFetchMany(String statement [, Array parameters [, Object options [, Number numRows [, Boolean fetchLobs]]]]);

    This synchronous method adds a fetch operation to the pipeline that
    returns up to the specified number of rows.

    The parameters of the ``pipeline.addFetchMany()`` method are:

    .. _addfetchmany:

    .. list-table-with-summary:: pipeline.addFetchMany() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``statement``
          - String
          - The SQL or PL/SQL statement to be executed.
        * - ``parameters``
          - Object or Array
          - The values or variables to be bound to the executed statement. This parameter is needed if there are bind parameters in the SQL statement.

            It can either be an object that associates values or JavaScript variables to the statement's bind variables by name, or an array of values or JavaScript variables that associate to the statement's bind variables by their relative positions. See :ref:`Bind Parameters for Prepared Statements <bind>` for more details on binding.

            If a bind value is an object, this parameter may have properties similar to the :ref:`bindParams <executebindParams>` of :meth:`connection.execute()`. For more information on these properties, see :ref:`bindParams Parameter Properties <executebindparamsproperties>`.
        * - ``options``
          - Object
          - The optional parameter that may be used to control statement execution.

            The properties that can be specified in this parameter are ``autoCommit``, ``fetchArraySize``, ``maxRows``, ``outFormat``, and ``prefetchRows``. For more information on these properties, see :ref:`executeoptionsparams`.

            Using an option that is not supported in ``addFetchMany()`` will raise the ``NJS-182 - Execute option '<option-name>' is not supported in pipeline mode`` error.
        * - ``numRows``
          - Number
          - The number of rows to be fetched when performing a query of a specific number of rows.

            The default value is the value of :attr:`oracledb.fetchArraySize`.
        * - ``fetchLobs``
          - Boolean
          - Determines whether to return LOB objects, or string or buffer value when fetching LOB columns.

            The default value is *true*.

.. method:: pipeline.addFetchOne()

    .. code-block:: javascript

        addFetchOne(String statement [, Object parameters [, Object options [, Boolean fetchLobs]]]);
        addFetchOne(String statement [, Array parameters [, Object options [, Boolean fetchLobs]]]);

    This synchronous method adds a fetch operation to the pipeline that
    returns at most one row.

    The parameters of the ``pipeline.addFetchOne()`` method are:

    .. _addfetchone:

    .. list-table-with-summary:: pipeline.addFetchOne() Parameters
        :header-rows: 1
        :class: wy-table-responsive
        :align: center
        :widths: 10 10 30
        :summary: The first column displays the name of the parameter. The second column displays the data type of the parameter. The third column displays the description of the parameter.

        * - Parameter
          - Data Type
          - Description
        * - ``statement``
          - String
          - The SQL or PL/SQL statement to be executed.
        * - ``parameters``
          - Object or Array
          - The values or variables to be bound to the executed statement. This parameter is needed if there are bind parameters in the SQL statement.

            It can either be an object that associates values or JavaScript variables to the statement's bind variables by name, or an array of values or JavaScript variables that associate to the statement's bind variables by their relative positions. See :ref:`Bind Parameters for Prepared Statements <bind>` for more details on binding.

            If a bind value is an object, this parameter may have properties similar to the :ref:`bindParams <executebindParams>` of :meth:`connection.execute()`. For more information on these properties, see :ref:`bindParams Parameter Properties <executebindparamsproperties>`.
        * - ``options``
          - Object
          - The optional parameter that may be used to control statement execution.

            The properties that can be specified in this parameter are ``autoCommit``, ``fetchArraySize``, ``maxRows``, ``outFormat``, and ``prefetchRows``. For more information on these properties, see :ref:`executeoptionsparams`.

            Using an option that is not supported in ``addFetchOne()`` will raise the ``NJS-182 - Execute option '<option-name>' is not supported in pipeline mode`` error.
        * - ``fetchLobs``
          - Boolean
          - Determines whether to return LOB objects, or string or buffer value when fetching LOB columns.

            The default value is *true*.
