const EventEmitter = require('events')

module.exports = class EventHandler extends EventEmitter
{
    On(...Args)
    {
        const Data = [ ]
        const Next = () =>
        {
            if (Args.length === 1)
                return Args.shift().apply(this, Data)

            Args.shift().call(this, Data, Next)
        }

        super['on'](Args.shift(), (ID, Message, PacketID, Client) =>
        {
            Data.push(ID)
            Data.push(Message)
            Data.push(PacketID)
            Data.push(Client)

            Next()
        })
    }
}
