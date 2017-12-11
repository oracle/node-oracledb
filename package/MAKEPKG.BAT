@echo off
REM Copyright (c) 2017, Oracle and/or its affiliates.  All Rights reserved
REM
REM ******************************************************************************
REM *
REM * You may not use the identified files except in compliance with the Apache
REM * License, Version 2.0 (the "License.")
REM *
REM * You may obtain a copy of the License at
REM * http://www.apache.org/licenses/LICENSE-2.0.
REM *
REM * Unless required by applicable law or agreed to in writing, software
REM * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
REM * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
REM *
REM * See the License for the specific language governing permissions and
REM * limitations under the License.
REM *
REM * NAME
REM *   MAKEPKG.BAT
REM *
REM * DESCRIPTION
REM *   Create/cleanup of binary package for the current node-oracledb binary.
REM *
REM *****************************************************************************

REM
REM usage: MAKEPKG.BAT [<cmd>]
REM      : Possible values for <cmd> are: CLEANUP and CREATEBINARY
REM 
REM expected to run this batch file from package sub-directory,
REM where a fresh clone is created.
REM

REM expecting 1 parameter, make sure we have some arguments
if "%1" == "" GOTO usage

REM jump to appropriate sections based on <cmd>
if "%1" == "CLEANUP"  GOTO cleanup
if "%1" == "CREATEBINARY"  GOTO createbinary
goto usage

REM cleanup section, remove file(s) created by this batch file
:cleanup
echo "cleanup section"
del ..\package-lock.json
del SHASUMS256.txt oracledb-v*-node-*.gz
goto exit

REM compile, package to gz file
:createbinary
echo "createbinary section"

REM Append SHA to LICENSE.MD
git checkout ..\LICENSE.md
setlocal enabledelayedexpansion
REM compose a string with commands to execute one by one

REM start with empty string
set CONCAT_STR=
REM capture SHA
FOR /F "tokens=* USEBACKQ" %%F IN (`git --git-dir=..\.git rev-parse HEAD`) DO (
SET CONCAT_STR=%%F
)

set DATE_STR=
FOR /F "tokens=* USEBACKQ" %%F IN (`DATE /T`) DO ( SET DATE_STR=%%F )

REM append output of other commands
set CMD_STR="git --git-dir=..\odpi\.git rev-parse HEAD && node --version"
for /f %%i in ('%CMD_STR%') do set "CONCAT_STR=!CONCAT_STR! %%i"
set CONCAT_STR=!CONCAT_STR! !DATE_STR!
echo !CONCAT_STR! >> ..\LICENSE.MD

REM Compile node-oracledb
cd ..
CALL npm install
echo "NODE oracledb compiled"
cd package
echo "==> Binary package created for Node.js "

REM create compressed file
node createpackage.js
goto exit

REM display usage string
:usage
echo "usage: MAKEPKG.BAT [<cmd>]
goto exit


REM Exit point
:exit
