// Type definitions for oracledb v1.6.0
// Project: https://github.com/oracle/node-oracledb
// Definitions by: Richard Natal <https://github.com/Bigous>
// Definitions: https://github.com/oracle/node-oracledb

/// <reference path="./typings/main.d.ts" />

declare module 'oracledb' {
	import * as stream from "stream";

	export interface ILob {
		/** [Read-Only] This corresponds to the size used by the Oracle LOB layer when accessing or modifying the LOB value. */
		chunkSize: number;
		/** [Read-Only] Length of a queried LOB in bytes (for BLOBs) or characters (for CLOBs). */
		length: number;
		/**
		 * The number of bytes (for BLOBs) or characters (for CLOBs) to read for each Stream 'data' event of a queried LOB.
		 * The default value is chunkSize.
		 * For efficiency, it is recommended that pieceSize be a multiple of chunkSize.
		 * The maximum value for pieceSize is limited to the value of UINT_MAX.
		 */
		pieceSize: number;
		offset?: number;
		/** [Read-Only] This read-only attribute shows the type of Lob being used. It will have the value of one of the constants Oracledb.BLOB or Oracledb.CLOB. The value is derived from the bind type when using LOB bind variables, or from the column type when a LOB is returned by a query. */
		type: string;
		/**
		 * Release method on ILob class.
		 * @remarks The cleanup() called by Release() only frees OCI error handle and Lob
		 *          locator.  These calls acquire mutex on OCI environment handle very briefly.
		 */
		release?(): void;
		/**
		 * Read method on ILob class.
		 * @param {(err : any, chunk: string | Buffer) => void} callback Callback to recive the data from lob.
		 * @remarks CLobs send strings while BLobs send Buffer object.
		 */
		read?(callback: (err: any, chunk: string | Buffer) => void): void;
		/**
		 * Read method on ILob class.
		 * @param {Buffer} data Data write into Lob.
		 * @param {(err: any) => void} callback Callback executed when writ is finished or when some error occured.
		 * @remarks CLobs send strings while BLobs send Buffer object.
		 */
		write?(data: Buffer, callback: (err: any) => void): void;
	}

	export interface Lob extends stream.Duplex {
		/** Internal - do not use it. */
		iLob: ILob;
		/** [Read-Only] This corresponds to the size used by the Oracle LOB layer when accessing or modifying the LOB value. */
		chunkSize: number;
		/** [Read-Only] Length of a queried LOB in bytes (for BLOBs) or characters (for CLOBs). */
		length: number;
		/**
		 * The number of bytes (for BLOBs) or characters (for CLOBs) to read for each Stream 'data' event of a queried LOB.
		 * The default value is chunkSize.
		 * For efficiency, it is recommended that pieceSize be a multiple of chunkSize.
		 * The maximum value for pieceSize is limited to the value of UINT_MAX.
		 */
		pieceSize: number;
		/** [Read-Only] This read-only attribute shows the type of Lob being used. It will have the value of one of the constants Oracledb.BLOB or Oracledb.CLOB. The value is derived from the bind type when using LOB bind variables, or from the column type when a LOB is returned by a query. */
		type: string;

		/**
		 * Do not call this... used internally by node-oracledb
		 */
		constructor(iLob: ILob, opts: stream.DuplexOptions): Lob;
		constructor(iLob: ILob): Lob;

		/**
		 * Closes the current LOB.
		 * @param  {(err: any) => void} callback? When passed, is called after the release.
		 * @returns void
		 */
		close(callback: (err: any) => void): void;
		close(): void;
	}

	export interface IConnectionAttributes {
		/**
		 * The database user name. Can be a simple user name or a proxy of the form alison[fred]. See the Client Access Through Proxy section in the OCI manual for more details about proxy authentication.
		 */
		user?: string;
		/**
		 * The password of the database user. A password is also necessary if a proxy user is specified.
		 */
		password?: string;
		/**
		 * The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
		 */
		connectString: string;
		/**
		 * The number of statements to be cached in the statement cache of each connection. This optional property may be used to override the stmtCacheSize property of the Oracledb object.
		 */
		stmtCacheSize?: number;
		/**
		 * If this optional property is true then the pool's connections will be established using External Authentication.
		 * This property overrides the Oracledb externalAuth property.
		 * The user and password properties should not be set when externalAuth is true.
		 * Note prior to node-oracledb 0.5 this property was called isExternalAuth.
		 */
		externalAuth?: boolean;
	}

	/**
	 * Provides connection credentials and pool-specific configuration properties, such as the maximum or minimum number of connections for the pool, or stmtCacheSize for the connections. The properties provided in the poolAttrs parameter override the default pooling properties in effect in the Oracledb object.
	 */
	export interface IPoolAttributes extends IConnectionAttributes {
		/**
		 * The maximum number of connections to which a connection pool can grow.
		 * This optional property may be used to override the corresponding property in the Oracledb object.
		 */
		poolMax?: number;
		/**
		 * The minimum number of connections a connection pool maintains, even when there is no activity to the target database. This optional property may be used to override the corresponding property in the Oracledb object.
		 */
		poolMin?: number;
		/**
		 * The number of connections that are opened whenever a connection request exceeds the number of currently open connections. This optional property may be used to override the corresponding property in the Oracledb object.
		 */
		poolIncrement?: number;
		/**
		 * The number of seconds after which idle connections (unused in the pool) may be terminated. Idle connections are terminated only when the pool is accessed. If the poolTimeout is set to 0, then idle connections are never terminated.
		 * This optional property may be used to override the corresponding property in the Oracledb object.
		 */
		poolTimeout?: number;
	}

	/**
	 * This execute() function parameter is needed if there are bind variables in the statement, or if options are used. It can be either an object that associates values or JavaScript variables to the statement's bind variables by name, or an array of values or JavaScript variables that associate to the statement's bind variables by their relative positions. 
	 */
	export interface IExecutionBinds {
		/**
		 * The direction of the bind. One of the Oracledb Constants BIND_IN, BIND_INOUT, or BIND_OUT.
		 */
		dir?: number;
		/**
		 * The number of array elements to be allocated for a PL/SQL Collection INDEX OF associative array OUT or IN OUT array bind variable.
		 */
		maxArraySize?: number;
		/**
		 * The maximum number of bytes that an OUT or IN OUT bind variable of type STRING or BUFFER can use. The default value is 200. The maximum limit is 32767.
		 */
		maxSize?: number;
		/**
		 * The datatype to be bound. One of the Oracledb Constants STRING, NUMBER, DATE, CURSOR or BUFFER.
		 */
		type?: number;
		/**
		 * The input value or variable to be used for an IN or IN OUT bind variable.
		 */
		val?: any;
	}

	export interface IExecuteOptions {
		/** Maximum number of rows that will be retrieved. Used when resultSet is false. */
		maxRows?: number;
		/** Number of rows to be fetched in advance. */
		prefetchRows?: number;
		/** Result format - ARRAY o OBJECT */
		outFormat?: number;
		/** Should use ResultSet or not. */
		resultSet?: boolean;
		/** Transaction should auto commit after each statement? */
		autoCommit?: boolean;
		/**
		 * Object defining how query column data should be represented in JavaScript.
		 * The fetchInfo property can be used to indicate that number or date columns in a query should be returned as strings instead of their native format. The property can be used in conjunction with, or instead of, the global setting fetchAsString.
		 * 
		 * For example:
		 * 
		 * fetchInfo:
		 * {
		 *   "HIRE_DATE":      { type : oracledb.STRING },  // return the date as a string
		 *   "COMMISSION_PCT": { type : oracledb.DEFAULT }  // override Oracledb.fetchAsString
		 * }
		 */
		fetchInfo?: Object;
	}

	export interface IExecuteReturn {
		/** Number o rows affected by the statement (used for inserts / updates)*/
		rowsAffected?: number;
		/** When the statement has out parameters, it comes here. */
		outBinds?: Array<any> | Object;
		/** Metadata information - just columns names for now. */
		metaData?: Array<IMetaData>;
		/** When not using ResultSet, query results comes here. */
		rows?: Array<Array<any>> | Array<Object>;
		/** When using ResultSet, query results comes here. */
		resultSet?: IResultSet;
	}

	export interface IMetaData {
		/** Column name */
		columnName: string;
	}

	/**
	 * Result sets allow query results to fetched from the database one at a time, or in groups of rows. This enables applications to process very large data sets.
	 * Result sets should also be used where the number of query rows cannot be predicted and may be larger than a sensible maxRows size.
	 * A ResultSet object is obtained by setting resultSet: true in the options parameter of the Connection execute() method when executing a query. A ResultSet is also returned to node-oracledb when binding as type CURSOR to a PL/SQL REF CURSOR bind parameter.
	 * The value of prefetchRows can be adjusted to tune the performance of result sets.
	 */
	export interface IResultSet {
		/** Metadata information - just columns names for now. */
		metaData?: Array<IMetaData>;
		/**
		 * Closes a ResultSet. Applications should always call this at the end of fetch or when no more rows are needed.
		 * @param  {(err:any)=>void} callback Callback called on finish or when some error occurs
		 * @returns void
		 * @remarks After using a resultSet, it must be closed to free the resources used by the driver.
		 */
		close(callback: (err: any) => void): void;
		/**
		 * This call fetches one row of the result set as an object or an array of column values, depending on the value of outFormat.
		 * At the end of fetching, the ResultSet should be freed by calling close().
		 * @param  {(err:any,row:Array<any>|Object)=>void} callback Callback called when the row is available or when some error occurs.
		 * @returns void
		 */
		getRow(callback: (err: any, row: Array<any> | Object) => void): void;
		/**
		 * This call fetches numRows rows of the result set as an object or an array of column values, depending on the value of outFormat.
		 * At the end of fetching, the ResultSet should be freed by calling close().
		 * @param  {number} rowCount Number of rows to be fetched.
		 * @param  {(err:any,rows:Array<Array<any>>|Array<Object>)=>void} callback Callback called when the rows are available, or when some error occurs.
		 * @returns void
		 * @remarks When the number of rows passed to the callback is less than the rowCount, no more rows are available to be fetched.
		 */
		getRows(rowCount: number, callback: (err: any, rows: Array<Array<any>> | Array<Object>) => void): void;
	}

	export interface IConnection {
		/** Statement cache size in bytes (read-only)*/
		stmtCacheSize: number;
		/**
		 * The client identifier for end-to-end application tracing, use with mid-tier authentication, and with Virtual Private Databases.
		 * This is a write-only property. Displaying a Connection object will show a value of null for this attribute. See End-to-end Tracing, Mid-tier Authentication, and Auditing.
		 */
		clientId: string;
		/**
		 * The module attribute for end-to-end application tracing.
		 * This is a write-only property. Displaying a Connection object will show a value of null for this attribute. See End-to-end Tracing, Mid-tier Authentication, and Auditing.
		 */
		module: string;
		/**
		 * The action attribute for end-to-end application tracing.
		 * This is a write-only property. Displaying a Connection object will show a value of null for this attribute. See End-to-end Tracing, Mid-tier Authentication, and Auditing.
		 */
		action: string;
		/**
		 * This readonly property gives a numeric representation of the Oracle database version. For version a.b.c.d.e, this property gives the number: (100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e
		 */
		oracleServerVersion: number;

		/**
		 * This call executes a SQL or PL/SQL statement. See SQL Execution for examples.
		 * This is an asynchronous call.
		 * The statement to be executed may contain IN binds, OUT or IN OUT bind values or variables, which are bound using either an object or an array.
		 * A callback function returns a result object, containing any fetched rows, the values of any OUT and IN OUT bind variables, and the number of rows affected by the execution of DML statements.
		 * @param	{string} sql The SQL string that is executed. The SQL string may contain bind parameters.
		 * @param	{Object|Array<any>} Binds This function parameter is needed if there are bind parameters in the SQL statement.
		 * @param	{IExecuteOptions} options This is an optional parameter to execute() that may be used to control statement execution.
		 * @param	{(err: any, value: IExecuteReturn) => void} callback Callback function with the execution results.
		 */
		execute(sql: string,
				binds: IExecutionBinds | Array<any>,
				options: IExecuteOptions,
				callback: (err: any, value: IExecuteReturn) => void): void;
		execute(sql: string,
				binds: IExecutionBinds | Array<any>,
				callback: (err: any, value: IExecuteReturn) => void): void;
		execute(sql: string,
				callback: (err: any, value: IExecuteReturn) => void): void;

		/**
		 * Releases a connection. If the connection was obtained from the pool, the connection is returned to the pool.
		 * Note: calling release() when connections are no longer required is strongly encouraged. Releasing helps avoid resource leakage and can improve system efficiency.
		 * When a connection is released, any ongoing transaction on the connection is rolled back.
		 * After releasing a connection to a pool, there is no guarantee a subsequent getConnection() call gets back the same database connection. The application must redo any ALTER SESSION statements on the new connection object, as required.
		 * This is an asynchronous call.
		 * @param	{(err: any) => void} callback Callback function to be called when the connection has been released.
		 */
		release(callback: (err: any) => void): void;

		/**
		 * This call commits the current transaction in progress on the connection.
		 * This is an asynchronous call.
		 * @param	{(err: any) => void} callback Callback on commit done.
		 */
		commit(callback: (err: any) => void): void;

		/**
		 * SThis call rolls back the current transaction in progress on the connection.
		 * This is an asynchronous call.
		 * @param	{(err: any) => void} callback Callback on rollback done.
		 */
		rollback(callback: (err: any) => void): void;

		/**
		 * This call stops the currently running operation on the connection.
		 * If there is no operation in progress or the operation has completed by the time the break is issued, the break() is effectively a no-op.
		 * If the running asynchronous operation is interrupted, its callback will return an error.
		 * This is an asynchronous call.
		 * @param	{(err: any) => void} callback Callback on break done.
		 */
		break(callback: (err: any) => void): void;
	}

	export interface IConnectionPool {
		/** The maximum number of connections that can be open in the connection pool. */
		poolMax: number;
		/** The minimum number of connections a connection pool maintains, even when there is no activity to the target database. */
		poolMin: number;
		/** The number of connections that are opened whenever a connection request exceeds the number of currently open connections. */
		poolIncrement: number;
		/** The time (in seconds) after which the pool terminates idle connections (unused in the pool). The number of connection does not drop below poolMin. */
		poolTimeout: number;
		/** The number of currently open connections in the underlying connection pool. */
		connectionsOpen: number;
		/** The number of currently active connections in the connection pool i.e. the number of connections currently checked-out using getConnection(). */
		connectionsInUse: number;
		/**
		 * The number of statements to be cached in the statement cache of each connection.
		 * The default is the stmtCacheSize property of the Oracledb object when the pool is created.
		 */
		stmtCacheSize: number;
		/**
		 * This call terminates the connection pool.
		 * Any open connections should be released with release() before terminate() is called.
		 * This is an asynchronous call.
		 * @param  {(err:any)=>void} callback Callback called when the pool is terminated or when some error occurs
		 * @returns void
		 */
		terminate(callback: (err: any) => void): void;
		/**
		 * This method obtains a connection from the connection pool.
		 * If a previously opened connection is available in the pool, that connection is returned. If all connections in the pool are in use, a new connection is created and returned to the caller, as long as the number of connections does not exceed the specified maximum for the pool. If the pool is at its maximum limit, the getConnection() call results in an error, such as ORA-24418: Cannot open further sessions.
		 * This is an asynchronous call.
		 * @param  {(err:any,connection:IConnection)=>void} callback Callback called when the connection is available or when some error occurs.
		 * @returns void
		 * @see {@link https://jsao.io/2015/03/making-a-wrapper-module-for-the-node-js-driver-for-oracle-database/}
		 * @see {@link https://github.com/OraOpenSource/orawrap}
		 */
		getConnection(callback: (err: any, connection: IConnection) => void): void;
	}

	/** For execute(): Used with fetchInfo to reset the fetch type to the database type */
	export const DEFAULT: number;
	/** For execute(): Bind as JavaScript string type */
	export const STRING: number;
	/** For execute(): Bind as JavaScript number type.  Can also be used for fetchAsString and fetchInfo */
	export const NUMBER: number;
	/** For execute(): Bind as JavaScript date type.  Can also be used for fetchAsString and fetchInfo */
	export const DATE: number;
	/** For execute(): Bind a REF CURSOR to a node-oracledb ResultSet class */
	export const CURSOR: number;
	/** For execute(): Bind a RAW to a Node.js Buffer */
	export const BUFFER: number;
	/** For execute(): Bind a CLOB to a Node.js Stream */
	export const CLOB: number;
	/** For execute(): Bind a BLOB to a Node.js Stream */
	export const BLOB: number;
	/** For execute(): Direction for IN binds */
	export const BIND_IN: number;
	/** For execute(): Direction for IN OUT binds */
	export const BIND_INOUT: number;
	/** For execute(): Direction for OUT binds */
	export const BIND_OUT: number;
	/** For outFormat: Fetch each row as array of column values */
	export const ARRAY: number;
	/** For outFormat: Fetch each row as an object */
	export const OBJECT: number;

	/**
	 * Do not use this method - used internally by node-oracledb.
	 */
	export function newLob(iLob: ILob): Lob;

	/**
	 * Obtains a connection directly from an Oracledb object.
	 * These connections are not pooled. For situations where connections are used infrequently, this call may be more efficient than creating and managing a connection pool. However, in most cases, Oracle recommends getting new connections from a connection pool.
	 * This is an asynchronous call.
	 * @param  {IConnectionAttributes} connectionAttributes Parameters to stablish the connection.
	 * @param  {(err:any,connection:IConnection)=>void} callback Callback to run when the connection gets stablished or when some error occurs.
	 * @returns void
	 */
	export function getConnection(connectionAttributes: IConnectionAttributes, callback: (err: any, connection: IConnection) => void): void;

	/**
	 * This method creates a pool of connections with the specified username, password and connection string.
	 * This is an asynchronous call.
	 * Internally, createPool() creates an OCI Session Pool for each Pool object.
	 * The default properties may be overridden by specifying new properties in the poolAttrs parameter.
	 * A pool should be terminated with the terminate() call.
	 *
	 * @param  {IPoolAttributes} poolAttributes Parameters to stablish the connection pool.
	 * @param  {(err:any,connection:IConnectionPool)=>void} callback Callback to run when the connection pool gets created or when some error occurs.
	 * @returns void
	 */
	export function createPool(poolAttributes: IPoolAttributes, callback: (err: any, connection: IConnectionPool) => void): void;


	/**
	 * If this property is true, then the transaction in the current connection is automatically committed at the end of statement execution.
	 * The default value is false.
	 * This property may be overridden in an execute() call.
	 * Note prior to node-oracledb 0.5 this property was called isAutoCommit.
	 */
	export var autoCommit: boolean;

	/** 
	 * If this property is true then connections are established using external authentication. See External Authentication for more information.
	 * The default value is false.
	 * The user and password properties for connecting or creating a pool should not be set when externalAuth is true.
	 * This property can be overridden in the Oracledb getConnection() or createPool() calls.
	 * Note prior to node-oracledb 0.5 this property was called isExternalAuth.
	 */
	export var externalAuth: boolean;

	/**
	 * The maximum number of connections to which a connection pool can grow.
	 * The default value is 4.
	 * This property may be overridden when creating the connection pool.
	 */
	export var poolMax: number;

	/**
	 * The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
	 * The default value is 0.
	 * This property may be overridden when creating a connection pool.
	 */
	export var poolMin: number;

	/**
	 * The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
	 * The default value is 1.
	 * This property may be overridden when creating a connection pool.
	 */
	export var poolIncrement: number;

	/**
	 * The number of seconds after which idle connections (unused in the pool) are terminated. Idle connections are terminated only when the pool is accessed. If the poolTimeout is set to 0, then idle connections are never terminated.
	 * The default value is 60.
	 * This property may be overridden when creating a connection pool.
	 */
	export var poolTimeout: number;

	/**
	 * The number of statements that are cached in the statement cache of each connection.
	 * The default value is 30.
	 * This property may be overridden for specific Pool or Connection objects.
	 * In general, set the statement cache to the size of the working set of statements being executed by the application. Statement caching can be disabled by setting the size to 0.
	 */
	export var stmtCacheSize: number;

	/**
	 * The number of additional rows the underlying Oracle client library fetches whenever node-oracledb requests query data from the database.
	 * Prefetching is a tuning option to maximize data transfer efficiency and minimize round-trips to the database. The prefetch size does not affect when, or how many, rows are returned by node-oracledb to the application. The cache management is transparently handled by the Oracle client libraries.
	 * prefetchRows is ignored unless a ResultSet is used.
	 * The default value is 100.
	 * This property may be overridden in an execute() call.
	 */
	export var prefetchRows: number;

	/**
	 * The maximum number of rows that are fetched by the execute() call of the Connection object when not using a ResultSet. Rows beyond this limit are not fetched from the database.
	 * The default value is 100.
	 * This property may be overridden in an execute() call.
	 * To improve database efficiency, SQL queries should use a row limiting clause like OFFSET / FETCH or equivalent. The maxRows property can be used to stop badly coded queries from returning unexpectedly large numbers of rows.
	 * Adjust maxRows as required by each application or query. Values that are larger than required can result in sub-optimal memory usage.
	 * maxRows is ignored when fetching rows with a ResultSet.
	 * When the number of query rows is relatively big, or can't be predicted, it is recommended to use a ResultSet. This prevents query results being unexpectedly truncated by the maxRows limit and removes the need to oversize maxRows to avoid such truncation.
	 */
	export var maxRows: number;

	/**
	 * The format of rows fetched when using the execute() call. This can be either of the Oracledb constants ARRAY or OBJECT. The default value is ARRAY which is more efficient.
	 * If specified as ARRAY, each row is fetched as an array of column values.
	 * If specified as OBJECT, each row is fetched as a JavaScript object. The object has a property for each column name, with the property value set to the respective column value. The property name follows Oracle's standard name-casing rules. It will commonly be uppercase, since most applications create tables using unquoted, case-insensitive names.
	 * This property may be overridden in an execute() call.
	 */
	export var outFormat: number;

	/**
	 * This readonly property gives a numeric representation of the node-oracledb version. For version x.y.z, this property gives the number: (10000 * x) + (100 * y) + z
	 */
	export var version: number;

	/**
	 * This attribute is temporarily disabled. Setting it has no effect.
	 * Node-oracledb internally uses Oracle LOB Locators to manipulate long object (LOB) data. LOB Prefetching allows LOB data to be returned early to node-oracledb when these locators are first returned. This is similar to the way row prefetching allows for efficient use of resources and round-trips between node-oracledb and the database.
	 * Prefetching of LOBs is mostly useful for small LOBs.
	 * The default size is 16384.
	 */
	export var lobPrefetchSize: number;

	/**
	 * This readonly property gives a numeric representation of the Oracle client library version. For version a.b.c.d.e, this property gives the number: (100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e
	 */
	export var oracleClientVersion: number;

	/**
	 * The user-chosen Connection class value defines a logical name for connections. Most single purpose applications should set connectionClass when using a connection pool or DRCP.
	 * When a pooled session has a connection class, Oracle ensures that the session is not shared outside of that connection class.
	 * The connection class value is similarly used by Database Resident Connection Pooling (DRCP) to allow or disallow sharing of sessions.
	 * For example, where two different kinds of users share one pool, you might set connectionClass to 'HRPOOL' for connections that access a Human Resources system, and it might be set to 'OEPOOL' for users of an Order Entry system. Users will only be given sessions of the appropriate class, allowing maximal reuse of resources in each case, and preventing any session information leaking between the two systems.
	 */
	export var connectionClass: string;

	/**
	 * An array of node-oracledb types. When any column having the specified type is queried with execute(), the column data is returned as a string instead of the native representation. For column types not specified in fetchAsString, native types will be returned.
	 * By default all columns are returned as native types.
	 * This property helps avoid situations where using JavaScript types can lead to numeric precision loss, or where date conversion is unwanted.
	 * The valid types that can be mapped to strings are DATE and NUMBER.
	 * The maximum length of a string created by this mapping is 200 bytes.
	 * Individual query columns in an execute() call can override the fetchAsString global setting by using fetchInfo.
	 * The conversion to string is handled by Oracle client libraries and is often referred to as defining the fetch type.
	 */
	export var fetchAsString: string;
}
