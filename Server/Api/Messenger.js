'use strict'

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const RateLimit = require('../Handler/RateLimitHandler')
const MessageType = require('../Model/DataType').Message
const ClientHandler = require('../Handler/ClientHandler')

module.exports = (Client) =>
{
    /**
     * @Packet PersonList
     *
     * @Description Gereftane List e Person Ha
     *
     * @Param {int} Skip - Optional
     *
     * @Return: Message: Object Array Az Person List
     */
    Client.On(Packet.PersonList, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Skip) || typeof Message.Skip !== 'number')
            Message.Skip = 0

        DB.collection('message').aggregate([ { $match: { $and: [ { To: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] } }, { $sort: { Time: 1 } }, { $skip: Message.Skip }, { $limit: 10 }, { $group: { _id: '$From' } } ]).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonList, Error: Error })
                return Client.Send(Packet.PersonList, ID, { Result: -1 })
            }

            Client.Send(Packet.PersonList, ID, { Result: 0, Message: Result })

            Misc.Analyze('Request', { ID: Packet.PersonList, IP: Client._Address })
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
    Client.On(Packet.PersonMessageSend, RateLimit(240, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.To) || Misc.IsInvalidID(Message.To))
            return Client.Send(Packet.PersonMessageSend, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.PersonMessageSend, ID, { Result: 2 })

        if (Message.Message.length > 4096)
            Message.Message = Message.Message.substring(0, 4096)

        DB.collection('account').find({ _id: MongoID(Message.To) }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageSend, Error: Error })
                return Client.Send(Packet.PersonMessageSend, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PersonMessageSend, ID, { Result: 3 })

            const Time = Misc.TimeMili()
            const DataMessage = { From: MongoID(Client.__Owner), To: MongoID(Message.To), Message: Message.Message, Type: MessageType.TEXT, Time: Time }

            if (Misc.IsDefined(Message.ReplyID) && Misc.IsValidID(Message.ReplyID))
                DataMessage.Reply = Message.ReplyID

            DB.collection('message').insertOne(DataMessage, (Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PersonMessageSend, Error: Error2 })
                    return Client.Send(Packet.PersonMessageSend, ID, { Result: -1 })
                }

                Client.Send(Packet.PersonMessageSend, ID, { Result: 0, ID: Result2.insertedId, Time: Time })

                ClientHandler.Push(Message.To, Packet.PersonMessageSend, ID, DataMessage, () =>
                {
                    DB.collection('message').updateOne({ _id: Result2.insertedId }, { $set: { Delivery: Time } }, (Error3) =>
                    {
                        if (Misc.IsDefined(Error3))
                            Misc.Analyze('DBError', { Tag: Packet.PersonMessageSend, Error: Error3 })
                    })
                })

                Misc.Analyze('Request', { ID: Packet.PersonMessageSend, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet PersonMessageList
     *
     * @Description Gereftan e List e Akharin Message Ha
     *
     * @Param {string} Who
     * @Param {int} Skip - Optional
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     */
    Client.On(Packet.PersonMessageList, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.PersonMessageList, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Skip) || typeof Message.Skip !== 'number')
            Message.Skip = 0

        DB.collection('message').find({ $and: [ { $or: [ { $and: [ { From: MongoID(Client.__Owner) }, { To: MongoID(Message.Who) } ] }, { $and: [ { From: MongoID(Message.Who) }, { To: MongoID(Client.__Owner) } ] } ] }, { Delete: { $exists: false } } ] }).sort({ Time: 1 }).skip(Message.Skip).limit(10).project({ From: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageList, Error: Error })
                return Client.Send(Packet.PersonMessageList, ID, { Result: -1 })
            }

            Client.Send(Packet.PersonMessageList, ID, { Result: 0, Message: Result })

            for (let I = 0; I < Result.length; I++)
            {
                const Time = Misc.TimeMili()

                DB.collection('message').updateOne({ $and: [ { _id: Result[I]._id }, { From: MongoID(Message.Who) }, { Delivery: { $exists: false } } ] }, { $set: { Delivery: Time } }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                        return Misc.Analyze('DBError', { Tag: Packet.PersonMessageList, Error: Error3 })

                    ClientHandler.Push(Message.Who, Packet.PersonMessageDelivery, ID, { _id: Result[I]._id, Delivery: Time })
                })
            }

            Misc.Analyze('Request', { ID: Packet.PersonMessageList, IP: Client._Address })
        })
    })

    /**
     * @Packet PersonMessageInfo
     *
     * @Description Gereftan Info Message Ersal Shode Be Person
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message doesn't exists
     *
     * @Return:
     *     Delivery: Time e Deliver Shodan Message
     *     Seen: Time e Seen Shodan Message
     */
    Client.On(Packet.PersonMessageInfo, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.PersonMessageInfo, ID, { Result: 1 })

        DB.collection('message').find({ $and: [ { _id: MongoID(Message.ID) }, { To: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 0, Delivery: 1, Seen: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageInfo, Error: Error })
                return Client.Send(Packet.PersonMessageInfo, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PersonMessageInfo, ID, { Result: 2 })

            if (Misc.IsUndefined(Result[0].Delivery))
                Result[0].Delivery = 0

            if (Misc.IsUndefined(Result[0].Seen))
                Result[0].Seen = 0

            Client.Send(Packet.PersonMessageInfo, ID, { Result: 0, Message: Result[0] })

            Misc.Analyze('Request', { ID: Packet.PersonMessageInfo, IP: Client._Address })
        })
    })

    /**
     * @Packet PersonMessageClear
     *
     * @Description Clear History Message Haye Person
     *
     * @Param {string} Who
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     */
    Client.On(Packet.PersonMessageClear, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.PersonMessageClear, ID, { Result: 1 })

        DB.collection('message').updateOne({ $and: [ { From: MongoID(Message.Who) }, { To: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageClear, Error: Error })
                return Client.Send(Packet.PersonMessageClear, ID, { Result: -1 })
            }

            Client.Send(Packet.PersonMessageClear, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.PersonMessageClear, IP: Client._Address })
        })
    })

    /**
     * @Packet PersonMessageDelete
     *
     * @Description Delete Message Ersal Shode Be Person
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message doesn't exists
     */
    Client.On(Packet.PersonMessageDelete, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.PersonMessageDelete, ID, { Result: 1 })

        DB.collection('message').find({ $and: [ { _id: MongoID(Message.ID) }, { From: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageDelete, Error: Error })
                return Client.Send(Packet.PersonMessageDelete, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PersonMessageDelete, ID, { Result: 2 })

            DB.collection('message').updateOne({ _id: MongoID(Message.ID) }, { $set: { Delete: Misc.TimeMili() } }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PersonMessageDelete, Error: Error2 })
                    return Client.Send(Packet.PersonMessageDelete, ID, { Result: -1 })
                }

                ClientHandler.Push(Message.To, Packet.PersonMessageDelete, ID, { ID: MongoID(Message.ID) })

                Client.Send(Packet.PersonMessageDelete, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.PersonMessageDelete, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet PersonMessageDelivery
     *
     * @Description Deliver Message Ersal Shode Be Person
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message doesn't exists or already has been delivered
     */
    Client.On(Packet.PersonMessageDelivery, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.PersonMessageDelivery, ID, { Result: 1 })

        DB.collection('message').find({ $and: [ { _id: MongoID(Message.ID) }, { Delete: { $exists: false } }, { Delivery: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PersonMessageDelivery, Error: Error })
                return Client.Send(Packet.PersonMessageDelivery, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PersonMessageDelivery, ID, { Result: 2 })

            const Time = Misc.TimeMili()

            DB.collection('message').updateOne({ _id: MongoID(Message.ID) }, { $set: { Delivery: Time } }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PersonMessageDelivery, Error: Error2 })
                    return Client.Send(Packet.PersonMessageDelivery, ID, { Result: -1 })
                }

                ClientHandler.Push(Message.To, Packet.PersonMessageDelivery, ID, { _id: MongoID(Message.ID), Delivery: Time })

                Client.Send(Packet.PersonMessageDelivery, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.PersonMessageDelivery, IP: Client._Address })
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
     * Result: 2 >> Too Many Groups
     *
     * @Return: ID: ID e Group e
     */
    Client.On(Packet.GroupCreate, RateLimit(600, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Name) || Message.Name.length > 32)
            return Client.Send(Packet.GroupCreate, ID, { Result: 1 })

        DB.collection('group').find({ $and: [ { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).count((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupCreate, Error: Error })
                return Client.Send(Packet.GroupCreate, ID, { Result: -1 })
            }

            if (Result > 100)
                return Client.Send(Packet.GroupCreate, ID, { Result: 2 })

            DB.collection('group').insertOne({ Name: Message.Name, Owner: MongoID(Client.__Owner) }, (Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupCreate, Error: Error2 })
                    return Client.Send(Packet.GroupCreate, ID, { Result: -1 })
                }

                DB.collection('group_member').insertOne({ Group: Result2.insertedId, Member: MongoID(Client.__Owner) }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupCreate, Error: Error3 })
                        return Client.Send(Packet.GroupCreate, ID, { Result: -1 })
                    }

                    Client.Send(Packet.GroupCreate, ID, { Result: 0, ID: Result2.insertedId })

                    Misc.Analyze('Request', { ID: Packet.GroupCreate, IP: Client._Address })
                })
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
    Client.On(Packet.GroupDelete, RateLimit(600, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupDelete, ID, { Result: 1 })

        DB.collection('group').updateOne({ $and: [ { Owner: MongoID(Client.__Owner) }, { _id: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupDelete, Error: Error })
                return Client.Send(Packet.GroupDelete, ID, { Result: -1 })
            }

            DB.collection('group_message').updateMany({ $and: [ { Group: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }, { $set: { Delete: Misc.TimeMili() } }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupDelete, Error: Error2 })
                    return Client.Send(Packet.GroupDelete, ID, { Result: -1 })
                }

                Client.Send(Packet.GroupDelete, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.GroupDelete, IP: Client._Address })
            })

            DB.collection('group_member').find({ Group: MongoID(Message.ID) }).project({ Member: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                    return Misc.Analyze('DBError', { Tag: Packet.GroupDelete, Error: Error2 })

                if (Misc.IsUndefined(Result2[0]))
                    return

                for (let I = 0; I < Result2.length; I++)
                    ClientHandler.Push(Result2[I].Member, Packet.GroupDelete, ID, { _id: MongoID(Message.ID) })

                DB.collection('group_member').deleteMany({ Group: MongoID(Message.ID) }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                        return Misc.Analyze('DBError', { Tag: Packet.GroupDelete, Error: Error3 })
                })
            })
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
     * Result: 3 >> Group dosen't exists / No rights
     */
    Client.On(Packet.GroupRename, RateLimit(600, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupRename, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Name) || Message.Name.length > 32)
            return Client.Send(Packet.GroupRename, ID, { Result: 2 })

        DB.collection('group').updateOne({ $and: [ { Owner: MongoID(Client.__Owner) }, { _id: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }, { $set: { Name: Message.Name } }, (Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupRename, Error: Error })
                return Client.Send(Packet.GroupRename, ID, { Result: -1 })
            }

            if (Result.modifiedCount === 0)
                return Client.Send(Packet.GroupRename, ID, { Result: 3 })

            Client.Send(Packet.GroupRename, ID, { Result: 0 })

            DB.collection('group_member').find({ Group: MongoID(Message.ID) }).project({ Member: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                    return Misc.Analyze('DBError', { Tag: Packet.GroupRename, Error: Error2 })

                if (Misc.IsUndefined(Result2[0]))
                    return

                for (let I = 0; I < Result2.length; I++)
                    ClientHandler.Push(Result2[I].Member, Packet.GroupRename, ID, { _id: MongoID(Message.ID), Name: Message.Name })
            })

            Misc.Analyze('Request', { ID: Packet.GroupRename, IP: Client._Address })
        })
    })

    /**
     * @Packet GroupList
     *
     * @Description Gereftane List e Goroh Ha Khod
     *
     * @Return Message: Array Object Az List Group Ha
     */
    Client.On(Packet.GroupList, RateLimit(120, 60), (ID) =>
    {
        DB.collection('group').find({ $and: [ { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
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
     * Result: 4 >> Can't add yourself
     * Result: 5 >> Group Doesn't Exist | No Rights
     * Result: 6 >> Who Already In Group
     */
    Client.On(Packet.GroupMemberAdd, RateLimit(200, 43200), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMemberAdd, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.GroupMemberAdd, ID, { Result: 1 })

        DB.collection('account').find({ _id: MongoID(Message.Who) }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error })
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: 3 })

            if (Message.Who === Client.__Owner)
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: 4 })

            DB.collection('group').find({ $and: [ { Owner: MongoID(Client.__Owner) }, { _id: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error2 })
                    return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result2[0]))
                    return Client.Send(Packet.GroupMemberAdd, ID, { Result: 5 })

                DB.collection('group_member').find({ $and: [ { Group: MongoID(Message.ID) }, { Member: MongoID(Message.Who) } ] }).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error3 })
                        return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.GroupMemberAdd, ID, { Result: 6 })

                    DB.collection('group_member').insertOne({ Group: MongoID(Message.ID), Member: MongoID(Message.Who) }, (Error3) =>
                    {
                        if (Misc.IsDefined(Error3))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error3 })
                            return Client.Send(Packet.GroupMemberAdd, ID, { Result: -1 })
                        }

                        Client.Send(Packet.GroupMemberAdd, ID, { Result: 0 })

                        DB.collection('group_member').find({ Group: MongoID(Message.ID) }).project({ Member: 1 }).toArray((Error4, Result4) =>
                        {
                            if (Misc.IsDefined(Error4))
                                return Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error4 })

                            if (Misc.IsUndefined(Result4[0]))
                                return

                            for (let I = 0; I < Result4.length; I++)
                                ClientHandler.Push(Result4[I].Member, Packet.GroupMemberAdd, ID, { _id: MongoID(Message.ID), Member: MongoID(Message.Who), AddedBy: MongoID(Client.__Owner) })
                        })

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
     * Result: 4 >> Can't remove yourself
     * Result: 5 >> Group Doesn't Exist | No Rights
     */
    Client.On(Packet.GroupMemberRemove, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMemberRemove, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.GroupMemberRemove, ID, { Result: 2 })

        DB.collection('account').find({ _id: MongoID(Message.Who) }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMemberRemove, Error: Error })
                return Client.Send(Packet.GroupMemberRemove, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: 3 })

            if (Message.Who === Client.__Owner)
                return Client.Send(Packet.GroupMemberAdd, ID, { Result: 4 })

            DB.collection('group').find({ $and: [ { Owner: MongoID(Client.__Owner) }, { _id: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupMemberRemove, Error: Error2 })
                    return Client.Send(Packet.GroupMemberRemove, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result2[0]))
                    return Client.Send(Packet.GroupMemberRemove, ID, { Result: 5 })

                DB.collection('group_member').deleteOne({ $and: [ { Group: MongoID(Message.ID) }, { Member: MongoID(Message.Who) } ] }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupMemberRemove, Error: Error3 })
                        return Client.Send(Packet.GroupMemberRemove, ID, { Result: -1 })
                    }

                    Client.Send(Packet.GroupMemberRemove, ID, { Result: 0 })

                    DB.collection('group_member').find({ Group: MongoID(Message.ID) }).project({ Member: 1 }).toArray((Error4, Result4) =>
                    {
                        if (Misc.IsDefined(Error4))
                            return Misc.Analyze('DBError', { Tag: Packet.GroupMemberAdd, Error: Error4 })

                        if (Misc.IsUndefined(Result4[0]))
                            return

                        for (let I = 0; I < Result4.length; I++)
                            ClientHandler.Push(Result4[I].Member, Packet.GroupMemberAdd, ID, { _id: MongoID(Message.ID), Member: MongoID(Message.Who), RemovedBy: MongoID(Client.__Owner) })
                    })

                    Misc.Analyze('Request', { ID: Packet.GroupMemberRemove, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet GroupMessageSend
     *
     * @Description Ersal e Message Be Shakhs
     *
     * @Param {string} ID
     * @Param {string} Message
     * @Param {string} ReplyID - Optional ( Age Ye Messageio Reply Karde Bashe ID e On Message e )
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message ( Undefined )
     * Result: 3 >> Group Doesn't Exist
     *
     * @Return: ID: ID e Message
     *          Time: Zaman e Message
     */
    Client.On(Packet.GroupMessageSend, RateLimit(240, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMessageSend, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.GroupMessageSend, ID, { Result: 2 })

        if (Message.Message.length > 4096)
            Message.Message = Message.Message.substring(0, 4096)

        DB.collection('group').find({ $and: [ { _id: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
        {
            if (Misc.IsDefined(Error2))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMessageSend, Error: Error2 })
                return Client.Send(Packet.GroupMessageSend, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result2[0]))
                return Client.Send(Packet.GroupMessageSend, ID, { Result: 3 })

            const Time = Misc.TimeMili()
            const DataMessage = { Group: MongoID(Message.ID), From: MongoID(Client.__Owner), Message: Message.Message, Type: MessageType.TEXT, Time: Time }

            if (Misc.IsDefined(Message.ReplyID) && Misc.IsValidID(Message.ReplyID))
                DataMessage.Reply = Message.ReplyID

            DB.collection('group_message').insertOne(DataMessage, (Error4, Result4) =>
            {
                if (Misc.IsDefined(Error4))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupMessageSend, Error: Error4 })
                    return Client.Send(Packet.GroupMessageSend, ID, { Result: -1 })
                }

                Client.Send(Packet.GroupMessageSend, ID, { Result: 0, _id: Result4.insertedId, Time: Time })

                DB.collection('group_member').find({ Group: MongoID(Message.ID) }).project({ Member: 1 }).toArray((Error5, Result5) =>
                {
                    if (Misc.IsDefined(Error5))
                        return Misc.Analyze('DBError', { Tag: Packet.GroupMessageSend, Error: Error5 })

                    if (Misc.IsUndefined(Result5[0]))
                        return

                    for (let I = 0; I < Result5.length; I++)
                    {
                        ClientHandler.Push(Result5[I].Member, Packet.GroupMemberAdd, ID, DataMessage, () =>
                        {
                            DB.collection('group_message').updateOne({ $and: [{ _id: MongoID(Result4.insertedId) }, { Delivery: { $exists: false } }] }, { $set: { Delivery: Misc.TimeMili() } }, (Error6) =>
                            {
                                if (Misc.IsDefined(Error6))
                                    return Misc.Analyze('DBError', { Tag: Packet.GroupMessageSend, Error: Error6 })
                            })
                        })
                    }
                })

                Misc.Analyze('Request', { ID: Packet.GroupMessageSend, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet GroupMessageList
     *
     * @Description Gereftan e List e Group Message Ha
     *
     * @Param {string} ID
     * @Param {int} Skip - Optional
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     */
    Client.On(Packet.GroupMessageList, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMessageList, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Skip) || typeof Message.Skip !== 'number')
            Message.Skip = 0

        DB.collection('group_message').find({ $and: [ { Group: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).sort({ Time: 1 }).skip(Message.Skip).limit(10).project({ From: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMessageList, Error: Error })
                return Client.Send(Packet.GroupMessageList, ID, { Result: -1 })
            }

            Client.Send(Packet.GroupMessageList, ID, { Result: 0, Message: Result })

            for (let I = 0; I < Result.length; I++)
            {
                const Time = Misc.TimeMili()

                DB.collection('group_message').updateOne({ $and: [ { _id: Result[I]._id }, { From: Result[I].From }, { Delivery: { $exists: false } } ] }, { $set: { Delivery: Time } }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                        return Misc.Analyze('DBError', { Tag: Packet.GroupMessageList, Error: Error3 })

                    ClientHandler.Push(String(Result[I].From), Packet.GroupMessageDelivery, ID, { _id: Result[I]._id, Delivery: Time })
                })
            }

            Misc.Analyze('Request', { ID: Packet.GroupMessageList, IP: Client._Address })
        })
    })

    /**
     * @Packet GroupMessageInfo
     *
     * @Description Gereftan Info Message Ersal Shode To Group
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message doesn't exists
     *
     * @Return:
     *     Delivery: Time e Deliver Shodan Message
     *     Seen: Time e Seen Shodan Message
     */
    Client.On(Packet.GroupMessageInfo, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMessageInfo, ID, { Result: 1 })

        DB.collection('group_message').find({ $and: [ { _id: MongoID(Message.ID) }, { Delete: { $exists: false } } ] }).project({ _id: 0, Delivery: 1, Seen: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMessageInfo, Error: Error })
                return Client.Send(Packet.GroupMessageInfo, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMessageInfo, ID, { Result: 2 })

            if (Misc.IsUndefined(Result[0].Delivery))
                Result[0].Delivery = 0

            if (Misc.IsUndefined(Result[0].Seen))
                Result[0].Seen = 0

            Client.Send(Packet.GroupMessageInfo, ID, { Result: 0, Message: Result[0] })

            Misc.Analyze('Request', { ID: Packet.GroupMessageInfo, IP: Client._Address })
        })
    })

    /**
     * @Packet GroupMessageDelete
     *
     * @Description Delete Message Ersal Shode To Group
     *
     * @Param {string} ID
     * @Param {string} Group
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Group ( Undefined, Invalid )
     * Result: 3 >> Group doesn't exists
     * Result: 4 >> Message doesn't exists
     */
    Client.On(Packet.GroupMessageDelete, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMessageDelete, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Group) || Misc.IsInvalidID(Message.Group))
            return Client.Send(Packet.GroupMessageDelete, ID, { Result: 2 })

        DB.collection('group').find({ _id: MongoID(Message.Group) }).project({ _id: 0, Owner: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelete, Error: Error })
                return Client.Send(Packet.GroupMessageDelete, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMessageDelete, ID, { Result: 3 })

            if (String(Result[0].Owner) === Client.__Owner)
            {
                DB.collection('group_message').find({ $and: [ { _id: MongoID(Message.ID) }, { Group: MongoID(Message.Group) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error2, Result2) =>
                {
                    if (Misc.IsDefined(Error2))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelete, Error: Error2 })
                        return Client.Send(Packet.GroupMessageDelete, ID, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Result2[0]))
                        return Client.Send(Packet.GroupMessageDelete, ID, { Result: 4 })

                    DB.collection('group_message').updateOne({ _id: MongoID(Message.ID) }, { $set: { Delete: Misc.TimeMili() } }, (Error3) =>
                    {
                        if (Misc.IsDefined(Error3))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelete, Error: Error3 })
                            return Client.Send(Packet.GroupMessageDelete, ID, { Result: -1 })
                        }

                        Client.Send(Packet.GroupMessageDelete, ID, { Result: 0 })

                        Misc.Analyze('Request', { ID: Packet.GroupMessageDelete, IP: Client._Address })
                    })
                })
            }
            else
            {
                DB.collection('group_message').find({ $and: [ { _id: MongoID(Message.ID) }, { Group: MongoID(Message.Group) }, { From: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error2, Result2) =>
                {
                    if (Misc.IsDefined(Error2))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelete, Error: Error2 })
                        return Client.Send(Packet.GroupMessageDelete, ID, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Result2[0]))
                        return Client.Send(Packet.GroupMessageDelete, ID, { Result: 4 })

                    DB.collection('group_message').updateOne({ _id: MongoID(Message.ID) }, { $set: { Delete: Misc.TimeMili() } }, (Error3) =>
                    {
                        if (Misc.IsDefined(Error3))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelete, Error: Error3 })
                            return Client.Send(Packet.GroupMessageDelete, ID, { Result: -1 })
                        }

                        Client.Send(Packet.GroupMessageDelete, ID, { Result: 0 })

                        Misc.Analyze('Request', { ID: Packet.GroupMessageDelete, IP: Client._Address })
                    })
                })
            }

            DB.collection('group_member').find({ Group: MongoID(Message.Group) }).project({ Member: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                    return Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelete, Error: Error2 })

                if (Misc.IsUndefined(Result2[0]))
                    return

                for (let I = 0; I < Result2.length; I++)
                    ClientHandler.Push(Result2[I].Member, Packet.GroupMessageDelete, ID, { _id: MongoID(Message.ID) })
            })
        })
    })

    /**
     * @Packet GroupMessageDelivery
     *
     * @Description Deliver Message Ersal Shode to Group
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message doesn't exists or already has been delivered
     */
    Client.On(Packet.GroupMessageDelivery, RateLimit(200, 300), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.GroupMessageDelivery, ID, { Result: 1 })

        DB.collection('group_message').find({ $and: [ { _id: MongoID(Message.ID) }, { Delete: { $exists: false } }, { Delivery: { $exists: false } } ] }).project({ _id: 0, From: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelivery, Error: Error })
                return Client.Send(Packet.GroupMessageDelivery, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.GroupMessageDelivery, ID, { Result: 2 })

            const Time = Misc.TimeMili()

            DB.collection('group_message').updateOne({ _id: MongoID(Message.ID) }, { $set: { Delivery: Time } }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.GroupMessageDelivery, Error: Error2 })
                    return Client.Send(Packet.GroupMessageDelivery, ID, { Result: -1 })
                }

                Client.Send(Packet.GroupMessageDelivery, ID, { Result: 0 })

                ClientHandler.Push(Result[0].From, Packet.GroupMessageDelivery, ID, { _id: MongoID(Message.ID), Delivery: Time })

                Misc.Analyze('Request', { ID: Packet.GroupMessageDelivery, IP: Client._Address })
            })
        })
    })
}
