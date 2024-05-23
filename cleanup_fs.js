module.exports = function(RED) {
    const fs = require('fs').promises
    const path = require('path')

    function cleanupFilesystem(config) {
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
            let fileNamePattern = config.fileNamePattern
            let folderNamePattern = config.folderNamePattern
            let age = config.age
            let ageUnit = config.ageUnit
            let removeEmptyFolders = config.removeEmptyFolders
            let dryRun = config.dryRun
            let report = config.report

            // All the config properties can be overwritten by input msg properties
            if (msg.payload && typeof msg.payload === 'object') {
                if (msg.payload.baseFolder !== undefined) {
                    baseFolder = msg.payload.baseFolder
                }
                if (msg.payload.fileNamePattern !== undefined) {
                    fileNamePattern = msg.payload.fileNamePattern
                }
                if (msg.payload.folderNamePattern !== undefined) {
                    folderNamePattern = msg.payload.folderNamePattern
                }
                if (msg.payload.age !== undefined) {
                    age = msg.payload.age
                }
                if (msg.payload.ageUnit !== undefined) {
                    ageUnit = msg.payload.ageUnit
                }
                if (msg.payload.removeEmptyFolders !== undefined) {
                    removeEmptyFolders = msg.payload.removeEmptyFolders
                }
                if (msg.payload.dryRun !== undefined) {
                    dryRun = msg.payload.dryRun
                }
                if (msg.payload.report !== undefined) {
                    report = msg.payload.report
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

            // Remove ';' at the start or the end of the patterns, to avoid empty strings in the pattern arrays
            fileNamePattern = fileNamePattern.replace(/^;|;$/g, "")
            folderNamePattern = folderNamePattern.replace(/^;|;$/g, "")

            // Convert the ';' separated strings of patterns to arrays.
            // When no patterns are supplied, then all files/folders will be removed
            fileNamePattern = fileNamePattern.split(';') || ['.*']
            folderNamePattern = folderNamePattern.split(';') || ['.*']

            let deletedFiles = 0
            let deletedFolders = 0
            let reportContent = {
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

            async function deleteIfOld(filePath) {
                try {
                    const stats = await fs.stat(filePath)
                    const now = new Date().getTime()
                    const fileAge = (now - stats.mtime) / 1000

                    if (fileAge > ageInSeconds && fileNamePattern.some(pattern => new RegExp(pattern).test(path.basename(filePath)))) {
                        if (report) {
                            reportContent.files.push(filePath)
                        }

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

            async function walkDir(dir) {
                try {
                    const files = await fs.readdir(dir)

                    for (const file of files) {
                        const filePath = path.join(dir, file)
                        try {
                            const stats = await fs.stat(filePath)

                            if (stats.isDirectory()) {
                                // Do a dept-first traversal, i.e. always descend into directories to allow full path filtering
                                await walkDir(filePath)

                                // Check the regex of the full folder name
                                if (folderNamePattern.some(pattern => new RegExp(pattern).test(filePath))) {
                                    // Check if the folder is empty considering also the files that would have been deleted
                                    const isEmpty = (await fs.readdir(filePath)).every(file => reportContent.files.includes(path.join(filePath, file)))
                                    if (removeEmptyFolders && isEmpty) {
                                        if(report) {
                                            reportContent.folders.push(filePath)
                                        }

                                        if (!dryRun) {
                                            await fs.rmdir(filePath)
                                            deletedFolders++
                                        }
                                    }
                                }
                            } else if (folderNamePattern.some(pattern => new RegExp(pattern).test(path.dirname(filePath)))) {
                                // Only delete files if their parent directory matches the folderNamePattern
                                await deleteIfOld(filePath)
                            }
                        } catch (err) {
                            node.error(err)
                        }
                    }
                } catch (err) {
                    node.error(err)
                }
            }

            await walkDir(baseFolder)

            msg.payload = {
                deletedFiles: deletedFiles,
                deletedFolders: deletedFolders,
                report: reportContent
            }
            node.send(msg)

            resetStatus()
        })

        node.on('close', () => {
            resetStatus()
        })
    }

    RED.nodes.registerType("cleanup-filesystem", cleanupFilesystem)
}
