'use strict'

const Misc = require('./MiscHandler')

module.exports = (Client, PacketID, Count, Time) =>
{
    return new Promise((resolve) =>
    {
        let TimeCurrent = Misc.Time()
        let Key = PacketID + '_' + Misc.IsDefined(Client.__Owner) ? Client.__Owner : Client._Address

        DB.collection('ratelimit').find({ Key: Key }).limit(1).project({ _id: 1, Time: 1, Count: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
                resolve(false)
                return
            }

            if (Misc.IsUndefined(Result[0]))
            {
                DB.collection('ratelimit').insertOne({ Key: Key, Count: 1, Expire: TimeCurrent + Time })
                resolve(true)
                return
            }

            if (Result[0].Expire < TimeCurrent)
            {
                DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: 1, Expire: TimeCurrent + Time } })
                resolve(true)
                return
            }

            if (Result[0].Count <= Count)
            {
                DB.collection('ratelimit').updateOne({ _id: Result[0]._id }, { $set: { Count: Result[0].Count + 1 } })
                resolve(true)
                return
            }

            resolve(false)
        })
    })
}
