'use strict'

const Misc = require('./MiscHandler')
const Type = require('../Model/DataType').EventHandler

const RateLimitList = new Map()

module.exports = (Count, Time) =>
{
    return (Message, Next) =>
    {
        let TimeCurrent = Misc.Time()
        let Key = `${(Misc.IsDefined(Message[Type.Client].__Owner) ? Message[Type.Client].__Owner : Message[Type.Client]._Address)}`

        if (RateLimitList.has(Key))
        {
            const Value = RateLimitList.get(Key)

            return
        }

        RateLimitList.set(Key, new Map([ [ Message[Type.Packet], { Count: 3, Time: 10 } ] ]))
        Next()

        DB.collection('ratelimit').find({ Key: Key }).limit(1).project({ _id: 1, Time: 1, Count: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
                Message[Type.Client].Send(Message[Type.Packet], Message[Type.ID], { Result: -1 })
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

            Message[Type.Client].Send(Message[Type.Packet], Message[Type.ID], { Result: -2 })
        })
    }
}

module.exports.Save = (Count, Time) =>
{

}

module.exports.Load = (Count, Time) =>
{
    DB.collection('ratelimit').find({ Key: Key }).limit(1).project({ _id: 1, Time: 1, Count: 1 }).toArray((Error, Result) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('DBError', { Tag: 'RateLimit', Error: Error })
            Message[EventHandler.Client].Send(Message[EventHandler.Packet], Message[EventHandler.ID], { Result: -1 })
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

        Message[EventHandler.Client].Send(Message[EventHandler.Packet], Message[EventHandler.ID], { Result: -2 })
    })
}
