.. _dbobjectclass:

*******************
API: DbObject Class
*******************

Calling :meth:`connection.getDbObjectClass()` returns a prototype object
representing a named Oracle Database object or collection. Use
``dbObject.prototype`` on the class to see the available attributes.

Objects of a named DbObject type are:

- created from a DbObject prototype by calling ``new()``
- returned by queries
- returned when using BIND_OUT for an Oracle Database object

See :ref:`Oracle Database Objects and Collections <objects>` for more
information.

The DbObject class was added in node-oracledb 4.0.

.. _dbobjectproperties:

DbObject Properties
===================

The properties of a DbObject object are listed below.

.. attribute:: dbObject.attributes

    This read-only property is an object. When :attr:`dbObject.isCollection`
    is *false*, this will be an object containing attributes corresponding to
    the Oracle Database object attributes. The name of each attribute follows
    normal Oracle casing semantics.

    Each attribute will have an object that contains:

    - ``type``: The value of one of the :ref:`Oracle Database Type
      Constants <oracledbconstantsdbtype>`, such as 2010 for
      ``oracledb.DB_TYPE_NUMBER`` and 2023 for ``oracledb.DB_TYPE_OBJECT``.
    - ``typeName``: A string corresponding to the type, such as “VARCHAR2”
      or “NUMBER”. When the attribute is a DbObject, it will contain the
      name of the object.
    - ``typeClass``: Set if the value of ``type`` is a DbObject. It is the
      DbObject class for the attribute.
    - ``precision``: The precision of the attribute when the attribute's type
      is ``oracledb.DB_TYPE_NUMBER``. For all other types, the value returned
      is *undefined*.
    - ``scale``: The scale of the attribute when the attribute's type is
      ``oracledb.DB_TYPE_NUMBER``. For all other types, the value returned is
      *undefined*.
    - ``maxSize``: The maximum size (in bytes) of the attribute when the
      attribute's type is one of ``oracledb.DB_TYPE_CHAR``,
      ``oracledb.DB_TYPE_NCHAR``, ``oracledb.DB_TYPE_NVARCHAR``,
      ``oracledb.DB_TYPE_RAW``, or ``oracledb.DB_TYPE_VARCHAR``. For all other
      types, the value returned is *undefined*.

    For example:

    .. code-block:: javascript

        attributes: {
          STREET_NUMBER: { type: 2, typeName: 'NUMBER' },
          LOCATION: {
            type: 2023,
            typeName: 'MDSYS.SDO_POINT_TYPE',
            typeClass: [Function]
          }
          PROPERTY_NAME: {
            type: 2001,
            typeName: 'VARCHAR',
            maxSize: 10
          }
          PROPERTY_VALUE: {
            type: 2010,
            typeName: 'NUMBER',
            precision: 12,
            scale: 2
          }
        }

    .. versionchanged:: 7.0

        The ``precision``, ``scale``, and ``maxSize`` attributes were added to
        this property.

.. attribute:: dbObject.elementType

    This read-only property is a number. When :attr:`dbObject.isCollection` is
    *true*, this will have a value corresponding to one of the
    :ref:`Oracle Database Type Constants <oracledbconstantsdbtype>`.

.. attribute:: dbObject.elementTypeClass

    This read-only property is an object. When :attr:`dbObject.isCollection`
    is *true* and the elements in the collection refer to database objects,
    this property provides the type class information of the elements.

.. attribute:: dbObject.elementTypeName

    This read-only property is a string. When :attr:`dbObject.isCollection` is
    *true*, this will have the name of the element type, such as “VARCHAR2”
    or “NUMBER”.

.. attribute:: dbObject.fqn

    This read-only property is a string which specifies the fully qualified
    name of the Oracle Database object or collection.

.. attribute:: dbObject.isCollection

    This read-only property is a boolean value. It is *true* if the
    Oracle object is a collection and *false* otherwise.

.. attribute:: dbObject.length

    This read-only property is a number. When :attr:`dbObject.isCollection` is
    *true*, this will have the number of elements in the collection. It is
    *undefined* for non-collections.

.. attribute:: dbObject.name

    This read-only property is a string which identifies the name of the
    Oracle Database object or collection.

.. attribute:: dbObject.packageName

    .. versionadded:: 6.2

    This read-only property is a string which identifies the name of the
    package, if the type refers to a PL/SQL type. Otherwise, it returns
    *undefined*.

.. attribute:: dbObject.schema

    This read-only property is a string which identifies the schema owning
    the Oracle Database object or collection.

.. _dbobjectmethods:

DbObject Methods
================

.. _dbobjectmethodscolls:

DbObject Methods for Collections
--------------------------------

These methods can be used on Oracle Database collections, identifiable
when :attr:`dbObject.isCollection` is *true*. When collections are fetched
from the database, altered, and then passed back to the database, it may be
more efficient to use these methods directly on the retrieved DbObject than
it is to convert that DbObject to and from a JavaScript object.

.. method:: dbObject.append(value)

    Adds the given value to the end of the collection. If no elements exist
    in the collection, this creates an element at index 0. Otherwise, it
    creates an element at the index position immediately following the highest
    index available in the collection.

.. method:: dbObject.deleteElement(Number index)

    Deletes the value from collection at the given index.

.. method:: dbObject.getElement(Number index)

    Returns the value associated with the given index. If no element exists at
    that index, an exception is raised.

.. method:: dbObject.getFirstIndex()

    Returns the first index for later use to obtain the value.

.. method:: dbObject.getKeys()

    Returns a JavaScript array containing the ‘index’ keys.

.. method:: dbObject.getLastIndex()

    To obtain the last index for later use to obtain a value.

.. method:: dbObject.getNextIndex(Number index)

    Returns the next index value for later use to obtain a value. If there
    are no elements in the collection following the specified index, it
    returns *undefined*.

    If the passed-in ``index`` parameter is not found in the :ref:`associative
    array collection types indexed by integers <indexbyplsinteger>`, then this
    method returns the next available higher index found in the associative
    array.

.. method:: dbObject.getPrevIndex(Number index)

    Returns the previous index for later use to obtain the value. If there
    are no elements in the collection preceding the specified index, it
    returns *undefined*.

    If the passed-in ``index`` parameter is not found in the :ref:`associative
    array collection types indexed by integers <indexbyplsinteger>`, then this
    method returns the next available lower index found in the associative
    array.

.. method:: dbObject.hasElement(Number index)

    Returns *true* if an element exists in the collection at the given
    index. Returns *false* otherwise.

.. method:: dbObject.setElement(Number index, value)

    To set the given value at the position of the given index.

.. method:: dbObject.getValues()

    Returns an array of element values as a JavaScript array in key order.

.. method:: dbObject.toMap()

    Returns a map object for the collection types indexed by PLS_INTEGER where
    the collection’s indexes are the keys and the elements are its values. See
    :ref:`indexbyplsinteger` for example.

    .. versionadded:: 6.4

.. method:: dbObject.copy()

    Creates a copy of the object and returns it. For Thick mode, this method
    requires Oracle Client libraries 12.2 or higher, if you are copying
    :ref:`PL/SQL collection VARRAY types <plsqlvarray>`.

    .. versionadded:: 6.8

.. method:: dbObject.trim(count)

    Trims the specified number of elements from the end of the collection.
