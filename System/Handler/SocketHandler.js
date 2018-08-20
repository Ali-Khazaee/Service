'use strict'

const EventEmitter = require('events')

const Misc = require('./MiscHandler')
const Packet = require('../Model/Packet')
const ClientHandler = require('./ClientHandler')

// PacketID + RequestLength + RequestID
const HEADER_SIZE = 2 + 4 + 4

module.exports = class Socket extends EventEmitter
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
            ClientHandler.Remove(this._ID)

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

    OnMessage(BufferMessage)
    {
        let PacketID = BufferMessage.readUInt16LE(0)

        if (this.Auth(PacketID))
            return

        this.RateLimit(PacketID).then((Result) =>
        {
            if (Result)
                this.emit(PacketID, BufferMessage.readUInt32LE(6), BufferMessage.toString('utf8', HEADER_SIZE))
            else
                Misc.Analyze('RateLimit', { PacketID: PacketID, IP: this._Address, Owner: this.__Owner })
        })
    }

    Auth(PacketID)
    {
        switch (PacketID)
        {
            case Packet.PhoneSignUp:
            case Packet.PhoneVerifySignUp:
            case Packet.PhoneSignIn:
            case Packet.PhoneVerifySignIn:
            case Packet.EmailSignUp:
            case Packet.EmailVerifySignUp:
            case Packet.EmailRecovery:
            case Packet.EmailSignIn:
            case Packet.GoogleSignIn:
            case Packet.UsernameSignIn:
            case Packet.Username:
            case Packet.Authentication:
                return false
        }

        return true
    }

    RateLimit(Name, Count, Time)
    {
        return new Promise((resolve) =>
        {
            let CurrentTime = Misc.Time()
            let Key = Name + '_' + Misc.IsDefined(this.__Owner) ? this.__Owner : this._Address

            global.DB.collection('ratelimit').find({ $and: [ { Name: Name }, { Key: Key } ] }).limit(1).project({ Time: 1, Count: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
                    return resolve(false)
                }

                if (Misc.IsUndefined(Result[0]))
                {
                    global.DB.collection('ratelimit').insertOne({ Name: Name, Key: Key, Count: 1, Expire: CurrentTime + Time })
                    return resolve(true)
                }

                if (Result[0].Expire < CurrentTime)
                {
                    global.DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: 1, Expire: CurrentTime + Time } })
                    return resolve(true)
                }

                if (Result[0].Count <= Count)
                {
                    global.DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: Result[0].Count + 1 } })
                    return resolve(true)
                }

                resolve(false)
            })
        })
    }
}
