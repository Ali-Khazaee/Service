// Set Strict
'use strict'

//
// Libraries
//
const Crypto = require('crypto')

const Misc = require('./Misc')
const Config = require('../Config/Core')

function Create(Owner)
{
    const Segment = JSON.stringify({ Owner: Owner, CreateTime: Misc.Time() })
    const Signer = Crypto.createSign('sha256')
    Signer.update(Misc.ReverseString(Segment))

    const Key = Segment + '.' + Signer.sign(Config.PRIVATE_KEY, 'base64')

    global.DB.collection('token').insertOne({ Owner: Owner, CreateTime: Misc.Time() }, function(Error)
    {
        if (Error)
        {
            Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Create', Error: Error })
            return { Result: 1 }
        }

        return { Result: 0, Key: Key }
    })
}

function Verify(Key)
{
    if (Misc.IsUndefined(Key))
        return { Result: 1 }

    const Split = Key.split('.')

    if (Split.length !== 2)
        return { Result: 2 }

    global.DB.collection('token').findOne({ Key: Key, Useable: true }, { _id: 0, Owner: 1 }, function(Error, Result)
    {
        if (Error)
        {
            Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Verify', Error: Error })
            return { Result: 3 }
        }

        if (Misc.IsUndefined(Result))
            return { Result: 4 }

        return { Result: 0, Owner: Result.Owner }
    })
}

function Update(Key, IP)
{
    global.DB.collection('token').updateOne({ $and: [ { Key: Key }, { Delete: { $not: { $gt: 0 } } } ] }, { $push: { Session: { IP: IP, CreateTime: Misc.Time() } } }, function(Error)
    {
        if (Error)
        {
            Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Update', Error: Error })
            return { Result: 1 }
        }

        return { Result: 0 }
    })
}

function Delete(Key)
{
    global.DB.collection('token').updateOne({ $and: [ { Key: Key }, { Delete: { $not: { $gt: 0 } } } ] }, { $set: { Delete: 1 } }, { $upsert: false }, function(Error)
    {
        if (Error)
        {
            Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Delete', Error: Error })
            return { Result: 1 }
        }

        return { Result: 0 }
    })
}

module.exports.Create = Create
module.exports.Verify = Verify
module.exports.Update = Update
module.exports.Delete = Delete

/*
const Crypto = require('crypto')
const StringTrim = require('locutus/php/strings/strtr')
const StringReplace = require('locutus/php/strings/str_replace')
const AuthConfig = require('../Config/Auth')

function Auth()
{
    return function(req, res, next)
    {
        const Token = req.headers.token

        if (typeof Token === 'undefined' || Token === '')
            return res.json({ Message: -4 })

        const Split = Token.split('.')

        if (Split.length !== 2)
            return res.json({ Message: -4 })

        DB.collection('token').findOne({ Token: Token }, { _id: 1 }, function(error, result)
        {
            if (error) {
                Misc.Log(error)
                return res.json({ Message: -1 })
            }

            if (result !== null) { return res.json({ Message: -4 }) }

            const Data = Split[0]
            let Signature = Split[1]
            const Remainder = Signature.length % 4

            if (Remainder) {
                let PadLength = 4 - Remainder

                let Y = ''
                let Input = '='

                while (true) {
                if (PadLength) { Y += Input }

                PadLength >>= 1

                if (PadLength) { Input += Input } else { break }
                }

                Signature += Y
            }

            Signature = Buffer.from(StringTrim(Signature, '-_', '+/'), 'base64')

            let Verifier = Crypto.createVerify('sha256')
            Verifier.update(Data)

            if (!Verifier.verify(AuthConfig.PUBLIC_KEY, Signature, 'base64')) { return res.json({ Message: -4 }) }

            res.locals.ID = MongoID(JSON.parse(new Buffer(Split[0], 'base64').toString('ascii')).ID)

            next()
        })
    }
}

function AdminAuth () {
  return function (req, res, next) {
    let Session = req.body.Session

    if (typeof Session === 'undefined' || Session === '' || Session !== AuthConfig.ADMIN_SESSION) { return res.json({ Message: -5 }) }

    next()
  }
}

function CreateToken (ID) {
  let Segment = StringReplace('=', '', StringTrim(Buffer.from(JSON.stringify({ ID: ID, Time: Misc.Time() }).toString()).toString('base64'), '+/', '-_'))

  let Signer = Crypto.createSign('sha256')
  Signer.update(Segment)

  return Segment + '.' + Signer.sign(AuthConfig.PRIVATE_KEY, 'base64')
}

module.exports = Auth
module.exports.AdminAuth = AdminAuth
module.exports.CreateToken = CreateToken
*/
