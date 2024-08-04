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
                    if (typeof msg.payload.baseFolder !== 'string' && !(msg.payload.baseFolder instanceof String)) {
                        node.error("The msg.payload.baseFolder should be a string.")
                        resetStatus()
                        return
                    }

                    baseFolder = msg.payload.baseFolder
                }
                if (msg.payload.patternType !== undefined) {
                    if (!['glob', 'regex'].includes(msg.payload.patternType)) {
                        node.error("The msg.payload.patternType should be a 'glob' or 'regex'.")
                        resetStatus()
                        return
                    }

                    patternType = msg.payload.patternType
                }
                if (msg.payload.age !== undefined) {
                    if (!Number.isInteger(msg.payload.age)) {
                        node.error("The msg.payload.age should be an integer number.")
                        resetStatus()
                        return
                    }

                    age = msg.payload.age
                }
                if (msg.payload.ageUnit !== undefined) {
                    if (!['minutes', 'hours', 'days', 'weeks', 'months', 'years'].includes(msg.payload.ageUnit)) {
                        node.error("The msg.payload.ageUnit should be 'minutes', 'hours', 'days', 'weeks', 'months' or 'years'.")
                        resetStatus()
                        return
                    }

                    ageUnit = msg.payload.ageUnit
                }

                if (msg.payload.removeFolders !== undefined) {
                    if (!['none', 'empty', 'aged'].includes(msg.payload.removeFolders)) {
                        node.error("The msg.payload.removeFolders should be 'none', 'empty' or 'aged'.")
                        resetStatus()
                        return
                    }

                    removeFolders = msg.payload.removeFolders
                }

                if (msg.payload.dryRun !== undefined) {
                    if (typeof msg.payload.removeFolders !== "boolean") {
                        node.error("The msg.payload.dryRun should be a boolean.")
                        resetStatus()
                        return
                    }

                    dryRun = msg.payload.dryRun
                }

                if (msg.payload.reportDetails !== undefined) {
                    if (typeof msg.payload.reportDetails !== "boolean") {
                        node.error("The msg.payload.reportDetails should be a boolean.")
                        resetStatus()
                        return
                    }

                    reportDetails = msg.payload.reportDetails
                }

                if (msg.payload.patterns !== undefined) {
                    if (!Array.isArray(msg.payload.patterns) || msg.payload.patterns.length == 0) {
                        node.error("The msg.payload.patterns should be an array.")
                        resetStatus()
                        return
                    }

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

            async function walkFolder(relativeFolder) {
                try {
                    let absoluteFolder = path.join(baseFolder, relativeFolder)

                    // Get the content of the (relative) folder, which can be files and or subfolders
                    const filesFolders = await fs.readdir(absoluteFolder)

                    for (const fileFolder of filesFolders) {
                        // Add the file name to the folder in a cross-platform way
                        let relativePath = path.join(relativeFolder, fileFolder)
                        let absolutePath = path.join(absoluteFolder, fileFolder)

                        try {
                            const stats = await fs.stat(absolutePath)

                            const now = new Date().getTime()
                            const fileAge = Math.round((now - stats.mtime) / 1000)

                            if (stats.isDirectory()) {
                                // Do a depth-first traversal, i.e. always descend into directories to allow full path filtering
                                await walkFolder(relativePath)

                                const isEmpty = (await fs.readdir(absolutePath)).every(fileOrFolder =>
                                    reportContent.files.some(info => path.join(relativePath, fileOrFolder) === info.path) ||
                                    reportContent.folders.some(info => path.join(relativePath, fileOrFolder) === info.path)
                                )

                                let folderInfo = {
                                    path: relativePath,
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
                                                await fs.rmdir(absolutePath)
                                            }
                                        }
                                        break
                                    case 'aged':
                                        if (isEmpty && fileAge > ageInSeconds) {
                                            reportContent.folders.push(folderInfo)

                                            if (!dryRun) {
                                                await fs.rmdir(absolutePath)
                                            }
                                        }
                                        break
                                }
                            } else {
                                // Only delete files if their parent directory matches the patterns
                                try {
                                    // Note: wrap the pattern in a RegExp instance, because the specified patterns e.g. don't always look like /.../
                                    if (fileAge > ageInSeconds && patterns.some(pattern => new RegExp(pattern).test(relativePath))) {
                                        let fileInfo = {
                                            path: relativePath,
                                            mtime: stats.mtime.toISOString(),
                                            age: fileAge
                                        }

                                        reportContent.files.push(fileInfo)

                                        if (!dryRun) {
                                            try {
                                                await fs.unlink(absolutePath)
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

            await walkFolder('')

            if (!reportDetails) {
                // Only keep the paths when no details should be reported
                reportContent.folders = reportContent.folders.map(obj => obj.path)
                reportContent.files = reportContent.files.map(obj => obj.path)
            }

            msg.payload = {
                deletedFiles: reportContent.files.length,
                deletedFolders: reportContent.folders.length,
                report: reportContent
            }

            node.send(msg)

            resetStatus()
        })

        node.on('close', () => {
            resetStatus()
        })
    }

    RED.nodes.registerType("file-retention-manager", fileRetentionManager)
}
