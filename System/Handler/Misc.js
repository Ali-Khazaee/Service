'use strict'

const Util = require('util')
const Winston = require('winston')

Winston.configure({ transports: [ new Winston.transports.Console(), new Winston.transports.File({ filename: './Storage/Debug.log' }) ] })

function Analyze(Tag, Data)
{
    Data.CreatedTime = Time()

    console.log(Tag + ' - ' + Util.inspect(Data, false, null))
}

function IsUndefined(Value)
{
    if (typeof Value === 'undefined' || Value == null || Value === undefined || Value === null)
        return true

    if (typeof Value === 'string' && Value.length > 0)
        return false

    if (typeof Value === 'string' && Value.length === 0)
        return true

    if (typeof Value === 'object' && Value.constructor === Array && Value.length > 0)
        return false

    if (typeof Value === 'object' && Value.constructor === Array && Value.length === 0)
        return true

    if (typeof Value === 'object' && Value.constructor === global.MongoID)
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

function IsDefined(Value)
{
    return !IsUndefined(Value)
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

module.exports.ReverseString = ReverseString
module.exports.IsInvalidJSON = IsInvalidJSON
module.exports.RandomNumber = RandomNumber
module.exports.RandomString = RandomString
module.exports.IsValidJSON = IsValidJSON
module.exports.IsUndefined = IsUndefined
module.exports.IsDefined = IsDefined
module.exports.Analyze = Analyze
module.exports.Time = Time

/*

const EmailPattern = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-?\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/

function IsValidEmail (Email) {
  if (Email === undefined || Email === '' || Email.length > 254) { return true }

  if (!EmailPattern.test(Email)) { return true }

  const Parts = Email.split('@')

  if (Parts[0].length > 64) { return true }

  return Parts[1].split('.').some(function (Part) { return Part.length > 63 })
}

*/
