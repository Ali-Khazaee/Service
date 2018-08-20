'use strict'

const Util = require('util')
const Winston = require('winston')

const Logger = Winston.createLogger(
    {
        format: Winston.format.combine(Winston.format.printf(info => (info.message).replace(/\n|\r/g, '').replace(/\s+/g, ' ').trim())),
        transports: [ new Winston.transports.Console({ json: false }), new Winston.transports.File({ filename: './Storage/Debug.log' }) ]
    })

module.exports.Analyze = (Tag, Message) =>
{
    Message = Message || { }
    Message.CreatedTime = Time()

    // FixMe

    Logger.log('error', `${Tag} ${Util.inspect(Message, false, null)}`)
}

function IsUndefined(Value)
{
    if (typeof Value === 'undefined' || Value === undefined || Value == null || Value === null)
        return true

    if (typeof Value === 'string' && Value.length > 0)
        return false

    if (typeof Value === 'string' && Value.length === 0)
        return true

    if (typeof Value === 'object' && Value.constructor === Array && Value.length > 0)
        return false

    if (typeof Value === 'object' && Value.constructor === Array && Value.length === 0)
        return true

    if (typeof CallBack === 'function')
        return false

    if (Value.toString === Object.prototype.toString)
    {
        switch (Value.toString())
        {
            case '[object File]':
            case '[object Map]':
            case '[object Set]':
                return Value.size === 0

            case '[object Object]':
            {
                for (let Key in Value)
                {
                    if (Object.prototype.hasOwnProperty.call(Value, Key))
                        return false
                }

                return true
            }
        }
    }

    return isNaN(Value)
}

module.exports.IsUndefined = IsUndefined

module.exports.IsDefined = (Value) =>
{
    return !IsUndefined(Value)
}

module.exports.TimeMili = () =>
{
    return Math.floor(Date.now())
}

function Time()
{
    return Math.floor(Date.now() / 1000)
}

module.exports.Time = Time

module.exports.ReverseString = (Value) =>
{
    let NewValue = ''

    for (let I = Value.length - 1; I >= 0; I--)
        NewValue += Value[I]

    return NewValue
}

function IsInvalidJSON(Message)
{
    if (typeof Message === 'object')
        return false

    try
    {
        JSON.parse(Message)
    }
    catch (e)
    {
        return true
    }

    return false
}

module.exports.IsInvalidJSON = IsInvalidJSON

module.exports.IsValidJSON = (Message) =>
{
    return !IsInvalidJSON(Message)
}

module.exports.RandomString = (Count) =>
{
    let Result = ''
    const Possible = 'abcdefghijklmnopqrstuvwxyz'

    for (let I = 0; I < Count; I++)
        Result += Possible.charAt(Math.floor(Math.random() * Possible.length))

    return Result
}

module.exports.RandomNumber = (Count) =>
{
    let Result = ''
    const Possible = '0123456789'

    for (let I = 0; I < Count; I++)
        Result += Possible.charAt(Math.floor(Math.random() * Possible.length))

    return Result
}

module.exports.IsInvalidID = (ID) =>
{
    if (global.MongoID.isValid(ID))
        return false

    ID = ID + ''
    let Valid = false

    if (ID.length === 12 || ID.length === 24)
        Valid = /^[0-9a-fA-F]+$/.test(ID)

    return !Valid
}
