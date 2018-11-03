'use strict'

const Crypto = require('crypto')

const Misc = require('./MiscHandler')
const Packet = require('../Model/Packet')

const ALGORITHM = 'aes256'
const HEADER_SIZE = 2 + 4 + 4 // PacketID + RequestLength + RequestID

module.exports = class Socket
{
    constructor(Sock)
    {
        this._Socket = Sock
        this._Socket.setTimeout(300000)
        this._ID = Misc.RandomString(15)
        this._Address = Sock.remoteAddress

        this._SharedSecret = undefined

        this._RequestID = -1
        this._RequestLength = -1
        this._RequestBuffer = Buffer.alloc(0)

        this.RateLimitInit()

        this._Socket.on('data', (BufferCurrent) =>
        {
            Misc.Analyze('SocketData', { IP: this._Address, Length: BufferCurrent.length })

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

            Misc.Analyze('SocketClose', { IP: this._Address, HasError: HasError ? 1 : 0 })
        })

        this._Socket.on('timeout', () =>
        {
            this._Socket.destroy()

            Misc.Analyze('SocketTimeout', { IP: this._Address })
        })

        this._Socket.on('error', (Error) => Misc.Analyze('SocketError', { IP: this._Address, Error: Error }))
    }

    Send(Packet, ID, Message)
    {
        Message = JSON.stringify(Message)

        if (Misc.IsDefined(this._SharedSecret))
        {
            const Cipher = Crypto.createCipher(ALGORITHM, this._SharedSecret)

            Message = Cipher.update(Message, 'utf8', 'base64') + Cipher.final('base64')
        }

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

        let Message = BufferMessage.toString('utf8', HEADER_SIZE)

        if (Misc.IsDefined(this._SharedSecret))
        {
            const Decipher = Crypto.createDecipher(ALGORITHM, this._SharedSecret)

            Message = Decipher.update(Message, 'base64', 'utf8') + Decipher.final()
        }

        const MessageJSON = Misc.IsInvaildJSON(Message)

        if (MessageJSON === 'INVALID')
        {
            this.Send(PacketID, ID, { Result: -4 })
            return
        }

        const Request = this.Request(PacketID)

        this.RateLimit(PacketID, Request.Count, Request.Time).then((Exceed) =>
        {
            if (Exceed)
            {
                this.Send(PacketID, ID, { Result: -2 })
                return
            }

            Request.Execute(ID, MessageJSON)
        })
    }

    RateLimit(PacketID, Count, Time)
    {
        return new Promise((resolve) =>
        {
            const TimeCurrent = Misc.Time()
            const Key = Misc.IsUndefined(this.__Owner) ? this._Address : this.__Owner

            DB.collection('ratelimit').find({ $and: [ { Key: Key }, { ID: PacketID } ] }).count(1).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DataBaseError', { Tag: 'RateLimit', Error: Error })
                    resolve()
                    return
                }

                if (Misc.IsUndefined(Result[0]))
                {
                    DB.collection('ratelimit').insertOne({ Key: Key, ID: PacketID, Count: 1, Time: TimeCurrent + Time }, (Error2) =>
                    {
                        if (Misc.IsDefined(Error2))
                            Misc.Analyze('DataBaseError', { Tag: 'RateLimit-Ins', ID: PacketID, Error: Error2 })
                    })

                    resolve()
                    return
                }

                if (Result[0].Time < TimeCurrent)
                {
                    DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: 1, Time: TimeCurrent + Time } }, (Error3) =>
                    {
                        if (Misc.IsDefined(Error3))
                            Misc.Analyze('ratelimit', { Tag: 'RateLimit-Set', ID: PacketID, Error: Error3 })
                    })

                    resolve()
                    return
                }

                if (Result[0].Count <= Count)
                {
                    DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $inc: { Count: 1 } }, (Error4) =>
                    {
                        if (Misc.IsDefined(Error4))
                            Misc.Analyze('DataBaseError', { Tag: 'RateLimit-Inc', ID: PacketID, Error: Error4 })
                    })

                    resolve()
                    return
                }

                resolve(true)
            })
        })
    }

    Request(PacketID)
    {
        switch (PacketID)
        {
            case Packet.PhoneSignUp: return { Count: 1, Time: 1000, Execute: 0 }
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
            case Packet.ExChange:
                return false
        }

        return Misc.IsUndefined(this.__Owner)
    }
}
