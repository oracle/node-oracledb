# node-oracledb Documentation Source

This directory contains the node-oracledb documentation source. It is written
using reST (re-Structured Text). The source files are processed using
[Sphinx](http://www.sphinx-doc.org) and can be turned into HTML, PDF or ePub
documentation.

**Visit https://node-oracledb.readthedocs.io/ for pre-built production and
development node-oracledb documentation**

## Building Documentation Locally

To build the documentation locally:

1. Install Sphinx and the Read the Docs theme using the Python package manager
   ``pip``, for example:

        python -m pip install --upgrade -r requirements.txt

   You can alternatively install these from pre-built packages for your
   operating system, if available.

2. Once Sphinx is installed, use the Makefile to build your desired
   documentation format.

   To build the HTML documentation:

       make

   To make ePub documentation:

       make epub

   To make PDF documentation:

       make pdf

   The program ``latexmk`` may be required by Sphinx to generate PDF output.
