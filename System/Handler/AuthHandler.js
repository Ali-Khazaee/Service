'use strict'

const Crypto = require('crypto')

const Misc = require('./MiscHandler')
const Config = require('../Config/Core')

module.exports.AuthCreate = (Owner) =>
{
    return new Promise((resolve) =>
    {
        const Time = Misc.Time()
        const Segment = Buffer.from(JSON.stringify({ Owner: Owner, Time: Time })).toString('base64')
        const Signer = Crypto.createSign('sha256')

        Signer.update(Misc.ReverseString(Segment))

        const Key = `${Segment}.${Signer.sign(Config.AUTH_PRIVATE_KEY, 'base64')}`

        global.DB.collection('token').insertOne({ Owner: Owner, Key: Key, Time: Time }, (Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'AuthHandler-AuthCreate', Error: Error })
                resolve({ Result: 1 })
                return
            }

            resolve({ Result: 0, Key: Key })
        })
    })
}

module.exports.AuthVerify = (Key) =>
{
    return new Promise((resolve) =>
    {
        const Param = Key.split('.')

        if (Param.length !== 2)
        {
            resolve({ Result: 1 })
            return
        }

        let Verifier = Crypto.createVerify('sha256')

        Verifier.update(Misc.ReverseString(Param[0]))

        if (!Verifier.verify(Config.AUTH_PUBLIC_KEY, Param[1], 'base64'))
        {
            resolve({ Result: 2 })
            return
        }

        global.DB.collection('token').find({ $and: [ { Key: Key }, { Delete: { $exists: false } } ] }).project({ _id: 0, Owner: 1 }).limit(1).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'AuthHandler-AuthVerify', Error: Error })
                resolve({ Result: -1 })
                return
            }

            if (Misc.IsUndefined(Result[0]))
            {
                resolve({ Result: 3 })
                return
            }

            resolve({ Result: 0, Owner: Result[0].Owner })
        })
    })
}

module.exports.AuthDelete = (Key) =>
{
    return new Promise((resolve) =>
    {
        global.DB.collection('token').updateOne({ $and: [ { Key: Key }, { Delete: { $exists: false } } ] }, { $set: { Delete: Misc.Time() } }, (Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'AuthHandler-Delete', Error: Error })
                resolve({ Result: 1 })
                return
            }

            resolve({ Result: 0 })
        })
    })
}
