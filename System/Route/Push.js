'use strict'

const Packet = require('../Model/Packet')
const ClientManager = require('../Handler/ClientHandler')

module.exports = (Client) =>
{
    Client.on(Packet.Push, (ID, Message) =>
    {
        if (ID !== process.env.CORE_KEY)
            return

        ClientManager.Send(Message.ClientID, Message.PacketID, Message.Message)
    })
}
