'use strict'

const Misc = require('./MiscHandler')
const Packet = require('../Model/Packet')
const EventHandler = require('./EventHandler')
const ClientHandler = require('./ClientHandler')

// PacketID + RequestLength + RequestID
const HEADER_SIZE = 2 + 4 + 4

module.exports = class Socket extends EventHandler
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
        const PacketID = BufferMessage.readUInt16LE(0)
        const ID = BufferMessage.readUInt16LE(4)

        if (this.Auth(PacketID))
            return this.Send(PacketID, ID, { Result: -3 })

        try
        {
            this.emit(PacketID, BufferMessage.readUInt32LE(6), JSON.parse(BufferMessage.toString('utf8', HEADER_SIZE)), PacketID, this)
        }
        catch (Exception)
        {
            Misc.Analyze('OnMessage', { Error: Exception })
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

        return Misc.IsUndefined(String(this.__Owner))
    }
}
