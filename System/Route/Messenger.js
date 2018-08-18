'use strict'

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const MessageType = require('../Model/DataType').Message
const ClientHandler = require('../Handler/ClientHandler')

module.exports = (Client) =>
{
    /**
     * @Packet GetMessage
     *
     * @Description DarKhast e Gereftan e List e Akharin Message Ha
     *
     * @Param {string} Who
     * @Param {int} Skip
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     */
    Client.on(Packet.GetMessage, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.Username, ID, { Result: 1 })

        Message.Skip = parseInt(Message.Skip || 0)

        if (Misc.IsUndefined(Message.Skip))
            Message.Skip = 0

        global.DB.collection('message').find({ $or: [ { $and: [ { From: global.MongoID(Client.__Owner) }, { To: global.MongoID(Message.Who) } ] }, { $and: [ { From: global.MongoID(Message.Who) }, { To: global.MongoID(Client.__Owner) } ] } ] }).sort({ Time: 1 }).skip(Message.Skip).limit(10).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GetMessage, Error: Error })
                return Client.Send(Packet.GetMessage, ID, { Result: -1 })
            }

            Client.Send(Packet.GetMessage, ID, { Result: 0, Message: Result })

            for (let I = 0; I < Result.length; I++)
            {
                global.DB.collection('message').find({ $and: [ { _id: Result[I]._id }, { Delivery: { $exists: false } } ] }).toArray((Error2, Result2) =>
                {
                    if (Misc.IsDefined(Error2))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GetMessage, Error: Error2 })
                        return Client.Send(Packet.GetMessage, ID, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Result2[0]))
                        return

                    let Time = Misc.TimeMili()

                    ClientHandler.Send(Result2[0].From, Packet.OnDelivery, ID, { ID: Result2[0]._id, Delivery: Time }, () =>
                    {
                        global.DB.collection('message').updateOne({ _id: Result[I]._id }, { $set: { Delivery: Time } })
                    })
                })
            }

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
    Client.on(Packet.SendMessage, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.To) || Misc.IsInvalidID(Message.To))
            return Client.Send(Packet.Username, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.Username, ID, { Result: 2 })

        if (Message.Message.length > 4096)
            Message.Message = Message.Message.substring(0, 4096)

        global.DB.collection('account').find({ _id: global.MongoID(Message.To) }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SendMessage, Error: Error })
                return Client.Send(Packet.SendMessage, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.Username, ID, { Result: 3 })

            const Time = Misc.TimeMili()
            const DataMessage = { From: global.MongoID(Client.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Type: MessageType.TEXT, Time: Time }

            if (Misc.IsDefined(Message.ReplyID))
                DataMessage.Reply = Message.ReplyID

            global.DB.collection('message').insertOne(DataMessage, (Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SendMessage, Error: Error2 })
                    return Client.Send(Packet.SendMessage, ID, { Result: -1 })
                }

                Client.Send(Packet.SendMessage, ID, { Result: 0, ID: Result2.insertedId, Time: Time })

                ClientHandler.Send(Message.To, Packet.SendMessage, ID, DataMessage, () =>
                {
                    global.DB.collection('message').updateOne({ _id: global.MongoID(Result2.insertedId) }, { $set: { Delivery: Time } })
                })

                Misc.Analyze('Request', { ID: Packet.SendMessage, IP: Client._Address })
            })
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
    Client.on(Packet.SendMessage, (ID, Message) =>
    {

    })
}
