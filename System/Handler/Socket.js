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

        this._Socket.on('close', (HasError) =>
        {
            Misc.Analyze('OnClientClose', { HasError: HasError })
        })

        this._Socket.on('connect', () =>
        {
            Misc.Analyze('OnClientConnect')
        })

        var accumulatingBuffer = Buffer.alloc(0)
        var totalPacketLen = -1
        var accumulatingLen = 0
        var recvedThisTimeLen = 0
        var PACKET_HEADER_LEN = 6

        this._Socket.on('data', (Chunk) =>
        {
            recvedThisTimeLen = Chunk.length

            console.log('recvedThisTimeLen=' + recvedThisTimeLen)

            var tmpBuffer = Buffer.alloc(accumulatingLen + recvedThisTimeLen)
            accumulatingBuffer.copy(tmpBuffer)
            Chunk.copy(tmpBuffer, accumulatingLen)
            accumulatingBuffer = tmpBuffer
            tmpBuffer = null
            accumulatingLen += recvedThisTimeLen

            console.log('accumulatingBuffer = ' + accumulatingBuffer)
            console.log('accumulatingLen    =' + accumulatingLen)

            if (accumulatingLen < PACKET_HEADER_LEN)
            {
                console.log('need to get more data(less than header-length received) -> wait..')
                return
            }
            else if (accumulatingLen === PACKET_HEADER_LEN)
            {
                console.log('need to get more data(only header-info is available) -> wait..')
                return
            }
            else
            {
                console.log('before-totalPacketLen=' + totalPacketLen)

                if (totalPacketLen < 0)
                {
                    totalPacketLen = accumulatingBuffer.readUInt32BE(0)
                    console.log('totalPacketLen=' + totalPacketLen)
                }
            }

            while (accumulatingLen >= totalPacketLen + PACKET_HEADER_LEN)
            {
                console.log('누적된 데이터(' + accumulatingLen + ') >= 헤더+데이터 길이(' + (totalPacketLen + PACKET_HEADER_LEN) + ')')
                console.log('accumulatingBuffer= ' + accumulatingBuffer)

                var aPacketBufExceptHeader = Buffer.alloc(totalPacketLen)
                console.log('aPacketBufExceptHeader len= ' + aPacketBufExceptHeader.length)
                accumulatingBuffer.copy(aPacketBufExceptHeader, 0, PACKET_HEADER_LEN, accumulatingBuffer.length)

                var stringData = aPacketBufExceptHeader.toString()
                console.log('AAA: ' + stringData)

                var newBufRebuild = Buffer.alloc(accumulatingBuffer.length - (totalPacketLen + PACKET_HEADER_LEN))
                newBufRebuild.fill()
                accumulatingBuffer.copy(newBufRebuild, 0, totalPacketLen + PACKET_HEADER_LEN, accumulatingBuffer.length)

                accumulatingLen -= (totalPacketLen + PACKET_HEADER_LEN)
                accumulatingBuffer = newBufRebuild
                newBufRebuild = null
                totalPacketLen = -1

                console.log('Init: accumulatingBuffer= ' + accumulatingBuffer)
                console.log('      accumulatingLen   = ' + accumulatingLen)

                if (accumulatingLen <= PACKET_HEADER_LEN)
                    return
                else
                {
                    totalPacketLen = accumulatingBuffer.readUInt32BE(0)
                    console.log('totalPacketLen=' + totalPacketLen)
                }
            }

            return

            const DataBuffer = this.ReadData(Chunk)

            let Packet = DataBuffer.readUInt16LE(0)
            let MessageID = DataBuffer.readUInt16LE(2)
            let DataLength = DataBuffer.readUInt16LE(4)
            let Data = DataBuffer.toString('utf8', 6, 6 + DataLength)

            Misc.Analyze('OnClientData', { DataLength: DataLength + 6, Chunk: Chunk.length })

            // Add Authentication
            // Add RateLimit

            this.emit(Packet, Data, MessageID)
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

    ReadData(Chunk)
    {
        let Buffers = []
        let OffsetChunk = 0
        let MessageLength = 0

        while (OffsetChunk < Chunk.length)
        {
            if (Buffers.length < 6)
            {
                let Packet = DataBuffer.readUInt16LE(0)
                let MessageID = DataBuffer.readUInt16LE(2)
                let DataLength = DataBuffer.readUInt16LE(4)
                let Data = DataBuffer.toString('utf8', 6, 6 + DataLength)

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
