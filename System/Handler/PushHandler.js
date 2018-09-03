'use strict'

const Net = require('net')
const EventEmitter = require('events')

const Misc = require('./MiscHandler')
const Packet = require('../Model/Packet')
const ClientHandler = require('./ClientHandler')

// PacketID + RequestLength + RequestID
const HEADER_SIZE = 2 + 4 + 4

const ServerList =
[
    { },
    { ID: 1, URL: process.env.SERVER_1, Key: process.env.SERVER_1_KEY }
]

module.exports.Socket = class Socket extends EventEmitter
{
    constructor(Client)
    {
        super()

        this._Socket = Client
        this._Address = Client.remoteAddress

        this._RequestID = -1
        this._RequestLength = -1
        this._Buffer = Buffer.alloc(0)

        this._Socket.on('data', (BufferCurrent) =>
        {
            Misc.Analyze('PushData', { IP: this._Address, Length: BufferCurrent.length })

            let NewBuffer = Buffer.alloc(BufferCurrent.length + this._Buffer.length)

            this._Buffer.copy(NewBuffer)

            BufferCurrent.copy(NewBuffer, this._Buffer.length)

            this._Buffer = NewBuffer

            NewBuffer = null

            if (this._Buffer.length <= HEADER_SIZE)
                return

            if (this._RequestLength === -1)
            {
                this._RequestID = this._Buffer.readUInt32LE(6)
                this._RequestLength = this._Buffer.readUInt32LE(2)
            }

            while (this._Buffer.length >= this._RequestLength)
            {
                let RequestBuffer = Buffer.alloc(this._RequestLength)

                this._Buffer.copy(RequestBuffer)
                this.OnMessage(RequestBuffer)

                NewBuffer = Buffer.alloc(this._Buffer.length - this._RequestLength)

                this._Buffer.copy(NewBuffer, 0, this._RequestLength)
                this._Buffer = NewBuffer
                this._RequestLength = -1
                this._RequestID = -1

                NewBuffer = null

                if (this._Buffer.length <= HEADER_SIZE)
                    return

                if (this._RequestLength === -1)
                {
                    this._RequestID = this._Buffer.readUInt32LE(6)
                    this._RequestLength = this._Buffer.readUInt32LE(2)
                }
            }
        })

        this._Socket.on('close', (HasError) => Misc.Analyze('PushClose', { IP: this._Address, HasError: HasError ? 1 : 0 }))

        this._Socket.on('error', (Error) => Misc.Analyze('PushError', { IP: this._Address, Error: Error }))
    }

    OnMessage(BufferMessage)
    {
        try
        {
            const ID = BufferMessage.readUInt32LE(6)
            const PacketID = BufferMessage.readUInt16LE(0)
            const Message = JSON.parse(BufferMessage.toString('utf8', HEADER_SIZE))

            switch (PacketID)
            {
                case Packet.Push:
                    if (ID !== process.env.CORE_KEY)
                        return

                    ClientHandler.Send(Message.ClientID, Message.PacketID, Message.Message)
                    break
            }
        }
        catch (Exception)
        {
            Misc.Analyze('PushHandler-OnMessage', { Error: Exception })
        }
    }
}

module.exports = (ServerID, ClientID, PacketID, Message) =>
{
    return new Promise((resolve) =>
    {
        try
        {
            const Client = new Net.Socket().connect(process.env.CORE_PUSH_PORT, ServerList[ServerID].URL, () => Misc.Analyze('PushHandler-Connected', { ID: process.env.CORE_ID }))

            const MessagePush = JSON.stringify({ Client: ClientID, PacketID: PacketID, Message: Message })
            const BufferMessage = Buffer.alloc(HEADER_SIZE + MessagePush.length)

            BufferMessage.writeInt16LE(Packet.Push)
            BufferMessage.writeInt32LE(BufferMessage.length, 2)
            BufferMessage.writeInt32LE(parseInt(ServerList[ServerID].Key), 6)
            BufferMessage.write(MessagePush, HEADER_SIZE)

            Client.write(BufferMessage)
            Client.destroy()

            resolve(true)
        }
        catch (Exception)
        {
            resolve(false)
            Misc.Analyze('PushHandler-Error', { ID: process.env.CORE_ID, Error: Exception })
        }
    })
}
