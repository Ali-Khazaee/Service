'use strict'

const EventEmitter = require('events')

const Misc = require('./Misc')

class Socket extends EventEmitter
{
    constructor(Socket)
    {
        super()

        this._Socket = Socket
        this._ID = Misc.RandomString(15)

        this._TotalLength = -1
        this._DownloadedLength = 0
        this._DownloadedBuffer = Buffer.alloc(0)

        this._Socket.on('close', (HasError) =>
        {
            Misc.Analyze('OnClientClose', { HasError: HasError })
        })

        this._Socket.on('connect', () =>
        {
            Misc.Analyze('OnClientConnect')
        })

        this._Socket.on('data', (Chunk) =>
        {
            console.log('------------------------------')
            console.log('Chunk length: ' + Chunk.length)

            let TempBuffer = Buffer.alloc(this._DownloadedLength + Chunk.length)
            this._DownloadedBuffer.copy(TempBuffer)

            Chunk.copy(TempBuffer, this._DownloadedLength)

            this._DownloadedLength += Chunk.length
            this._DownloadedBuffer = TempBuffer

            TempBuffer = null

            console.log('DownloadedLength: ' + this._DownloadedLength)

            if (this._DownloadedLength < 3 || this._DownloadedLength === 4)
            {
                console.log('Need More Data')
                return
            }
            else if (this._TotalLength < 0)
            {
                this._TotalLength = this._DownloadedBuffer.readUInt16LE(2)
                console.log('TotalLength: ' + this._TotalLength)
            }

            while (this._DownloadedLength >= this._TotalLength)
            {
                let RealBuffer = Buffer.alloc(this._TotalLength)
                this._DownloadedBuffer.copy(RealBuffer)

                this.Deserializer(RealBuffer)

                TempBuffer = Buffer.alloc(this._DownloadedBuffer.length - this._TotalLength)

                this._DownloadedBuffer.copy(TempBuffer, 0, this._TotalLength, this._DownloadedBuffer.length)
                this._DownloadedLength -= this._TotalLength
                this._DownloadedBuffer = TempBuffer
                this._TotalLength = -1

                TempBuffer = null

                if (this._DownloadedLength < 3 || this._DownloadedLength === 4)
                    return
                else if (this._TotalLength < 0)
                    this._TotalLength = this._DownloadedBuffer.readUInt16LE(2)
            }
        })

        this._Socket.on('drain', () =>
        {
            Misc.Analyze('OnClientDrain')
        })

        this._Socket.on('end', () =>
        {
            Misc.Analyze('OnClientEnd')
        })

        this._Socket.on('error', (Error) =>
        {
            Misc.Analyze('OnClientError', { Error: Error })
        })

        this._Socket.on('lookup', (Error, Address, Family, Host) =>
        {
            Misc.Analyze('OnClientLookUp', { Error: Error, Address: Address, Family: Family, Host: Host })
        })

        this._Socket.on('ready', () =>
        {
            Misc.Analyze('OnClientReady')
        })

        this._Socket.on('timeout', () =>
        {
            Misc.Analyze('OnClientTimeOut')
        })
    }

    Deserializer(DataBuffer)
    {
        console.log('A Request arrive')
    }
}

/*
    OpenDataStream(Data)
    {
        const _this = this
        const ReadStream = new Readable({
            read: function()
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

    Send2(Event, Data)
    {
        this.Send(Event, Data, Type.MESSAGE_TYPE_DATA, { MessageID: 0 })
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
        let Offset = 4
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

        const MessageLength = 4 + 1 + 1 + 4 + 2 + EventLength + 4 + DataLength
        const buffer = Buffer.alloc(4 + MessageLength)
        let Offset = 0

        buffer.writeUInt32LE(MessageLength, Offset)
        Offset += 4

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
*/

module.exports = Socket
