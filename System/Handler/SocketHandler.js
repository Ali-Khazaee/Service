'use strict'

const EventEmitter = require('events')

const Misc = require('./MiscHandler')
const Packet = require('../Model/Packet')

// PacketID + RequestLength + RequestID
const HEADER_SIZE = 2 + 4 + 4

const RateLimitList = new Map()

module.exports = class Socket extends EventEmitter
{
    constructor(Sock)
    {
        super()

        this._Socket = Sock
        this._Socket.setTimeout(300000)
        this._ID = Misc.RandomString(15)
        this._Address = Sock.remoteAddress

        this._RequestID = -1
        this._RequestLength = -1
        this._RequestBuffer = Buffer.alloc(0)

        this.RateLimitInit()

        this._Socket.on('data', (BufferCurrent) =>
        {
            Misc.Analyze('ClientData', { IP: this._Address, Length: BufferCurrent.length })

            let NewBuffer = Buffer.alloc(BufferCurrent.length + this._RequestBuffer.length)

            this._RequestBuffer.copy(NewBuffer)

            BufferCurrent.copy(NewBuffer, this._RequestBuffer.length)

            this._RequestBuffer = NewBuffer

            NewBuffer = null

            if (this._RequestBuffer.length <= HEADER_SIZE)
                return

            if (this._RequestLength === -1)
            {
                this._RequestID = this._RequestBuffer.readUInt32LE(6)
                this._RequestLength = this._RequestBuffer.readUInt32LE(2)
            }

            while (this._RequestBuffer.length >= this._RequestLength)
            {
                let RequestBuffer = Buffer.alloc(this._RequestLength)

                this._RequestBuffer.copy(RequestBuffer)
                this.OnMessage(RequestBuffer)

                NewBuffer = Buffer.alloc(this._RequestBuffer.length - this._RequestLength)

                this._RequestBuffer.copy(NewBuffer, 0, this._RequestLength)
                this._RequestBuffer = NewBuffer
                this._RequestLength = -1
                this._RequestID = -1

                NewBuffer = null

                if (this._RequestBuffer.length <= HEADER_SIZE)
                    return

                if (this._RequestLength === -1)
                {
                    this._RequestID = this._RequestBuffer.readUInt32LE(6)
                    this._RequestLength = this._RequestBuffer.readUInt32LE(2)
                }
            }
        })

        this._Socket.on('close', (HasError) =>
        {
            ClientHandler.Remove(this._ID)
            RateLimitHandler.Save(this)

            Misc.Analyze('ClientClose', { IP: this._Address, HasError: HasError ? 1 : 0 })
        })

        this._Socket.on('timeout', () =>
        {
            this._Socket.destroy()

            Misc.Analyze('ClientTimeout', { IP: this._Address })
        })

        this._Socket.on('error', (Error) => Misc.Analyze('ClientError', { IP: this._Address, Error: Error }))
    }

    RateLimitInit()
    {
        DB.collection('ratelimit').find({ Key: this._Address }).limit(1).project({ _id: 0, Data: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'RateLimitInit', Error: Error })
                return
            }

            if (Misc.IsUndefined(Result[0]))
                return

            try
            {
                const Data = JSON.parse(Result[0].Data)
                const Temp = new Map()

                for (let Key of Object.keys(Data))
                    Temp.set(Key, Data[Key])

                RateLimitList.set(this._Address, Temp)
            }
            catch (Exception)
            {
                Misc.Analyze('RateLimitInit', { Error: Exception })
            }
        })
    }

    On(...Args)
    {
        let Message
        let Arg = [ ]

        const Next = () =>
        {
            if (Arg.length === 1)
                Arg.shift().apply(this, Message)
            else if (Arg.length > 1)
                Arg.shift().call(this, Message, Next)
        }

        super['on'](Args.shift(), (ID, PacketMessage, PacketID) =>
        {
            Message = [ ]
            Message.push(ID)
            Message.push(PacketMessage)
            Message.push(PacketID)
            Message.push(this)

            Arg = Args.slice(0)

            Next()
        })
    }

    Send(Packet, ID, Message)
    {
        Message = JSON.stringify(Message)

        const BufferMessage = Buffer.alloc(HEADER_SIZE + Message.length)

        BufferMessage.writeInt16LE(Packet)
        BufferMessage.writeInt32LE(BufferMessage.length, 2)
        BufferMessage.writeInt32LE(ID, 6)
        BufferMessage.write(Message, HEADER_SIZE)

        this._Socket.write(BufferMessage)
    }

    OnMessage(BufferMessage)
    {
        const PacketID = BufferMessage.readUInt16LE(0)
        const ID = BufferMessage.readUInt32LE(6)

        if (this.Auth(PacketID))
        {
            this.Send(PacketID, ID, { Result: -3 })
            return
        }

        try
        {
            this.emit(PacketID, ID, JSON.parse(BufferMessage.toString('utf8', HEADER_SIZE)), PacketID)
        }
        catch (Exception)
        {
            this.Send(PacketID, ID, { Result: -4 })
            Misc.Analyze('SocketHandler-OnMessage', { Error: Exception })
        }
    }

    Auth(PacketID)
    {
        switch (PacketID)
        {
            case Packet.PhoneSignUp:
            case Packet.PhoneSignUpVerify:
            case Packet.PhoneSignIn:
            case Packet.PhoneSignInVerify:
            case Packet.EmailSignUp:
            case Packet.EmailSignUpVerify:
            case Packet.EmailSignIn:
            case Packet.EmailSignInVerify:
            case Packet.GoogleSignIn:
            case Packet.GoogleSignInVerify:
            case Packet.Authentication:
                return false
        }

        return Misc.IsUndefined(this.__Owner)
    }
}
