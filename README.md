# @bartbutenaers/node-red-cleanup-filesystem
A Node-RED node to cleanup files and folders in the filesystem

Note that this node has ***not*** been tested for large amounts of files and folders, since I don't need it for that purpose.  I assume it will be to slow for those cases.

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

## Node usage

This node can be used for example to cleanup daily the video recordings of an IP camera after a month, to ensure the disk doesn't run full.  

![image](https://github.com/bartbutenaers/node-red-cleanup-filesystem/assets/14224149/b179c80e-650d-4674-b84a-8e5a9f7c9288)

The following example flow will remove daily the video footage that is at least one month old:

![image](https://github.com/bartbutenaers/node-red-cleanup-filesystem/assets/14224149/681b5dfc-e1f9-44d3-8ee6-62d02456e9f9)
```
[{"id":"c81e29b99519872f","type":"debug","z":"bfe334aca9927858","name":"Rapport opkuis","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":1440,"y":520,"wires":[]},{"id":"475ba3d23cb92067","type":"inject","z":"bfe334aca9927858","name":"Daily","props":[{"p":"payload"}],"repeat":"86400","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":1050,"y":520,"wires":[["cd06d7ec1ab9956b"]]},{"id":"cd06d7ec1ab9956b","type":"cleanup-filesystem","z":"bfe334aca9927858","name":"","baseFolder":"/media/reolink_deurbel","fileNamePattern":".*","folderNamePattern":".*","age":"36","ageUnit":"hours","removeEmptyFolders":true,"dryRun":false,"report":true,"x":1230,"y":520,"wires":[["c81e29b99519872f"]],"info":""}]
```
It is advised to do a ***dry-run*** first to make sure that the correct files and folders are being deleted!  That setting allows you to play with the other settings until the list of files and folders in the output message `payload.report` is correct. Because due to incorrect settings (or perhaps a bug in this node) important files or folders might be removed by accident.  Of course a dry-run only makes sense to be used in combination with the ***report*** setting:

![image](https://github.com/bartbutenaers/node-red-cleanup-filesystem/assets/14224149/7263cd81-8458-47ed-963c-a047ffbfa7ba)

The *deletedFiles* and *deletedFolder* will always be zero in the report while doing a dry-run, because it reports the number of files and folders that are truly removed.

Optionally every property can also be overwritten via the input message payload:
```
{
    "baseFolder": "/media/reolink_doorbell",
    "fileNamePatterns": ".*",
    "folderNamePatterns": ".*",
    "age": 1,
    "ageUnit": "months",
    "removeEmptyFolders": true,
    "dryRun": true,
    "report": true
}
```

## Node properties

The following properties are mandatory, so they should be specified in the config screen or in the input message.

### Base folder

This is the folder where the node starts the cleanup operation, which should be a valid path on your system.  Make sure this path is correct, to avoid data loss inside important files!  
The value from the config screen can be overwritten via `payload.baseFolder` in the input message.

### Filename patterns

Files with a name matching this regex pattern will be removed.  Use `.*` for all files.  Multiple regex patterns can be entered `;` separated, for example `.*mp4;.*jpg` to remove only files with extension "mp4" or "jpg".  
The value from the config screen can be overwritten via `payload.fileNamePatterns` in the input message.

### Foldername patterns

Folders with a (full path folder) name matching this regex pattern will be removed.  Use `.*` for all folders.  Multiple regex patterns can be entered `;` separated.
The value from the config screen can be overwritten via `payload.folderNamePatterns` in the input message.

For example let's assume the following folder structure, to store recordings from a Reolink doorbell per day:

![image](https://github.com/bartbutenaers/node-red-cleanup-filesystem/assets/14224149/7eecc6cb-2777-42ef-811e-9742db72ce61)

When using the folder name pattern `2024.*22`, then only the folders for the 22th of every month in 2024 will be removed:

![image](https://github.com/bartbutenaers/node-red-cleanup-filesystem/assets/14224149/15932290-da06-4a1a-9cec-434df5e3450f)

### Age

Files older than this age will be removed.
The value from the config screen can be overwritten via `payload.age` in the input message.

### Age unit

Represents the unit of 'age', which will be used to calculate the age of files.  It should be one of the following strings: 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', or 'years'.  The value from the config screen can be overwritten via `payload.ageUnit` in the input message.

### Remove empty folders

When selected, empty subfolders will be removed.  Even in dry-run mode, there will be simulation to consider files that 'would' be removed as removed files, in order to determine whether a folder 'would' become empty.  
The value from the config screen can be overwritten via `payload.removeEmptyFolders` in the input message.

### Do a test run

When selected, a test run will be executed without removing files or folders.  That is of course only useful when the *"Report files and folders"* option is activated.  
The value from the config screen can be overwritten via `payload.dryRun` in the input message.

### Report files and folders

 When selected, the paths of the (to be) deleted files and folders will be send in the output `payload.report`.
 The value from the config screen can be overwritten via `payload.report` in the input message.
