'use strict'

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const RateLimit = require('../Handler/RateLimitHandler')

module.exports = (Client) =>
{
    /**
     * @Packet SocialFollow
     *
     * @Description Follow Kardan Yek Person
     *
     * @Param {string} Who
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     * Result: 2 >> You can't follow yourself
     * Result: 3 >> Who dosen't exists
     * Result: 4 >> Person Already followed
     */
    Client.On(Packet.SocialFollow, RateLimit(600, 3600), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.SocialFollow, ID, { Result: 1 })

        if (Message.Who === Client.__Owner)
            return Client.Send(Packet.SocialFollow, ID, { Result: 2 })

        Message.Who = MongoID(Message.Who)

        DB.collection('account').find({ _id: Message.Who }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialFollow, Error: Error })
                return Client.Send(Packet.SocialFollow, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialFollow, ID, { Result: 3 })

            DB.collection('follow').find({ $and: [ { Owner: Message.Who }, { Followed: MongoID(Client.__Owner) } ] }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialFollow, Error: Error2 })
                    return Client.Send(Packet.SocialFollow, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.SocialFollow, ID, { Result: 4 })

                DB.collection('follow').insertOne({ Owner: Message.Who, Followed: MongoID(Client.__Owner) }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialFollow, Error: Error3 })
                        return Client.Send(Packet.SocialFollow, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialFollow, ID, { Result: 0 })
                    Misc.Analyze('Request', { ID: Packet.SocialFollow, IP: Client._Address })
                })
            })
        })
    })
}
