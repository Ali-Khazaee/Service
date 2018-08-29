'use strict'

const Misc = require('./MiscHandler')

const ID = 0
const CLIENT = 3
const PACKET = 2

module.exports = (Count, Time) =>
{
    return (Message, Next) =>
    {
        return new Promise((resolve) =>
        {
            let TimeCurrent = Misc.Time()
            let Key = Message[PACKET] + '_' + Misc.IsDefined(Message[CLIENT].__Owner) ? Message[CLIENT].__Owner : Message[CLIENT]._Address

            DB.collection('ratelimit').find({ Key: Key }).limit(1).project({ _id: 1, Time: 1, Count: 1 }).toArray((Error, Result) =>
            {
                resolve()

                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
                    Message[CLIENT].Send(Message[PACKET], Message[ID], { Result: -1 })
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

                Message[CLIENT].Send(Message[PACKET], Message[ID], { Result: -4 })
            })
        })
    }
}
