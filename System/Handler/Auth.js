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
    return new Promise(function(resolve)
    {
        const Segment = Buffer.from(JSON.stringify({ Owner: Owner, CreateTime: Misc.Time() })).toString('base64')
        const Signer = Crypto.createSign('sha256')
        Signer.update(Misc.ReverseString(Segment))

        const Key = Segment + '.' + Signer.sign(Config.PRIVATE_KEY, 'base64')

        global.DB.collection('token').insertOne({ Owner: Owner, Key: Key, CreateTime: Misc.Time() }, function(Error)
        {
            if (Error)
            {
                Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Create', Error: Error })
                resolve({ Result: 1 })
                return
            }

            resolve({ Result: 0, Key: Key })
        })
    })
}

function Verify(Key)
{
    return new Promise(function(resolve)
    {
        if (Misc.IsUndefined(Key))
        {
            resolve({ Result: 1 })
            return
        }

        const Data = Key.split('.')

        if (Data.length !== 2)
        {
            resolve({ Result: 2 })
            return
        }

        let Verifier = Crypto.createVerify('sha256')
        Verifier.update(Misc.ReverseString(Data[0]))

        if (!Verifier.verify(Config.PUBLIC_KEY, Data[1], 'base64'))
        {
            resolve({ Result: 3 })
            return
        }

        global.DB.collection('token').aggregate([ { $match: { $and: [ { Key: Key }, { Delete: { $not: { $gt: 0 } } } ] } }, { $project: { _id: 0, Owner: 1 } }, { $limit: 1 } ]).toArray(function(Error, Result)
        {
            if (Error)
            {
                Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Verify', Error: Error })
                return { Result: 4 }
            }

            if (Misc.IsUndefined(Result[0]))
            {
                resolve({ Result: 5 })
                return
            }

            resolve({ Result: 0, Owner: Result[0].Owner })
        })
    })
}

function Delete(Key)
{
    return new Promise(function(resolve)
    {
        global.DB.collection('token').updateOne({ $and: [ { Key: Key }, { Delete: { $not: { $gt: 0 } } } ] }, { $set: { Delete: 1 } }, function(Error)
        {
            if (Error)
            {
                Misc.Analyze('OnDataBaseWarning', { Tag: 'Auth-Delete', Error: Error })
                resolve({ Result: 1 })
                return
            }

            resolve({ Result: 0 })
        })
    })
}

module.exports.Create = Create
module.exports.Verify = Verify
module.exports.Delete = Delete
