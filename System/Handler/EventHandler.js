const EventEmitter = require('events')

module.exports = class EventHandler extends EventEmitter
{
    On(...Args)
    {
        const Data = { }
        const Next = () => Args.shift().call(this, Data, Next)

        super['on'](Args.shift(), (PacketID, ID, Message) =>
        {
            Data.PacketID = PacketID
            Data.ID = ID
            Data.Message = Message
            Next()
        })
    }
}
