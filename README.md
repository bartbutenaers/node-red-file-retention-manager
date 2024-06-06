# @bartbutenaers/node-red-file-retention-manager
A Node-RED node to cleanup files (and folders) which have reached a specified age.

Thanks to [zenofmud](https://discourse.nodered.org/u/zenofmud/summary) to assist me by testing this node more in depth!

Note that this node has ***not*** been designed for large amounts of files, since I don't need it myself for that purpose.  I assume it will be to slow for those cases.

## Installation

Since this node is in an experimental phase, it is ***not*** available on NPM yet.  So not available in the palette!

Run the following npm command in your Node-RED user directory (typically ~/.node-red), to install this node directly from this Github repo:
```
npm install bartbutenaers/node-red-file-retention-manager
```
Note that you need to have Git installed, in order to be able to execute this command.

## Support my Node-RED developments

Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Legal disclaimer

***CAUTION: this software is distributed under the Apache License Version 2.0 on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied!  Use it at your own risk!***

## Node usage

This node can be used for example to cleanup daily the video recordings of an IP camera after a month, to ensure the disk doesn't run full.  

![image](https://github.com/bartbutenaers/node-red-file-retention-manager/assets/14224149/952bdb72-dd51-4d56-b0fb-87f676dcbebf)

The following example flow will remove daily the video footage that is at least one month old:

![image](https://github.com/bartbutenaers/node-red-file-retention-manager/assets/14224149/c995d28b-64df-4937-a591-8f1bd46fd404)
```
[{"id":"807afc986d0ec286","type":"debug","z":"bfe334aca9927858","name":"Cleanup report","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":860,"y":620,"wires":[]},{"id":"88e2b00bb7757498","type":"inject","z":"bfe334aca9927858","name":"Daily check","props":[{"p":"payload"}],"repeat":"86400","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":430,"y":620,"wires":[["3b22285a9d8f0d3f"]]},{"id":"3b22285a9d8f0d3f","type":"file-retention-manager","z":"bfe334aca9927858","name":"","baseFolder":"/media/reolink_deurbel","patternType":"glob","age":"1","ageUnit":"months","removeFolders":"none","dryRun":true,"reportDetails":true,"patterns":["**/*"],"x":640,"y":620,"wires":[["807afc986d0ec286"]]}]
```
It is advised to do a ***dry-run*** first to make sure that the correct files (and folders) are being deleted!  That setting allows you to play with the other settings until the list of files and folders in the output message `payload.report` is correct. Because due to incorrect settings (or perhaps a bug in this node) important files or folders might be removed by accident.  Of course a dry-run only makes sense to be used in combination with the ***report*** setting.

The report shows the (to be) deleted files and folders:

![image](https://github.com/bartbutenaers/node-red-cleanup-filesystem/assets/14224149/7263cd81-8458-47ed-963c-a047ffbfa7ba)

When the option *"Remove empty subfolders"* is not selected, no folders will end up in the report (because no folders will be removed).

The *deletedFiles* and *deletedFolder* will always be zero in the report while doing a dry-run, because it reports the number of files and folders that are truly removed.

Optionally every property can also be overwritten via the input message payload:
```
{
    "baseFolder": "/media/reolink_doorbell",
    "age": 1,
    "ageUnit": "months",
    "removeEmptyFolders": true,
    "dryRun": true,
    "report": true,
    "patternType": "glob",
    "patterns": ["**/*.mp4", "**/*.jpg"]
}
```

## Node properties

The following properties are mandatory, so they should be specified in the config screen or in the input message.

### Base folder

This is the folder where the node starts the cleanup operation, which should be a valid path on your system.  Make sure this path is correct, to avoid data loss inside important files!  
The value from the config screen can be overwritten via `payload.baseFolder` in the input message.

### Pattern type

The type of patterns to use, which can be a regular expressions or [glob pattern](https://code.visualstudio.com/docs/editor/glob-patterns).

### Age

Files older than this age will be removed.
The value from the config screen can be overwritten via `payload.age` in the input message.

### Age unit

Represents the unit of 'age', which will be used to calculate the age of files.  It should be one of the following strings: 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', or 'years'.  The value from the config screen can be overwritten via `payload.ageUnit` in the input message.

### Remove folders

+ *Don't remove folders*: keep all folders.
+ *Remove empty folders*: only remove empty folders.
+ *Remove empty aged folders*: only remove empty folders when their age is older as specified.

Even in dry-run mode, there will be simulation to consider files that 'would' be removed as removed files, in order to determine whether a folder 'would' become empty.  
The value from the config screen can be overwritten via `payload.removeEmptyFolders` in the input message.

### Do a test run

When selected, a test run will be executed without removing files or folders.  That is of course only useful when the *"Report files and folders"* option is activated.  
The value from the config screen can be overwritten via `payload.dryRun` in the input message.

### Report details of files and folders
When selected the details of the (to be) deleted files and folders will also be send in the output `payload.report`.  Otherwise the report will only contain the file paths and folders, but not the other details.  Note that the paths are relative to the base folder. 
The value from the config screen can be overwritten via `payload.report` in the input message.

### Patterns

Files with a path matching this regex/glob pattern will be removed.  Use glob pattern `**/*` for all files in all folders.
The value from the config screen can be overwritten via `payload.patterns` in the input message.
