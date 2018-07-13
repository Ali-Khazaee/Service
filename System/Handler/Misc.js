'use strict'

const Util = require('util')
const Winston = require('winston')

Winston.configure({ transports: [ new Winston.transports.Console(), new Winston.transports.File({ filename: './Storage/Debug.log' }) ] })

function Analyze(Tag, Data, Level)
{
    Level = Level || 'warning'
    Data.CreatedTime = Time()

    Winston.log(Level, Tag + ' - ' + Util.inspect(Data, false, null))
}

function API(Tag, Data, Level)
{
    Level = Level || 'info'
    Data.CreatedTime = Time()

    Winston.log(Level, 'API-' + Tag + ' - ' + Util.inspect(Data, false, null))
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

function IsDefined(Value)
{
    return !IsUndefined(Value)
}

function TimeMili()
{
    return Math.floor(Date.now())
}

function Time()
{
    return Math.floor(Date.now() / 1000)
}

function ReverseString(Value)
{
    let NewValue = ''

    for (let I = Value.length - 1; I >= 0; I--)
        NewValue += Value[I]

    return NewValue
}

function IsInvalidJSON(Data)
{
    if (typeof Data === 'object')
        return false

    try
    {
        JSON.parse(Data)
    }
    catch (e)
    {
        return true
    }

    return false
}

function IsValidJSON(Data)
{
    return !IsInvalidJSON(Data)
}

function RandomString(Count)
{
    let Result = ''
    const Possible = 'abcdefghijklmnopqrstuvwxyz'

    for (let I = 0; I < Count; I++)
        Result += Possible.charAt(Math.floor(Math.random() * Possible.length))

    return Result
}

function RandomNumber(Count)
{
    let Result = ''
    const Possible = '0123456789'

    for (let I = 0; I < Count; I++)
        Result += Possible.charAt(Math.floor(Math.random() * Possible.length))

    return Result
}

function IsInvalidID(ID)
{
    if (global.MongoID.isValid(ID))
        return false

    ID = ID + ''
    let Valid = false

    if (ID.length === 12 || ID.length === 24)
        Valid = /^[0-9a-fA-F]+$/.test(ID)

    return !Valid
}

module.exports.ReverseString = ReverseString
module.exports.IsInvalidJSON = IsInvalidJSON
module.exports.RandomNumber = RandomNumber
module.exports.RandomString = RandomString
module.exports.IsValidJSON = IsValidJSON
module.exports.IsUndefined = IsUndefined
module.exports.IsDefined = IsDefined
module.exports.IsInvalidID = IsInvalidID
module.exports.Analyze = Analyze
module.exports.TimeMili = TimeMili
module.exports.Time = Time
module.exports.API = API
