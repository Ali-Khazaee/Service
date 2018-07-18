'use strict'

const EventEmitter = require('events')
const UniqueName = require('uuid/v4')
const FS = require('fs')

const Misc = require('./Misc')
const Config = require('../Config/Core')

class Socket extends EventEmitter
{
    constructor(Socket)
    {
        super()

        this._Socket = Socket
        this._ID = Misc.RandomString(15)

        this._FileSize = 0
        this._FilePath = null
        this._FileStream = null
        this._FileBuffer = null
        this._LastQuestFileLength = -1
        this._LastQuestTotalLength = -1
        this._OldBuffer = Buffer.alloc(0)

        this._Socket.on('data', (CurrentBuffer) =>
        {
            Misc.Analyze('ClientData', { IP: this._Socket.remoteAddress, Length: CurrentBuffer.length })

            if (this._LastQuestFileLength > 0)
            {
                if (this._FilePath == null)
                {
                    this._FilePath = Config.SERVER_STORAGE_TEMP + UniqueName()
                    this._FileStream = FS.createWriteStream(this._FilePath)
                }

                let QuestLength = this._LastQuestTotalLength - this._LastQuestFileLength

                if (this._FileBuffer == null)
                {
                    this._FileBuffer = Buffer.alloc(QuestLength)
                    this._OldBuffer.copy(this._FileBuffer)
                    this._OldBuffer = this._OldBuffer.slice(QuestLength)
                }

                if (this._OldBuffer.length + this._FileSize + CurrentBuffer.length >= this._LastQuestFileLength)
                {
                    let NewBuffer = CurrentBuffer

                    if (this._OldBuffer.length > 0)
                    {
                        NewBuffer = Buffer.alloc(this._OldBuffer.length + CurrentBuffer.length)

                        this._OldBuffer.copy(NewBuffer)

                        CurrentBuffer.copy(NewBuffer, this._OldBuffer.length)
                    }

                    let FileBuffer = Buffer.alloc(this._LastQuestFileLength - this._FileSize)

                    NewBuffer.copy(FileBuffer)

                    this._FileStream.write(FileBuffer)
                    this._FileStream.end()
                    this._FileStream.close()
                    this._FileStream = null
                    this._FileSize += FileBuffer.length

                    this.Deserializer(this._FileBuffer, this._FilePath)
                    this.BufferHandler(NewBuffer.slice(FileBuffer.length))

                    FileBuffer = null

                    this._FileSize = 0
                    this._FilePath = null
                    this._FileBuffer = null
                    this._LastQuestFileLength = -1
                    this._LastQuestTotalLength = -1
                    return
                }

                if (this._OldBuffer.length > 0)
                {
                    this._FileStream.write(this._OldBuffer)
                    this._FileSize += this._OldBuffer.length
                    this._OldBuffer = Buffer.alloc(0)
                }

                this._FileStream.write(CurrentBuffer)
                this._FileSize += CurrentBuffer.length
                return
            }

            this.BufferHandler(CurrentBuffer)
        })

        this._Socket.on('close', (HasError) =>
        {
            Misc.Analyze('ClientClose', { IP: this._Socket.remoteAddress, HasError: HasError ? 1 : 0 })
        })

        this._Socket.on('error', (Error) =>
        {
            Misc.Analyze('ClientError', { IP: this._Socket.remoteAddress, Error: Error })
        })
    }

    BufferHandler(CurrentBuffer)
    {
        let NewBuffer = Buffer.alloc(CurrentBuffer.length + this._OldBuffer.length)
        this._OldBuffer.copy(NewBuffer)

        CurrentBuffer.copy(NewBuffer, this._OldBuffer.length)

        this._OldBuffer = NewBuffer

        NewBuffer = null

        if (this._OldBuffer.length <= 10)
            return

        if (this._LastQuestTotalLength < 0 && this._OldBuffer.length >= (this._OldBuffer.readUInt32LE(2) - this._OldBuffer.readUInt32LE(6)))
        {
            this._LastQuestFileLength = this._OldBuffer.readUInt32LE(6)
            this._LastQuestTotalLength = this._OldBuffer.readUInt32LE(2)
        }

        while (this._OldBuffer.length >= this._LastQuestTotalLength && this._LastQuestFileLength < 1)
        {
            let QuestBuffer = Buffer.alloc(this._LastQuestTotalLength)

            this._OldBuffer.copy(QuestBuffer)
            this.Deserializer(QuestBuffer)

            NewBuffer = Buffer.alloc(this._OldBuffer.length - this._LastQuestTotalLength)

            this._OldBuffer.copy(NewBuffer, 0, this._LastQuestTotalLength)
            this._LastQuestTotalLength = -1
            this._LastQuestFileLength = -1
            this._OldBuffer = NewBuffer

            NewBuffer = null

            if (this._OldBuffer.length <= 10)
                return

            if (this._LastQuestTotalLength < 0 && this._OldBuffer.length >= (this._OldBuffer.readUInt32LE(2) - this._OldBuffer.readUInt32LE(6)))
            {
                this._LastQuestFileLength = this._OldBuffer.readUInt32LE(6)
                this._LastQuestTotalLength = this._OldBuffer.readUInt32LE(2)
            }
        }
    }

    Send()
    {
        this._Socket.write()
    }

    Deserializer(DataBuffer, FilePath)
    {
        this._Socket.emit(DataBuffer.readUInt16LE(0), DataBuffer.toString('utf8', 10, 10 + DataBuffer.readUInt32LE(2) - DataBuffer.readUInt32LE(6)), FilePath)
    }
}

module.exports = Socket
