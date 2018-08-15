const EventEmitter = require('events')

const Misc = require('./Misc')
const Packet = require('../Model/Packet')
const ClientManager = require('./Client')

// PacketID + RequestLength + RequestID
const HEADER_SIZE = 2 + 4 + 4

class Socket extends EventEmitter
{
    constructor(Socket)
    {
        super()

        this._Socket = Socket
        this._ID = Misc.RandomString(15)
        this._Address = Socket.remoteAddress

        this._LastRequestID = -1
        this._LastRequestLength = -1
        this._BufferStorage = Buffer.alloc(0)

        this._Socket.on('data', (CurrentBuffer) =>
        {
            Misc.Analyze('ClientData', { IP: this._Address, Length: CurrentBuffer.length })

            let NewBuffer = Buffer.alloc(CurrentBuffer.length + this._BufferStorage.length)

            this._BufferStorage.copy(NewBuffer)

            CurrentBuffer.copy(NewBuffer, this._BufferStorage.length)

            this._BufferStorage = NewBuffer

            NewBuffer = null

            if (this._BufferStorage.length <= HEADER_SIZE)
                return

            if (this._LastRequestLength === -1)
            {
                this._LastRequestID = this._BufferStorage.readUInt32LE(6)
                this._LastRequestLength = this._BufferStorage.readUInt32LE(2)
            }

            while (this._BufferStorage.length >= this._LastRequestLength)
            {
                let RequestBuffer = Buffer.alloc(this._LastRequestLength)

                this._BufferStorage.copy(RequestBuffer)
                this.OnMessage(RequestBuffer)

                NewBuffer = Buffer.alloc(this._BufferStorage.length - this._LastRequestLength)

                this._BufferStorage.copy(NewBuffer, 0, this._LastRequestLength)
                this._BufferStorage = NewBuffer
                this._LastRequestLength = -1
                this._LastRequestID = -1

                NewBuffer = null

                if (this._BufferStorage.length <= HEADER_SIZE)
                    return

                if (this._LastRequestLength === -1)
                {
                    this._LastRequestID = this._BufferStorage.readUInt32LE(6)
                    this._LastRequestLength = this._BufferStorage.readUInt32LE(2)
                }
            }
        })

        this._Socket.on('close', (HasError) =>
        {
            ClientManager.Remove()

            Misc.Analyze('ClientClose', { IP: this._Address, HasError: HasError ? 1 : 0 })
        })

        this._Socket.on('error', (Error) =>
        {
            Misc.Analyze('ClientError', { IP: this._Address, Error: Error })
        })
    }

    Send(Packet, ID, Message)
    {
        Message = JSON.stringify(Message)

        let BufferMessage = Buffer.alloc(HEADER_SIZE + Message.length)
        BufferMessage.writeInt16LE(Packet)
        BufferMessage.writeInt32LE(BufferMessage.length, 2)
        BufferMessage.writeInt32LE(ID, 6)
        BufferMessage.write(Message, 10)

        this._Socket.write(BufferMessage)
    }

    OnMessage(DataBuffer)
    {
        let PacketID = DataBuffer.readUInt16LE(0)

        if (this.Auth(PacketID))
            return

        this.RateLimit(PacketID).then(() =>
        {
            this.emit(PacketID, DataBuffer.readUInt32LE(6), DataBuffer.toString('utf8', HEADER_SIZE))
        },
        (Error) =>
        {
            Misc.Analyze('RateLimit', { IP: this._Address, Error: Error })
        })
    }

    RateLimit(PacketID)
    {
        return new Promise((resolve, reject) =>
        {
            resolve()

            /*
            global.DB.collection('ratelimit').find({ $and: [ { Packet: PacketID }, { Address: { $exists: false } } ] }).limit(1).project({ _id: 0, Owner: 1 }).toArray(function(Error, Result)
            {
                if (Error)
                {
                    Misc.Analyze('DBError', { Error: Error })
                    return Client.Send(Packet.Authentication, { Result: -1 })
                }

                if (Misc.IsUndefined(Result[0]))
                    return Client.Send(Packet.Authentication, { Result: 2 })

                Client.__Owner = Result[0].Owner

                ClientManager.Add(Client)

                Client.Send(Packet.Authentication, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.Authentication, IP: Client._Address })
            })

            if (true)
                resolve('stuff worked')
            else
                reject(Error('It broke'))
            */
        })
    }

    Auth(PacketID)
    {
        switch (PacketID)
        {
            case Packet.GetMessage:
            case Packet.SendMessage:
            case Packet.OnDelivery:
                if (Misc.IsUndefined(this.__Owner))
                    return true
        }

        return false
    }
}

module.exports = Socket
