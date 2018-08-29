const EventEmitter = require('events')

module.exports = class EventHandler extends EventEmitter
{
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

        super['on'](Args.shift(), (ID, PacketMessage, PacketID, Client) =>
        {
            Message = [ ]
            Message.push(ID)
            Message.push(PacketMessage)
            Message.push(PacketID)
            Message.push(Client)

            Arg = Args.slice(0)

            Next()
        })
    }
}
