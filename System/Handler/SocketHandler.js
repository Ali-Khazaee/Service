'use strict'

const EventEmitter = require('events')

const Misc = require('./MiscHandler')
const Packet = require('../Model/Packet')
const ClientHandler = require('./ClientHandler')

// PacketID + RequestLength + RequestID
const HEADER_SIZE = 2 + 4 + 4

module.exports = class Socket extends EventEmitter
{
    constructor(Sock)
    {
        super()

        this._Socket = Sock
        this._ID = Misc.RandomString(15)
        this._Address = Sock.remoteAddress

        this._LastRequestID = -1
        this._LastRequestLength = -1
        this._Buffer = Buffer.alloc(0)

        this._Socket.on('data', (BufferCurrent) =>
        {
            Misc.Analyze('ClientData', { IP: this._Address, Length: BufferCurrent.length })

            let NewBuffer = Buffer.alloc(BufferCurrent.length + this._Buffer.length)

            this._Buffer.copy(NewBuffer)

            BufferCurrent.copy(NewBuffer, this._Buffer.length)

            this._Buffer = NewBuffer

            NewBuffer = null

            if (this._Buffer.length <= HEADER_SIZE)
                return

            if (this._LastRequestLength === -1)
            {
                this._LastRequestID = this._Buffer.readUInt32LE(6)
                this._LastRequestLength = this._Buffer.readUInt32LE(2)
            }

            while (this._Buffer.length >= this._LastRequestLength)
            {
                let RequestBuffer = Buffer.alloc(this._LastRequestLength)

                this._Buffer.copy(RequestBuffer)
                this.OnMessage(RequestBuffer)

                NewBuffer = Buffer.alloc(this._Buffer.length - this._LastRequestLength)

                this._Buffer.copy(NewBuffer, 0, this._LastRequestLength)
                this._Buffer = NewBuffer
                this._LastRequestLength = -1
                this._LastRequestID = -1

                NewBuffer = null

                if (this._Buffer.length <= HEADER_SIZE)
                    return

                if (this._LastRequestLength === -1)
                {
                    this._LastRequestID = this._Buffer.readUInt32LE(6)
                    this._LastRequestLength = this._Buffer.readUInt32LE(2)
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
        BufferMessage.write(Message, HEADER_SIZE)

        this._Socket.write(BufferMessage)
    }

    OnMessage(BufferMessage)
    {
        let PacketID = BufferMessage.readUInt16LE(0)

        if (this.Auth(PacketID))
            return

        this.RateLimit(PacketID).then((Result) =>
        {
            try
            {
                if (Result)
                    this.emit(PacketID, BufferMessage.readUInt32LE(6), JSON.parse(BufferMessage.toString('utf8', HEADER_SIZE)))
                else
                    Misc.Analyze('RateLimit', { PacketID: PacketID, IP: this._Address, Owner: this.__Owner })
            }
            catch (Exception)
            {
                Misc.Analyze('OnMessage', { Error: Exception })
            }
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

        return Misc.IsDefined(this.__Owner)
    }

    RateLimit(PacketID)
    {
        return new Promise((resolve) =>
        {
            let Time = 1
            let Name = 'Default'
            let Count = 1000

            switch (PacketID)
            {
                // FixMe Add RateLimit For All Packets
            }

            let TimeCurrent = Misc.Time()
            let Key = Name + '_' + Misc.IsDefined(this.__Owner) ? this.__Owner : this._Address

            global.DB.collection('ratelimit').find({ $and: [ { Name: Name }, { Key: Key } ] }).limit(1).project({ _id: 1, Time: 1, Count: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
                    return resolve(false)
                }

                if (Misc.IsUndefined(Result[0]))
                {
                    global.DB.collection('ratelimit').insertOne({ Name: Name, Key: Key, Count: 1, Expire: TimeCurrent + Time })
                    return resolve(true)
                }

                if (Result[0].Expire < TimeCurrent)
                {
                    global.DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: 1, Expire: TimeCurrent + Time } })
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
