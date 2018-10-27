'use strict'

const Misc = require('./MiscHandler')
const Type = require('../Model/DataType').EventHandler

const RateLimitList = new Map()

module.exports = (Count, Time) =>
{
    return (Message, Next) =>
    {
        const TimeCurrent = Misc.Time()
        const Key = Misc.IsUndefined(Message[Type.Client].__Owner) ? Message[Type.Client]._Address : Message[Type.Client].__Owner

        if (RateLimitList.has(Key))
        {
            if (RateLimitList.get(Key).has(Message[Type.Packet]))
            {
                const Value = RateLimitList.get(Key).get(Message[Type.Packet])

                if (Value.Expire < TimeCurrent)
                {
                    Value.Count = 1
                    Value.Expire = TimeCurrent + Time
                    return Next()
                }

                if (Value.Count <= Count)
                {
                    Value.Count += 1
                    return Next()
                }

                Message[Type.Client].Send(Message[Type.Packet], Message[Type.ID], { Result: -2 })
                return
            }

            RateLimitList.get(Key).set(Message[Type.Packet], { Count: 1, Expire: TimeCurrent + Time })
            return Next()
        }

        RateLimitList.set(Key, new Map([ [ Message[Type.Packet], { Count: 1, Expire: TimeCurrent + Time } ] ]))
        Next()
    }
}

module.exports.Save = (Sock) =>
{
    const Key = Misc.IsUndefined(Sock.__Owner) ? Sock._Address : Sock.__Owner

    if (!RateLimitList.has(Key))
        return

    DB.collection('ratelimit').updateOne({ Key: Key }, { $set: { Key: Key, Data: JSON.stringify([...RateLimitList.get(Key)]) } }, { upsert: true })
}

module.exports.Init = (Sock) =>
{
    const Key = Misc.IsUndefined(Sock.__Owner) ? Sock._Address : Sock.__Owner

    DB.collection('ratelimit').find({ Key: Key }).limit(1).project({ _id: 0, Data: 1 }).toArray((Error, Result) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('DBError', { Tag: 'RateLimitHandler', Error: Error })
            return
        }

        if (Misc.IsUndefined(Result[0]))
            return

        try
        {
            RateLimitList.set(Key, new Map(JSON.parse(Result[0].Data)))
        }
        catch (Exception)
        {
            Misc.Analyze('RateLimitHandler', { Error: Exception })
        }
    })
}
