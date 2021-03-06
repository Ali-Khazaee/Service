'use strict'

const Crypto = require('crypto')

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const Config = require('../Handler/ConfigHandler')

/**
 * @Packet Username
 *
 * @Description Bar Resie Azad Bodane Username
 *
 * @Param {string} Username
 *
 * Result: 1 >> Username ( Undefined, GT: 32, LT: 3, NE: Regex )
 * Result: 2 >> Username Exist
 **/
module.exports.Username = (Client, ID, Message) =>
{
    if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.test(Message.Username))
        return Client.Send(Packet.Username, ID, { Result: 1 })

    Message.Username = Message.Username.toLowerCase()

    DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('DataBaseError', { Tag: Packet.Username, Error: Error })
            return Client.Send(Packet.Username, ID, { Result: -1 })
        }

        if (Misc.IsDefined(Result[0]))
            return Client.Send(Packet.Username, ID, { Result: 2 })

        Client.Send(Packet.Username, ID, { Result: 0 })

        Misc.Analyze('Request', { ID: Packet.Username, IP: Client._Address })
    })
}

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
 **/
module.exports.Authentication = (Client, ID, Message) =>
{
    if (Misc.IsUndefined(Message.Key))
        return Client.Send(Packet.Authentication, ID, { Result: 1 })

    DB.collection('auth').find({ $and: [ { Key: Message.Key }, { Revoke: { $exists: false } } ] }).limit(1).project({ _id: 0, Owner: 1 }).toArray((Error, Result) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('DataBaseError', { Tag: Packet.Authentication, Error: Error })
            Client.Send(Packet.Authentication, ID, { Result: -1 })
            return
        }

        if (Misc.IsUndefined(Result[0]))
        {
            Client.Send(Packet.Authentication, ID, { Result: 2 })
            return
        }

        if (Misc.IsDefined(Client.__Owner))
        {
            Client.Send(Packet.Authentication, ID, { Result: 3 })
            return
        }

        Client.__Owner = String(Result[0].Owner)

        Client.Send(Packet.Authentication, ID, { Result: 0 })

        Misc.Analyze('Request', { ID: Packet.Authentication, IP: Client._Address })
    })
}

/**
 * @Packet ExChange
 *
 * @Description Tabadole Kilid
 *
 * @Param {string} Key
 *
 * Result: 1 >> P || G || N ( Undefined )
 * Result: 2 >> Not Valid
 **/
module.exports.ExChange = (Client, ID, Message) =>
{
    if (Misc.IsUndefined(Message.P) || Misc.IsUndefined(Message.G) || Misc.IsUndefined(Message.N))
        return Client.Send(Packet.ExChange, ID, { Result: 1 })

    try
    {
        const DH = Crypto.createDiffieHellman(Message.P, Message.G)

        Client.__SharedSecret = DH.computeSecret(Message.N)

        Client.Send(Packet.ExChange, ID, { Result: 0, N: DH.generateKeys() })
    }
    catch (Exception)
    {
        Client.Send(Packet.ExChange, ID, { Result: 2 })
    }
}
