'use strict'

const Util = require('util')
const Winston = require('winston')

const Logger = Winston.createLogger(
{
    format: Winston.format.combine(Winston.format.printf((info) => info.message.replace(/\n|\r/g, '').replace(/\s+/g, ' ').trim())),
    transports: [ new Winston.transports.Console({ json: false }), new Winston.transports.File({ filename: './Storage/Debug.log' }) ]
})

module.exports.Analyze = (Tag, Message) =>
{
    Message = Message || { }
    Message.CreatedTime = this.Time()

    // FixMe Insert Me In DB Async And Low Priority

    Logger.log('error', `${Tag} - ${Util.inspect(Message, false, null)}`)
}

module.exports.IsUndefined = (Value) =>
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

    if (typeof Value === 'function')
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

    return isNaN(Value)
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
    let NewValue = ''

    for (let I = Value.length - 1; I >= 0; I--)
        NewValue += Value[I]

    return NewValue
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

module.exports.SendEmail = (Receiver, Subject, Content) =>
{
    const Mailer = require('nodemailer')

    let Transporter = Mailer.createTransport(
    {
        host: Config.Core.EMAIL_HOST,
        port: Config.Core.EMAIL_PORT,
        secure: Config.Core.EMAIL_SECURE,
        auth:
        {
            user: Config.Core.EMAIL_USERNAME,
            pass: Config.Core.EMAIL_PASSWORD
        }
    })

    let Options =
    {
        from: `"${Config.Core.EMAIL_SENDER}" <${Config.Core.EMAIL_FROM}>`,
        to: Receiver,
        subject: Subject,
        html: Content
    }

    Transporter.sendMail(Options, (Error, Info) =>
    {
        if (Error)
        {
            this.Analyze('MailError', { Error: Error })
            return
        }

        this.Analyze('MailSuccess', { Info: Info })
    })
}
