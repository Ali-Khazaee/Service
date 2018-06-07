'use strict'

//
// Libraries
//

const Util = require('util')
const FileSystem = require('fs')
const EventEmitter = require('events').EventEmitter

const Config = require('../Config/Core')

function UploadHandler(Client)
{
    var Self = this
    var UploadList = { }

    this.Client = Client
    this.FileSize = Config.UPLOAD_SIZE
    this.ChunkSize = Config.UPLOAD_CHUNK
    this.UploadDir = Config.APP_STORAGE_TEMP

    Client.on('UploadHandler::Sync', function()
    {
        Client.emit('UploadHandler::Sync', { FileSize: this.FileSize, ChunkSize: this.ChunkSize })
    })

    Client.on('UploadHandler::Start', function(File)
    {
        const ID = File.ID

        function SendError(Code)
        {
            Client.emit(`UploadHandler::Error`, { ID: ID, Result: Code })
        }

        if (File.size > this.FileSize)
        {
            SendError(1)
            return
        }

        function UploadComplete()
        {
            const Stream = UploadList[ID].WriteStream

            if (Stream)
                Stream.end()

            Client.emit(`UploadHandler::Complete`, { ID: ID })

            delete UploadList[ID]
        }

        Client.on(`UploadHandler::Complete`, function()
        {
            UploadComplete()
        })

        UploadList[ID] =
        {
            Name: File.name,
            Size: File.size,
            WriteStream: null,
            Resume: false,
            Data: { },
            Wrote: 0
        }

        if (FileSystem.existsSync(this.UploadDir + UploadList[ID].Name))
        {
            const UploadFile = FileSystem.statSync(this.UploadDir + UploadList[ID].Name)

            if (UploadList[ID].Size > 0)
            {
                if (UploadList[ID].Size > UploadFile.size)
                {
                    UploadList[ID].Wrote = UploadFile.size
                    UploadList[ID].Resume = true

                    Client.emit(`UploadHandler::Resume`, { ID: UploadList[ID] })
                }
                else
                {
                    UploadComplete()
                    return
                }
            }
        }

        UploadList[ID].WriteStream = FileSystem.createWriteStream(this.UploadDir + UploadList[ID].Name)

        Client.emit(`UploadHandler::Request`, { ID: ID })

        Client.on(`UploadHandler::Stream`, function(chunk)
        {
            if (UploadList[ID].abort)
            {
                Client.removeAllListeners(`socket.io-file::stream::${ID}`)
                Client.removeAllListeners(`socket.io-file::done::${ID}`)
                Client.removeAllListeners(`socket.io-file::complete::${ID}`)
                Client.removeAllListeners(`socket.io-file::abort::${ID}`)
                Client.removeAllListeners(`socket.io-file::error::${ID}`)

                UploadList[ID].writeStream.end()
                delete UploadList[ID]
                return
            }

            var writeStream = UploadList[ID].writeStream

            function write()
            {
                if ((UploadList[ID].wrote + chunk.length) > (Self.maxFileSize))
                {
                    SendError(new Error(`Uploading file size exceeded max file size ${Self.maxFileSize} byte(s).`))
                    return
                }

                var writeDone = writeStream.write(chunk)
                UploadList[ID].wrote += chunk.length

                if (!writeDone)
                    writeStream.once('drain', () => Client.emit(`socket.io-file::request::${ID}`))
                else
                {
                    if (Self.transmissionDelay)
                    {
                        setTimeout(() =>
                        {
                            Client.emit(`socket.io-file::request::${ID}`)
                        }, Self.transmissionDelay)
                    }
                    else
                        Client.emit(`socket.io-file::request::${ID}`)
                }
            }

            write()
        })

        Client.on(`socket.io-file::abort::${ID}`, function()
        {
            UploadList[ID].abort = true

            Client.emit(`socket.io-file::abort::${ID}`,
                {
                    name: UploadList[ID].name,
                    size: UploadList[ID].size,
                    wrote: UploadList[ID].wrote,
                    uploadDir: UploadList[ID].uploadDir
                })
        })
    })
}

UploadHandler.prototype.destroy = function()
{
    this.removeAllListeners()
    this.Client.emit('UploadHandler::Stop')
    this.Client = null
}

Util.inherits(UploadHandler, EventEmitter)

module.exports = UploadHandler
