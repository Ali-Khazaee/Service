const Misc = require('../Handler/Misc')
const Packet = require('../Handler/Packet')
const ClientManager = require('../Handler/Client')
const MessageType = require('../Handler/TypeList').Message

module.exports = function(Client)
{
    /**
     * @Packet GetMessage
     *
     * @Description DarKhast e Gereftan e List e Message Ha
     *
     * @Param {string} Who
     * @Param {int} Skip
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     */
    Client.on(Packet.GetMessage, function(Message)
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.Username, { Result: 1 })

        Message.Skip = parseInt(Message.Skip || 0)

        global.DB.collection('message').find({ $or: [ { $and: [ { From: global.MongoID(Client.__Owner) }, { To: global.MongoID(Message.Who) } ] }, { $and: [ { From: global.MongoID(Message.Who) }, { To: global.MongoID(Client.__Owner) } ] } ] }).sort({ Time: 1 }).skip(Message.Skip).limit(10).toArray(async function(Error, Result)
        {
            if (Error)
            {
                Misc.Analyze('DBError', { Error: Error })
                return Client.Send(Packet.GetMessage, { Result: -1 })
            }

            for (let I = 0; I < Result.length; I++)
            {
                global.DB.collection('message').find({ $and: [ { _id: Result[I]._id }, { Delivery: { $exists: false } } ] }).toArray(function(Error2, Result2)
                {
                    if (Error2)
                    {
                        Misc.Analyze('DBError', { Error: Error2 })
                        return Client.Send(Packet.GetMessage, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Result2[0]))
                        return

                    let Time = Misc.TimeMili()
                    const From = ClientManager.Find(Result2[0].From)

                    if (Misc.IsDefined(From))
                    {
                        From.Send(Packet.OnDelivery, { ID: Result2[0]._id, Delivery: Time })
                        global.DB.collection('message').updateOne({ _id: Result[I]._id }, { $set: { Delivery: Time } })
                    }
                })
            }

            Client.Send(Packet.GetMessage, { Result: 0, Message: Result })

            Misc.Analyze('Request', { ID: Packet.GetMessage, IP: Client._Address })
        })
    })

    /**
     * @Packet SendMessage
     *
     * @Description DarKhast e Ersal e Message
     *
     * @Param {string} To
     * @Param {string} Message
     * @Param {string} ReplyID - Optional ( Age Ye Messageio Reply Karde Bashe ID e On Message e )
     *
     * Result: 1 >> To ( Undefined, Invalid )
     * Result: 2 >> Message ( Undefined )
     * Result: 3 >> To ( Doesn't Exist )
     *
     * @Return: ID: DataMessage.insertedId, Time: Time, Delivery: DataMessage.Delivery
     */
    Client.on(Packet.SendMessage, function(Message)
    {
        if (Misc.IsUndefined(Message.To) || Misc.IsInvalidID(Message.To))
            return Client.Send(Packet.Username, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.Username, { Result: 2 })

        if (Message.Message.length > 4096)
            Message.Message = Message.Message.substring(0, 4096)

        global.DB.collection('account').find({ _id: global.MongoID(Message.To) }).limit(1).project({ _id: 1 }).toArray(async function(Error, Result)
        {
            if (Error)
            {
                Misc.Analyze('DBError', { Error: Error })
                return Client.Send(Packet.SendMessage, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.Username, { Result: 3 })

            const Time = Misc.TimeMili()
            const DataMessage = { From: global.MongoID(Client.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Type: MessageType.TEXT, Time: Time }

            if (Misc.IsDefined(Message.ReplyID))
                DataMessage.Reply = Message.ReplyID

            const To = ClientManager.Find(Message.To)

            if (Misc.IsDefined(To))
            {
                To.Send(Packet.SendMessage, DataMessage)
                DataMessage.Delivery = Time
            }

            await global.DB.collection('message').insertOne(DataMessage)

            if (Misc.IsDefined(To))
                global.DB.collection('message').updateOne({ _id: DataMessage.insertedId }, { $set: { Delivery: Time } })

            Client.Send(Packet.SendMessage, { Result: 0, ID: DataMessage.insertedId, Time: Time, Delivery: DataMessage.Delivery })

            Misc.Analyze('Request', { ID: Packet.SendMessage, IP: Client._Address })
        })
    })
}
