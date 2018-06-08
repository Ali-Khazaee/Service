'use strict'

//
// Libraries
//

const FileSystem = require('fs')
const UniqueName = require('uuid/v4')

const Misc = require('../Handler/Misc')
const Config = require('../Config/Core')

function UploadHandler(Client)
{
    const UploadList = { }

    Client.on('UploadHandler::Buffer', function(File)
    {
        if (Misc.IsUndefined(File.ID))
            return

        if (Misc.IsUndefined(UploadList[File.ID]))
        {
            UploadList[File.ID].Write = 0
            UploadList[File.ID].FileSize = File.Size || 0
            UploadList[File.ID].FileName = File.Name || ''
            UploadList[File.ID].FileName2 = UniqueName()
            UploadList[File.ID].LastActivity = Misc.Time()
            UploadList[File.ID].WritableStream = FileSystem.createWriteStream(Config.APP_STORAGE_TEMP + UploadList[File.ID].FileName2)
        }

        if (UploadList[File.ID].Write > Config.UPLOAD_FILE_SIZE)
        {
            Client.emit('UploadHandler::Buffer', { ID: File.ID, Failed: true })
            return
        }

        if (FileSystem.existsSync(Config.APP_STORAGE_TEMP + UploadList[File.ID].FileName2))
        {
            const UploadFile = FileSystem.statSync(Config.APP_STORAGE_TEMP + UploadList[File.ID].FileName2)

            if (UploadList[File.ID].Size <= UploadFile.size)
            {
                const Stream = UploadList[File.ID].WritableStream

                if (Stream)
                    Stream.end()

                delete UploadList[File.ID]

                Client.emit(`UploadHandler::Buffer`, { ID: File.ID, Success: true })
                return
            }
        }

        UploadList[File.ID].Write += File.Data.length
        UploadList[File.ID].LastActivity = Misc.Time()
        UploadList[File.ID].WritableStream.write(File.Data)

        Client.emit(`UploadHandler::Buffer`, { ID: File.ID, Size: UploadList[File.ID].Write })
    })
}

module.exports = UploadHandler
