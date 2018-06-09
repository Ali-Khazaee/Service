'use strict'

const EventEmitter = require('events')
const Readable = require('stream').Readable

class Socket extends EventEmitter
{
    constructor(Socket)
    {
        super()

        this._Stream = { }
        this._MessageID = 1
        this._Socket = Socket
        this._Connected = true

        this._reader = new Reader()

        this._acks = { }

        this._Socket.on('data', (Chunk) =>
        {
            const buffer = this._reader.read(Chunk)

            for (let I = 0; I < buffer.length; I++)
            {
                const Data = this.Deserialize(buffer[I])

                switch (Data.MessageType)
                {
                case Serializer.MT_DATA:
                    this.emit(Data.Event, Data.Data)
                    break
                case Serializer.MT_DATA_WITH_ACK:
                    this.emit(Data.Event, Data.Data, this.AckCallback(Data.MessageID))
                    break
                case Serializer.MT_DATA_STREAM_OPEN_WITH_ACK:
                    this.emit(Data.Event, this.OpenDataStream(Data), Data.Data, this.AckCallback(Data.MessageID))
                    break
                case Serializer.MT_DATA_STREAM:
                    this.TransmitDataStream(Data)
                    break
                case Serializer.MT_DATA_STREAM_CLOSE:
                    this.CloseDataStream(Data)
                    break
                }
            }
        })

        this._Socket.on('close', (Error) =>
        {
            this._Socket = null
            this._Connected = false
        })
    }

    OpenDataStream(Data)
    {
        const _this = this
        const ReadStream = new Readable({
            read: function(size)
            {
                if (_this._Socket.isPaused())
                    _this._Socket.resume()
            }
        })

        this._Stream[Data.MessageID] = ReadStream
        return ReadStream
    }

    TransmitDataStream(Data)
    {
        const ReadStream = this._Stream[Data.MessageID]

        if (!ReadStream.push(Data.Data))
            this._Socket.pause()
    }

    CloseDataStream(Data)
    {
        const ReadStream = this._Stream[Data.MessageID]

        ReadStream.push(null)
        delete this._Stream[Data.MessageID]
    }

    Send(Event, Data, MessageType, Option)
    {
        if (this._Connected)
            return this._Socket.write(this.Serialize(Event, Data, MessageType, Option.MessageID))
    }

    AckCallback(MessageID)
    {
        const _this = this

        return function Callback(Data)
        {
            _this.Send('', Data, Serializer.MT_ACK, { MessageID: MessageID })
        }
    }

    Deserialize(buffer)
    {
        let Data
        let Offset = 6 // TODO : This Should Be Fixed In Client And Server
        let DataType = buffer[Offset++]
        let MessageType = buffer[Offset++]

        let MessageID = buffer.readUInt32LE(Offset)
        Offset += 4

        let EventLength = buffer.readUInt16LE(Offset)
        Offset += 2

        let Event = buffer.toString(undefined, Offset, Offset + EventLength)
        Offset += EventLength

        let DataLength = buffer.readUInt32LE(Offset)
        Offset += 4

        switch (DataType)
        {
        case Serializer.DT_STRING:
            Data = buffer.toString(undefined, Offset, Offset + DataLength)
            break
        case Serializer.DT_OBJECT:
            Data = JSON.parse(buffer.slice(Offset, Offset + DataLength).toString())
            break
        case Serializer.DT_BINARY:
            Data = buffer.slice(Offset, Offset + DataLength)
            break
        case Serializer.DT_INTEGER:
            Data = buffer.readIntLE(Offset, DataLength)
            break
        case Serializer.DT_DECIMAL:
            Data = buffer.readDoubleLE(Offset)
            break
        case Serializer.DT_BOOLEAN:
            Data = buffer[Offset]
        }

        return { Event: Event, Data: Data, MessageID: MessageID, MessageType: MessageType }
    }

    Serialize(Event, Data, MessageType, MessageID)
    {
        let DataType

        switch (typeof Data)
        {
        case 'string':
            DataType = Serializer.DT_STRING
            break
        case 'number':
            DataType = Data % 1 === 0 ? Serializer.DT_INTEGER : Serializer.DT_DECIMAL
            break
        case 'object':
            if (Data === null)
                DataType = Serializer.DT_EMPTY
            else if (Data instanceof Buffer)
                DataType = Serializer.DT_BINARY
            else
            {
                Data = Buffer.from(JSON.stringify(Data))
                DataType = Serializer.DT_OBJECT
            }
            break
        case 'boolean':
            Data = Data ? 1 : 0
            DataType = Serializer.DT_BOOLEAN
            break
        default:
            Data = null
            DataType = Serializer.DT_EMPTY
        }

        let EventLength = Buffer.byteLength(Event)
        let DataLength = 0

        switch (DataType)
        {
        case Serializer.DT_STRING:
            DataLength = Buffer.byteLength(Data)
            break
        case Serializer.DT_BINARY:
        case Serializer.DT_OBJECT:
            DataLength = Data.length
            break
        case Serializer.DT_INTEGER:
            DataLength = 6
            break
        case Serializer.DT_DECIMAL:
            DataLength = 8
            break
        case Serializer.DT_BOOLEAN:
            DataLength = 1
            break
        }

        let MessageLength = 8 + 2 + EventLength + 4 + DataLength
        let buffer = Buffer.alloc(4 + MessageLength)
        let Offset = 0

        buffer.writeUInt32LE(MessageLength, Offset)
        Offset += 4

        buffer[Offset] = Serializer.VERSION
        Offset++

        buffer[Offset] = 0
        Offset++

        buffer[Offset] = DataType
        Offset++

        buffer[Offset] = MessageType
        Offset++

        buffer.writeUInt32LE(MessageID, Offset)
        Offset += 4

        buffer.writeUInt16LE(EventLength, Offset)
        Offset += 2

        buffer.write(Event, Offset, EventLength)
        Offset += EventLength

        buffer.writeUInt32LE(DataLength, Offset)
        Offset += 4

        switch (DataType)
        {
        case Serializer.DT_STRING:
            buffer.write(Data, Offset, DataLength)
            break
        case Serializer.DT_BINARY:
        case Serializer.DT_OBJECT:
            Data.copy(buffer, Offset, 0, DataLength)
            break
        case Serializer.DT_INTEGER:
            buffer.writeIntLE(Data, Offset, DataLength)
            break
        case Serializer.DT_DECIMAL:
            buffer.writeDoubleLE(Data, Offset)
            break
        case Serializer.DT_BOOLEAN:
            buffer[Offset] = Data
        }

        return buffer
    }
}

module.exports = Socket

/*
*
*
*
*
*
*
*
*
*
*
*
*/

class Serializer
{

}

Serializer.VERSION = 1

Serializer.DT_STRING = 1
Serializer.DT_BINARY = 2
Serializer.DT_INTEGER = 3
Serializer.DT_DECIMAL = 4
Serializer.DT_OBJECT = 5
Serializer.DT_BOOLEAN = 6
Serializer.DT_EMPTY = 7

Serializer.MT_ERROR = 0
Serializer.MT_REGISTER = 1
Serializer.MT_DATA = 2
Serializer.MT_DATA_TO_SOCKET = 3
Serializer.MT_DATA_WITH_ACK = 6
Serializer.MT_ACK = 7
Serializer.MT_DATA_STREAM_OPEN = 11
Serializer.MT_DATA_STREAM = 12
Serializer.MT_DATA_STREAM_CLOSE = 13
Serializer.MT_DATA_STREAM_OPEN_WITH_ACK = 14
Serializer.MT_DATA_STREAM_OPEN_TO_SOCKET = 15

function Reader()
{
    // Main buffer
    this._buffer = null
    this._offset = 0
    this._bytesRead = 0
    this._messageLength = 0

    // Chunk
    this._offsetChunk = 0
}

Reader.prototype.read = function(chunk)
{
    this._offsetChunk = 0
    var buffers = []

    while (this._offsetChunk < chunk.length)
    {
        if (this._bytesRead < 4)
        {
            if (this._readMessageLength(chunk))
                this._createBuffer()
            else
                break
        }

        if (this._bytesRead < this._buffer.length && !this._readMessageContent(chunk))
            break

        // Buffer ready, store it and keep reading the chunk
        buffers.push(this._buffer)
        this._offset = 0
        this._bytesRead = 0
        this._messageLength = 0
    }

    return buffers
}

Reader.prototype._readMessageLength = function(chunk)
{
    for (; this._offsetChunk < chunk.length && this._bytesRead < 4; this._offsetChunk++, this._bytesRead++)
        this._messageLength |= chunk[this._offsetChunk] << (this._bytesRead * 8)

    return this._bytesRead === 4
}

Reader.prototype._readMessageContent = function(chunk)
{
    var bytesToRead = this._buffer.length - this._bytesRead
    var bytesInChunk = chunk.length - this._offsetChunk
    var end = bytesToRead > bytesInChunk ? chunk.length : this._offsetChunk + bytesToRead

    chunk.copy(this._buffer, this._offset, this._offsetChunk, end)

    var bytesRead = end - this._offsetChunk

    this._bytesRead += bytesRead
    this._offset += bytesRead
    this._offsetChunk = end

    return this._bytesRead === this._buffer.length
}

Reader.prototype._createBuffer = function()
{
    this._buffer = Buffer.allocUnsafe(4 + this._messageLength)
    this._buffer.writeUInt32LE(this._messageLength, this._offset)
    this._offset += 4
}
