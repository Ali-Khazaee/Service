'use strict'

const Util = require('util')
const Winston = require('winston')

const Logger = Winston.createLogger(
{
    format: Winston.format.combine(Winston.format.printf((info) => info.message.replace(/\n|\r/g, '').replace(/\s+/g, ' ').trim())),
    transports: [ new Winston.transports.Console({ json: false }) ]
})

module.exports.Analyze = (Tag, Message = { }) =>
{
    Message.T = this.Time()

    // FixMe

    Logger.log('error', `${Tag} - ${Util.inspect(Message, false, null)}`)
}

module.exports.IsUndefined = (Value) =>
{
    if (typeof Value === 'undefined')
        return true

    if (typeof Value === 'string' && Value.length > 0)
        return false

    if (typeof Value === 'string' && Value.length === 0)
        return true

    if (typeof Value === 'object' && Value.constructor === Array && Value.length > 0)
        return false

    if (typeof Value === 'object' && Value.constructor === Array && Value.length === 0)
        return true

    if (typeof Value === 'function')
        return false

    if (typeof Value === 'boolean')
        return false

    if (Value === undefined || Value === null || Value == null)
        return true

    if (typeof Value === 'number' && !isNaN(Value) && !isFinite(Value))
        return false

    if (Value.toString === Object.prototype.toString)
    {
        switch (Value.toString())
        {
            case '[object Map]':
            case '[object Set]':
                return Value.size === 0
            case '[object Object]':
            {
                for (let Key in Value)
                {
                    if (Value.hasOwnProperty(Key))
                        return false
                }

                return true
            }
        }
    }

    return true
}

module.exports.IsDefined = (Value) =>
{
    return !this.IsUndefined(Value)
}

module.exports.TimeMili = () =>
{
    return Math.floor(Date.now())
}

module.exports.Time = () =>
{
    return Math.floor(Date.now() / 1000)
}

module.exports.ReverseString = (Value) =>
{
    return Value.split('').reverse().join('')
}

module.exports.IsInvalidJSON = (Message) =>
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

module.exports.IsValidJSON = (Message) =>
{
    return !this.IsInvalidJSON(Message)
}

module.exports.RandomWord = (Count) =>
{
    let Result = ''
    const Possible = 'abcdefghijklmnopqrstuvwxyz'

    for (let I = 0; I < Count; I++)
        Result += Possible.charAt(Math.floor(Math.random() * Possible.length))

    return Result
}

module.exports.RandomString = (Count) =>
{
    let Result = ''
    const Possible = 'abcdefghijklmnopqrstuvwxyz0123456789'

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
    return !MongoID.isValid(ID)
}

module.exports.IsValidID = (ID) =>
{
    return MongoID.isValid(ID)
}

module.exports.Size = (Value) =>
{
    if (Value === 0)
        return '0 B'

    const I = Math.floor(Math.log(Value) / Math.log(1024))

    return parseFloat((Value / Math.pow(1024, I)).toFixed(2)) + ' ' + [ 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB' ][I]
}

module.exports.SendEmail = (Receiver, Subject, Content) =>
{
    const Mailer = require('nodemailer')

    const Transporter = Mailer.createTransport(
    {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth:
        {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })

    Transporter.sendMail({ from: `"${process.env.EMAIL_SENDER}" <${process.env.EMAIL_FROM}>`, to: Receiver, subject: Subject, html: Content }, (Error, Info) =>
    {
        if (this.IsUndefined(Error))
        {
            this.Analyze('MailError', { Error: Error })
            return
        }

        this.Analyze('MailSuccess', { Info: Info })
    })
}

module.exports.IsInvaildJSON = (Message) =>
{
    try
    {
        return JSON.parse(Message)
    }
    catch (Exception)
    {
        return 'INVALID'
    }
}
