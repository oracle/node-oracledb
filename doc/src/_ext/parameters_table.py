#------------------------------------------------------------------------------
# Copyright (c) 2026, Oracle and/or its affiliates.
#
# This software is dual-licensed to you under the Universal Permissive License
# (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
# 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
# either license.
#
# If you elect to accept the software under the Apache License, Version 2.0,
# the following applies:
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#------------------------------------------------------------------------------

#------------------------------------------------------------------------------
# parameters_table.py
#
# Defines a directive (parameters-table) that creates consistent tables with a
# a predefined set of properties for documenting parameters. This directive
# extends the "list-table-with-summary" directive.
#------------------------------------------------------------------------------

from docutils.statemachine import ViewList

import table_with_summary

class ParametersTable(table_with_summary.ListTableWithSummary):

    def run(self):
        self.options["summary"] = \
            "The first column displays the name of the parameter. The " \
            "second column displays the data type of the parameter. The " \
            "third column displays the description of the parameter."
        self.options["header-rows"] = 1
        self.options["class"] = ["wy-table-responsive"]
        self.options["widths"] = [20, 20, 60]
        self.options["width"] = "100%"
        headings = ViewList(['* - Parameter', '  - Data Type', '  - Description'])
        self.content = headings + self.content
        return super().run()

def setup(app):
    app.add_directive('parameters-table', ParametersTable)
