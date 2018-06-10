'use strict'

const EventEmitter = require('events')
const Readable = require('stream').Readable

function Type()
{

}

Type.DATA_TYPE_STRING = 1
Type.DATA_TYPE_BINARY = 2
Type.DATA_TYPE_INTEGER = 3
Type.DATA_TYPE_DECIMAL = 4
Type.DATA_TYPE_OBJECT = 5
Type.DATA_TYPE_BOOLEAN = 6
Type.DATA_TYPE_EMPTY = 7

Type.MESSAGE_TYPE_ACK = 7
Type.MESSAGE_TYPE_DATA = 2
Type.MESSAGE_TYPE_DATA_WITH_ACK = 6
Type.MESSAGE_TYPE_DATA_STREAM_CLOSE = 13
Type.MESSAGE_TYPE_DATA_STREAM_OPEN_WITH_ACK = 14

class Socket extends EventEmitter
{
    constructor(Socket)
    {
        super()

        this._Queue = [ ]
        this._Stream = { }
        this._MessageID = 1
        this._Socket = Socket
        this._Connected = true

        this._Socket.on('data', (Chunk) =>
        {
            const buffer = this.Read(Chunk)

            for (let I = 0; I < buffer.length; I++)
            {
                const Data = this.Deserialize(buffer[I])

                switch (Data.MessageType)
                {
                case Type.MESSAGE_TYPE_DATA:
                    this.emit(Data.Event, Data.Data)
                    break
                case Type.MESSAGE_TYPE_DATA_WITH_ACK:
                    this.emit(Data.Event, Data.Data, this.AckCallback(Data.MessageID))
                    break
                case Type.MESSAGE_TYPE_DATA_STREAM_OPEN_WITH_ACK:
                    this.emit(Data.Event, this.OpenDataStream(Data), Data.Data, this.AckCallback(Data.MessageID))
                    break
                case Type.MESSAGE_TYPE_DATA_STREAM:
                    this.TransmitDataStream(Data)
                    break
                case Type.MESSAGE_TYPE_DATA_STREAM_CLOSE:
                    this.CloseDataStream(Data)
                    break
                }
            }
        })

        this._Socket.on('connect', () =>
        {
            this._Connected = true

            if (this._Queue.length > 0)
            {
                for (var i = 0; i < this._Queue.length; i++)
                    this._Socket.write(this._Queue[i])

                this._Queue.length = 0
            }
        })

        this._Socket.on('close', (Error) =>
        {
            this._Socket = null
            this._Connected = false
        })

        this._Buffer = null
        this._Offset = 0
        this._ReadByte = 0
    }

    Read(Chunk)
    {
        let Buffers = []
        let OffsetChunk = 0
        let MessageLength = 0

        while (OffsetChunk < Chunk.length)
        {
            if (this._ReadByte < 4)
            {
                for (; OffsetChunk < Chunk.length && this._ReadByte < 4; OffsetChunk++, this._ReadByte++)
                    MessageLength |= Chunk[OffsetChunk] << (this._ReadByte * 8)

                if (this._ReadByte === 4)
                {
                    this._Buffer = Buffer.allocUnsafe(4 + MessageLength)
                    this._Buffer.writeUInt32LE(MessageLength, this._Offset)
                    this._Offset += 4
                }
                else
                    break
            }

            let ByteToRead = this._Buffer.length - this._ReadByte
            let End = ByteToRead > (Chunk.length - OffsetChunk) ? Chunk.length : OffsetChunk + ByteToRead

            Chunk.copy(this._Buffer, this._Offset, OffsetChunk, End)

            const ByteRead = End - OffsetChunk

            this._ReadByte += ByteRead
            this._Offset += ByteRead

            OffsetChunk = End

            if (this._ReadByte < this._Buffer.length && this._ReadByte !== this._Buffer.length)
                break

            Buffers.push(this._Buffer)
            this._Offset = 0
            this._ReadByte = 0
            MessageLength = 0
        }

        return Buffers
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
        const Buff = this.Serialize(Event, Data, MessageType, Option.MessageID)

        if (this._Connected)
            return this._Socket.write(Buff)
        else
            this._Queue.push(Buff)
    }

    AckCallback(MessageID)
    {
        const _this = this

        return function Callback(Data)
        {
            _this.Send('', Data, Type.MESSAGE_TYPE_ACK, { MessageID: MessageID })
        }
    }

    Deserialize(buffer)
    {
        let Data
        let Offset = 6
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
        case Type.DATA_TYPE_STRING:
            Data = buffer.toString(undefined, Offset, Offset + DataLength)
            break
        case Type.DATA_TYPE_OBJECT:
            Data = JSON.parse(buffer.slice(Offset, Offset + DataLength).toString())
            break
        case Type.DATA_TYPE_BINARY:
            Data = buffer.slice(Offset, Offset + DataLength)
            break
        case Type.DATA_TYPE_INTEGER:
            Data = buffer.readIntLE(Offset, DataLength)
            break
        case Type.DATA_TYPE_DECIMAL:
            Data = buffer.readDoubleLE(Offset)
            break
        case Type.DATA_TYPE_BOOLEAN:
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
            DataType = Type.DATA_TYPE_STRING
            break
        case 'number':
            DataType = Data % 1 === 0 ? Type.DATA_TYPE_INTEGER : Type.DATA_TYPE_DECIMAL
            break
        case 'object':
            if (Data === null)
                DataType = Type.DATA_TYPE_EMPTY
            else if (Data instanceof Buffer)
                DataType = Type.DATA_TYPE_BINARY
            else
            {
                Data = Buffer.from(JSON.stringify(Data))
                DataType = Type.DATA_TYPE_OBJECT
            }
            break
        case 'boolean':
            Data = Data ? 1 : 0
            DataType = Type.DATA_TYPE_BOOLEAN
            break
        default:
            Data = null
            DataType = Type.DATA_TYPE_EMPTY
        }

        let EventLength = Buffer.byteLength(Event)
        let DataLength = 0

        switch (DataType)
        {
        case Type.DATA_TYPE_STRING:
            DataLength = Buffer.byteLength(Data)
            break
        case Type.DATA_TYPE_BINARY:
        case Type.DATA_TYPE_OBJECT:
            DataLength = Data.length
            break
        case Type.DATA_TYPE_INTEGER:
            DataLength = 6
            break
        case Type.DATA_TYPE_DECIMAL:
            DataLength = 8
            break
        case Type.DATA_TYPE_BOOLEAN:
            DataLength = 1
            break
        }

        let MessageLength = 8 + 2 + EventLength + 4 + DataLength
        let buffer = Buffer.alloc(4 + MessageLength)
        let Offset = 0

        buffer.writeUInt32LE(MessageLength, Offset)
        Offset += 4

        buffer[Offset] = 1
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
        case Type.DATA_TYPE_STRING:
            buffer.write(Data, Offset, DataLength)
            break
        case Type.DATA_TYPE_BINARY:
        case Type.DATA_TYPE_OBJECT:
            Data.copy(buffer, Offset, 0, DataLength)
            break
        case Type.DATA_TYPE_INTEGER:
            buffer.writeIntLE(Data, Offset, DataLength)
            break
        case Type.DATA_TYPE_DECIMAL:
            buffer.writeDoubleLE(Data, Offset)
            break
        case Type.DATA_TYPE_BOOLEAN:
            buffer[Offset] = Data
        }

        return buffer
    }
}

module.exports = Socket
