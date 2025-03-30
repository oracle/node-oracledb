Sphinx is used to generate the HTML for the node-oracledb documentation.

The generated node-oracledb documentation is at
https://node-oracledb.readthedocs.io/

This directory contains the documentation source.  It is written using reST
(re-Structured Text). The source files are processed using Sphinx and can be
turned into HTML, PDF or ePub documentation.

If you wish to build documentation yourself, install Sphinx and the Read the
Docs theme.  Sphinx is available on many Linux distributions as a pre-built
package. You can also install Sphinx and the Read the Docs theme using the
Python package manager "pip", for example::

    python -m pip install -r requirements.txt

For more information on Sphinx, please visit this page:

http://www.sphinx-doc.org

Once Sphinx is installed, the supplied Makefile can be used to build the
different targets, for example to build the HTML documentation, run::

    make

To make ePub documentation, run::

    make epub

To make PDF documentation, run::

    make pdf

The program ``latexmk`` may be required by Sphinx to generate PDF output.
good program
