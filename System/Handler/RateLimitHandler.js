'use strict'

const Misc = require('./MiscHandler')

module.exports = (PacketID, Client, Count, Time) =>
{
    return (Data, Next) =>
    {
        return new Promise((resolve) =>
        {
            let TimeCurrent = Misc.Time()
            let Key = PacketID + '_' + Misc.IsDefined(Client.__Owner) ? Client.__Owner : Client._Address

            DB.collection('ratelimit').find({ Key: Key }).limit(1).project({ _id: 1, Time: 1, Count: 1 }).toArray((Error, Result) =>
            {
                resolve()

                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
                    Client.Send(PacketID, Data[0], { Result: -1 })
                    return
                }

                if (Misc.IsUndefined(Result[0]))
                {
                    DB.collection('ratelimit').insertOne({ Key: Key, Count: 1, Expire: TimeCurrent + Time })
                    return Next()
                }

                if (Result[0].Expire < TimeCurrent)
                {
                    DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: 1, Expire: TimeCurrent + Time } })
                    return Next()
                }

                if (Result[0].Count <= Count)
                {
                    DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: Result[0].Count + 1 } })
                    return Next()
                }

                Client.Send(PacketID, Data[0], { Result: -4 })
            })
        })
    }
}
