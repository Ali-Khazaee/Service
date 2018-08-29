const EventEmitter = require('events')

module.exports = class EventHandler extends EventEmitter
{
    On(...Args)
    {
        const Message = [ ]
        const Next = () =>
        {
            if (Args.length === 1)
                return Args.shift().apply(this, Message)

            Args.shift().call(this, Message, Next)
        }

        super['on'](Args.shift(), (ID, PacketMessage, PacketID, Client) =>
        {
            Message.push(ID)
            Message.push(PacketMessage)
            Message.push(PacketID)
            Message.push(Client)

            Next()
        })
    }
}
