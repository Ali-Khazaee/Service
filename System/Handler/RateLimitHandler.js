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

module.exports.Save = (Count, Time) =>
{

}

module.exports.Load = (Count, Time) =>
{

}
