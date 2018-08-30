'use strict'

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const RateLimit = require('../Handler/RateLimitHandler')
const ClientManager = require('../Handler/ClientHandler')

module.exports = (Client) =>
{
    /**
     * @Packet Username
     *
     * @Description BarResie Azad Bodane Username
     *
     * @Param {string} Username
     *
     * Result: 1 >> Username ( Undefined, GT: 32, LT: 3, NE: Regex )
     * Result: 2 >> Username Exist
     */
    Client.On(Packet.Username, RateLimit(1800, 3600), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.test(Message.Username))
            return Client.Send(Packet.Username, ID, { Result: 1 })

        Message.Username = Message.Username.toLowerCase()

        DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.Username, Error: Error })
                return Client.Send(Packet.Username, ID, { Result: -1 })
            }

            if (Misc.IsDefined(Result[0]))
                return Client.Send(Packet.Username, ID, { Result: 2 })

            Client.Send(Packet.Username, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.Username, IP: Client._Address })
        })
    })

    /**
     * @Packet Authentication
     *
     * @Description Sabt e Hoviat Roye Connection
     *
     * @Param {string} Key
     *
     * Result: 1 >> Key ( Undefined )
     * Result: 2 >> Key Doesn't exist
     * Result: 3 >> Already Authenticated
     */
    Client.On(Packet.Authentication, RateLimit(1800, 3600), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Key))
            return Client.Send(Packet.Authentication, ID, { Result: 1 })

        DB.collection('auth').find({ $and: [ { Key: Message.Key }, { Revoke: { $exists: false } } ] }).limit(1).project({ _id: 0, Owner: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.Authentication, Error: Error })
                return Client.Send(Packet.Authentication, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.Authentication, ID, { Result: 2 })

            if (Misc.IsValidID(String(Client.__Owner)))
                return Client.Send(Packet.Authentication, ID, { Result: 3 })

            Client.__Owner = Result[0].Owner

            ClientManager.Add(Client)

            Client.Send(Packet.Authentication, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.Authentication, IP: Client._Address })
        })
    })
}
