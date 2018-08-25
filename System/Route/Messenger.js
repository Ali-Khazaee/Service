'use strict'

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const MessageType = require('../Model/DataType').Message
const ClientHandler = require('../Handler/ClientHandler')

module.exports = (Client) =>
{
    /**
     * @Packet PersonMessageList
     *
     * @Description Gereftan e List e Akharin Message Ha
     *
     * @Param {string} Who
     * @Param {int} Skip
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     */
    Client.on(Packet.PersonMessageList, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.PersonMessageList, ID, { Result: 1 })

        Message.Skip = parseInt(Message.Skip || 0)

        if (Misc.IsUndefined(Message.Skip))
            Message.Skip = 0

        global.DB.collection('message').find({ $and: [ { $or: [ { $and: [ { From: global.MongoID(Client.__Owner) }, { To: global.MongoID(Message.Who) } ] }, { $and: [ { From: global.MongoID(Message.Who) }, { To: global.MongoID(Client.__Owner) } ] } ] }, { Delete: { $exists: false } } ] }).sort({ Time: 1 }).skip(Message.Skip).limit(10).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageList, Error: Error })
                return Client.Send(Packet.PersonMessageList, ID, { Result: -1 })
            }

            Client.Send(Packet.PersonMessageList, ID, { Result: 0, Message: Result })

            for (let I = 0; I < Result.length; I++)
            {
                global.DB.collection('message').find({ $and: [ { _id: Result[I]._id }, { From: global.MongoID(Message.Who) }, { Delivery: { $exists: false } } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
                {
                    if (Misc.IsDefined(Error2))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.PersonMessageList, Error: Error2 })
                        return Client.Send(Packet.PersonMessageList, ID, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Result2[0]))
                        return

                    let Time = Misc.TimeMili()

                    global.DB.collection('message').updateOne({ _id: Result2[0]._id }, { $set: { Delivery: Time } })

                    ClientHandler.Send(Message.Who, Packet.PersonMessageDelivery, ID, { ID: Result2[0]._id, Delivery: Time })
                })
            }

            Misc.Analyze('Request', { ID: Packet.PersonMessageList, IP: Client._Address })
        })
    })

    /**
     * @Packet PersonMessageSend
     *
     * @Description Ersal e Message Be Shakhs
     *
     * @Param {string} To
     * @Param {string} Message
     * @Param {string} ReplyID - Optional ( Age Ye Messageio Reply Karde Bashe ID e On Message e )
     *
     * Result: 1 >> To ( Undefined, Invalid )
     * Result: 2 >> Message ( Undefined )
     * Result: 3 >> To ( Doesn't Exist )
     *
     * @Return: ID: ID e Message
     *          Time: Zaman e Message
     */
    Client.on(Packet.PersonMessageSend, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.To) || Misc.IsInvalidID(Message.To))
            return Client.Send(Packet.PersonMessageSend, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.PersonMessageSend, ID, { Result: 2 })

        if (Message.Message.length > 4096)
            Message.Message = Message.Message.substring(0, 4096)

        global.DB.collection('account').find({ _id: global.MongoID(Message.To) }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageSend, Error: Error })
                return Client.Send(Packet.PersonMessageSend, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PersonMessageSend, ID, { Result: 3 })

            const Time = Misc.TimeMili()
            const DataMessage = { From: global.MongoID(Client.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Type: MessageType.TEXT, Time: Time }

            if (Misc.IsDefined(Message.ReplyID))
                DataMessage.Reply = Message.ReplyID

            global.DB.collection('message').insertOne(DataMessage, (Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PersonMessageSend, Error: Error2 })
                    return Client.Send(Packet.PersonMessageSend, ID, { Result: -1 })
                }

                Client.Send(Packet.PersonMessageSend, ID, { Result: 0, ID: Result2.insertedId, Time: Time })

                ClientHandler.Send(Message.To, Packet.PersonMessageSend, ID, DataMessage, () =>
                {
                    global.DB.collection('message').updateOne({ _id: global.MongoID(Result2.insertedId) }, { $set: { Delivery: Time } })
                })

                Misc.Analyze('Request', { ID: Packet.PersonMessageSend, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet GroupCreate
     *
     * @Description Sakhtan e Goroh
     *
     * @Param {string} Name
     *
     * Result: 1 >> Name ( Undefined, GT: 32 )
     * Result: 2 >> Too Many Group
     *
     * @Return: ID: ID e Group e
     */
    Client.on(Packet.GroupCreate, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Name) || Message.Name.length > 32)
            return Client.Send(Packet.GroupCreate, ID, { Result: 1 })

        global.DB.collection('group').find({ $and: [ { Owner: global.MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).count((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupCreate, Error: Error })
                return Client.Send(Packet.GroupCreate, ID, { Result: -1 })
            }

            if (Result > 100)
                return Client.Send(Packet.GroupCreate, ID, { Result: 2 })

            global.DB.collection('message').insertOne({ Name: Message.Name, Owner: Client.__Owner }, (Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupCreate, Error: Error2 })
                    return Client.Send(Packet.GroupCreate, ID, { Result: -1 })
                }

                Client.Send(Packet.GroupCreate, ID, { Result: 0, ID: Result2.insertedId })

                Misc.Analyze('Request', { ID: Packet.GroupCreate, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet GroupDelete
     *
     * @Description Hazv e Goroh
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     */
    Client.on(Packet.GroupDelete, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupDelete, ID, { Result: 1 })

        global.DB.collection('group').updateOne({ $and: [ { Owner: global.MongoID(Client.__Owner) }, { _id: global.MongoID(Message.ID) }, { Delete: { $exists: false } } ] }, { $set: { Delete: Misc.Time() } }, (Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupDelete, Error: Error })
                return Client.Send(Packet.GroupDelete, ID, { Result: -1 })
            }

            global.DB.collection('group_member').deleteMany({ Group: global.MongoID(Message.ID) })

            Client.Send(Packet.GroupCreate, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.GroupCreate, IP: Client._Address })
        })
    })

    /**
     * @Packet GroupRename
     *
     * @Description Taghir e Name Goroh
     *
     * @Param {string} ID
     * @Param {string} Name
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Name ( Undefined, GT: 32 )
     */
    Client.on(Packet.GroupRename, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupRename, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Name) || Message.Name.length > 32)
            return Client.Send(Packet.GroupRename, ID, { Result: 1 })

        global.DB.collection('group').updateOne({ $and: [ { Owner: global.MongoID(Client.__Owner) }, { _id: global.MongoID(Message.ID) }, { Delete: { $exists: false } } ] }, { $set: { Name: Message.Name } }, (Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupRename, Error: Error })
                return Client.Send(Packet.GroupRename, ID, { Result: -1 })
            }

            Client.Send(Packet.GroupRename, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.GroupRename, IP: Client._Address })
        })
    })

    /**
     * @Packet GroupList
     *
     * @Description Gereftane List e Goroh Ha Khod
     */
    Client.on(Packet.GroupList, (ID) =>
    {
        global.DB.collection('group').find({ $and: [ { Owner: global.MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupList, Error: Error })
                return Client.Send(Packet.GroupList, ID, { Result: -1 })
            }

            Client.Send(Packet.GroupList, ID, { Result: 0, Message: Result })

            Misc.Analyze('Request', { ID: Packet.GroupList, IP: Client._Address })
        })
    })

    /**
     * @Packet GroupMemberAdd
     *
     * @Description Ezaf e Kardan e Ozv Be Goroh
     *
     * @Param {string} ID
     * @Param {string} Who
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Who ( Undefined, Invalid )
     * Result: 3 >> Who Doesn't Exist
     * Result: 4 >> Group Doesn't Exist | No Rights
     * Result: 5 >> Who Already In Group
     */
    Client.on(Packet.GroupMemberAdd, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMemberAdd, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.GroupMemberAdd, ID, { Result: 1 })

        global.DB.collection('account').find({ _id: global.MongoID(Message.Who) }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error })
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: 3 })

            global.DB.collection('group').find({ $and: [ { Owner: global.MongoID(Client.__Owner) }, { _id: global.MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error2 })
                    return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result2[0]))
                    return Client.Send(Packet.GroupMemberAdd, ID, { Result: 4 })

                global.DB.collection('group_member').find({ $and: [ { Group: global.MongoID(Message.ID) }, { Member: global.MongoID(Message.Who) } ] }).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error3 })
                        return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.GroupMemberAdd, ID, { Result: 5 })

                    global.DB.collection('group_member').insertOne({ Group: global.MongoID(Message.ID), Member: global.MongoID(Message.Who) }, (Error3) =>
                    {
                        if (Misc.IsDefined(Error3))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error3 })
                            return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
                        }

                        Client.Send(Packet.GroupMemberAdd, ID, { Result: 0 })

                        Misc.Analyze('Request', { ID: Packet.GroupMemberAdd, IP: Client._Address })
                    })
                })
            })
        })
    })

    /**
     * @Packet GroupMemberRemove
     *
     * @Description Hazv Kardan e Ozv Az Goroh
     *
     * @Param {string} ID
     * @Param {string} Who
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Who ( Undefined, Invalid )
     * Result: 3 >> Who Doesn't Exist
     * Result: 4 >> Group Doesn't Exist | No Rights
     */
    Client.on(Packet.GroupMemberRemove, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMemberRemove, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.GroupMemberRemove, ID, { Result: 1 })

        global.DB.collection('account').find({ _id: global.MongoID(Message.Who) }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMemberRemove, Error: Error })
                return Client.Send(Packet.GroupMemberRemove, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: 3 })

            global.DB.collection('group').find({ $and: [ { Owner: global.MongoID(Client.__Owner) }, { _id: global.MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupMemberRemove, Error: Error2 })
                    return Client.Send(Packet.GroupMemberRemove, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result2[0]))
                    return Client.Send(Packet.GroupMemberRemove, ID, { Result: 4 })

                global.DB.collection('group_member').deleteOne({ $and: [ { Group: global.MongoID(Message.ID) }, { Member: global.MongoID(Message.Who) } ] }).toArray((Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupMemberRemove, Error: Error3 })
                        return Client.Send(Packet.GroupMemberRemove, ID, { Result: -1 })
                    }

                    Client.Send(Packet.GroupMemberRemove, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.GroupMemberRemove, IP: Client._Address })
                })
            })
        })
    })
}
