'use strict'

const Misc = require('./MiscHandler')
const EventHandler = require('../Model/DataType').EventHandler

module.exports = (Count, Time) =>
{
    return (Message, Next) =>
    {
        let TimeCurrent = Misc.Time()
        let Key = `${Message[EventHandler.Packet]}_${(Misc.IsValidID(Message[EventHandler.Client].__Owner) ? Message[EventHandler.Client].__Owner : Message[EventHandler.Client]._Address)}`

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

            Message[EventHandler.Client].Send(Message[EventHandler.Packet], Message[EventHandler.ID], { Result: -4 })
        })
    }
}
