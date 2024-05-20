# @bartbutenaers/node-red-cleanup-filesystem
A Node-RED node to cleanup files and folders in the filesystem

## Installation

Since this node is in an experimental phase, it is ***not*** available on NPM yet.  So not available in the palette!

Run the following npm command in your Node-RED user directory (typically ~/.node-red), to install this node directly from this Github repo:
```
npm install bartbutenaers/node-red-cleanup-filesystem
```
Note that you need to have Git installed, in order to be able to execute this command.

## Support my Node-RED developments

Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Legal disclaimer

***CAUTION: this software is distributed under the Apache License Version 2.0 on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied!  Use it at your own risk!***

## Node properties

The following properties are mandatory, so they should be specified in the config screen or in the input message.

### Base folder

This is the folder where the node starts the cleanup operation, which should be a valid path on your system.  Make sure this path is correct, to avoid data loss inside important files!  The value from the config screen can be overwritten via `payload.baseFolder` in the input message.

### Filename patterns

This is a (`;` separated) string containing one or more regex expressions, each representing a pattern that file names should match. The node will only cleanup files whose names match one of these patterns.  The value from the config screen can be overwritten via `payload.fileNamePatterns` in the input message.

### Foldername patterns

This is a (`;` separated) string containing one or more regex expressions, each representing a pattern that folder names should match. The node will only cleanup folders whose names match one of these patterns.  The value from the config screen can be overwritten via `payload.folderNamePatterns` in the input message.

### Age

Represents the age of files to be removed. It should be a positive integer. Files older than this age will be removed by this node.  The value from the config screen can be overwritten via `payload.ago` in the input message.

### Age unit

Represents the unit of 'age', which will be used to calculate the age of files.  It should be one of the following strings: 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', or 'years'.  The value from the config screen can be overwritten via `payload.ageUnit` in the input message.

### Remove empty folders

When `true` this node will remove empty subfolders after processing.  Even in dry-run mode, there will be simulation to consider files that 'would' be removed as removed files, in order to determine whether a folder 'would' become empty.  The value from the config screen can be overwritten via `payload.removeEmptyFolders` in the input message.

### Do a test run

When `true` the node will execute a test run, without actually removing files or folders.  That is of course only useful when the *"Report files and folders"* option is activated.  The value from the config screen can be overwritten via `payload.dryRun` in the input message.

### Report files and folders

When `true`will send the the path of the deleted files and folders in the output message inside `payload.report`.  The value from the config screen can be overwritten via `payload.report` in the input message.
