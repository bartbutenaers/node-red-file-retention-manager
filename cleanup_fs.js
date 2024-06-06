module.exports = function(RED) {
    const fs = require('fs').promises
    const path = require('path')
    const globToRegExp = require('glob-to-regexp')

    function fileRetentionManager(config) {
        RED.nodes.createNode(this, config)
        let node = this

        // Determine the root folder for the current operating system
        node.rootFolder = path.parse(process.cwd()).root

        function resetStatus() {
            node.isBusy = false
            node.status({})
        }

        resetStatus()

        node.on('input', async (msg) => {
            if (node.isBusy) {
                node.warn('Ignore msg because previous msg is still being processed')
                return
            }

            node.isBusy = true
            this.status({fill:'blue', shape:'dot', text:'processing'})

            let baseFolder = config.baseFolder
            let patternType = config.patternType
            let age = config.age
            let ageUnit = config.ageUnit
            let removeFolders = config.removeFolders
            let dryRun = config.dryRun
            let reportDetails = config.reportDetails
            let patterns = config.patterns

            // All the config properties can be overwritten by input msg properties
            if (msg.payload && typeof msg.payload === 'object') {
                if (msg.payload.baseFolder !== undefined) {
                    baseFolder = msg.payload.baseFolder
                }
                if (msg.payload.patternType !== undefined) {
                    patternType = msg.payload.patternType
                }
                if (msg.payload.age !== undefined) {
                    age = msg.payload.age
                }
                if (msg.payload.ageUnit !== undefined) {
                    ageUnit = msg.payload.ageUnit
                }
                if (msg.payload.removeFolders !== undefined) {
                    if (['none', 'empty', 'aged'].includes(msg.payload.removeFolders)) {
                        removeFolders = msg.payload.removeFolders
                    }
                }
                if (msg.payload.dryRun !== undefined) {
                    dryRun = msg.payload.dryRun
                }
                if (msg.payload.reportDetails !== undefined) {
                    reportDetails = msg.payload.reportDetails
                }
                if (msg.payload.patterns !== undefined && Array.isArray(msg.payload.patterns) && msg.payload.patterns.length > 0) {
                    patterns = msg.payload.patterns
                }
            }

            if (baseFolder === undefined || baseFolder.trim() === '' || baseFolder === node.rootFolder) {
                node.error("Specify 'payload.baseFolder' (different from root folder) when not specified in the config screen.")
                resetStatus()
                return
            }
            if (age === undefined || age.trim() === '' ||  age === 0) {
                node.error("Specify 'payload.age' (different from 0) when not specified in the config screen.")
                resetStatus()
                return
            }
            if (ageUnit === undefined || ageUnit.trim() === '') {
                node.error("Specify 'payload.ageUnit' when not specified in the config screen.")
                resetStatus()
                return
            }
            if (patterns === undefined || !Array.isArray(patterns) || patterns.length == 0) {
                node.error("Specify 'payload.patterns' when not specified in the config screen.")
                resetStatus()
                return
            }

            // Convert glob patterns to regex expressions if patternType is 'glob'
            if (patternType === 'glob') {
                patterns = patterns.map(globToRegExp)
            }

            // Normalize and resolve the base folder path to an absolute path, because it can contain e.g. "." (= current directory) or '.." (= parent directory)
            baseFolder = path.resolve(baseFolder)

            let deletedFiles = 0
            let deletedFolders = 0
            let reportContent = {
                baseFolder: baseFolder,
                files: [],
                folders: []
            }

            const ageInSeconds = {
                'minutes': age * 60,
                'hours': age * 60 * 60,
                'days': age * 60 * 60 * 24,
                'weeks': age * 60 * 60 * 24 * 7,
                'months': age * 60 * 60 * 24 * 30,
                'years': age * 60 * 60 * 24 * 365
            }[ageUnit]

            async function walkDir(relativeFolder) {
                try {
                    let absoluteFolder = path.join(baseFolder, relativeFolder)

                    const files = await fs.readdir(absoluteFolder)

                    for (const file of files) {
                        // Add the file name to the folder in a cross-platform way
                        let relativeFilePath = path.join(relativeFolder, file)
                        let absoluteFilePath = path.join(absoluteFolder, file)

                        try {
                            const stats = await fs.stat(absoluteFilePath)

                            const now = new Date().getTime()
                            const fileAge = Math.round((now - stats.mtime) / 1000)

                            if (stats.isDirectory()) {
                                // Do a depth-first traversal, i.e. always descend into directories to allow full path filtering
                                await walkDir(relativeFilePath)

                                const isEmpty = (await fs.readdir(absoluteFilePath)).every(fileOrFolder =>
                                    reportContent.files.some(info => path.join(relativeFilePath, fileOrFolder) === info.path) ||
                                    reportContent.folders.some(info => path.join(relativeFilePath, fileOrFolder) === info.path)
                                )

                                let folderInfo = {
                                    path: relativeFilePath,
                                    mtime: stats.mtime.toISOString(),
                                    age: fileAge
                                }

                                switch(removeFolders) {
                                    case 'none':
                                        // Keep the folder
                                        break
                                    case 'empty':
                                        if (isEmpty) {
                                            reportContent.folders.push(folderInfo)

                                            if (!dryRun) {
                                                await fs.rmdir(filePath)
                                                deletedFolders++
                                            }
                                        }
                                        break
                                    case 'aged':
                                        if (isEmpty && fileAge > ageInSeconds) {
                                            reportContent.folders.push(folderInfo)

                                            if (!dryRun) {
                                                await fs.rmdir(filePath)
                                                deletedFolders++
                                            }
                                        }
                                        break
                                }
                            } else {
                                // Only delete files if their parent directory matches the patterns
                                try {
                                    // Note: wrap the pattern in a RegExp instance, because the specified patterns e.g. don't always look like /.../
                                    if (fileAge > ageInSeconds && patterns.some(pattern => new RegExp(pattern).test(relativeFilePath))) {
                                        let fileInfo = {
                                            path: relativeFilePath,
                                            mtime: stats.mtime.toISOString(),
                                            age: fileAge
                                        }

                                        reportContent.files.push(fileInfo)

                                        if (!dryRun) {
                                            try {
                                                await fs.unlink(filePath)
                                                deletedFiles++
                                            } catch (err) {
                                                node.error(err)
                                            }
                                        }
                                    }
                                } catch (err) {
                                    node.error(err)
                                }
                            }
                        } catch (err) {
                            node.error(err)
                        }
                    }
                } catch (err) {
                    node.error(err)
                }
            }

            await walkDir('')

            msg.payload = {
                deletedFiles: deletedFiles,
                deletedFolders: deletedFolders
            }

            if (!reportDetails) {
                // Only keep the paths when no details should be reported
                reportContent.folders = reportContent.folders.map(obj => obj.path)
                reportContent.files = reportContent.files.map(obj => obj.path)
            }

            msg.payload.report = reportContent

            node.send(msg)

            resetStatus()
        })

        node.on('close', () => {
            resetStatus()
        })
    }

    RED.nodes.registerType("file-retention-manager", fileRetentionManager)
}
