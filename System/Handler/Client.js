'use strict'

const Misc = require('./Misc')

class Client
{
    Add(Client)
    {
        global.DB.collection('client').insertOne(Client)
    }

    Remove(ClientID)
    {
        global.DB.collection('client').remove({_ID: ClientID})
    }

    IsConnected(Owner)
    {
        return new Promise((resolve, reject) =>
        {
            global.DB.collection('client').find({__Owner: Owner}).limit(1).project({_id: 1}).toArray((Result, Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Error: Error })
                    resolve(false)
                }

                resolve(Result)
            })
        })
    }

    Find(Owner)
    {
        return new Promise((resolve, reject) =>
        {
            global.DB.collection('client').find({__Owner: Owner}).limit(1).toArray((Result, Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Error: Error })
                    resolve(null)
                }

                resolve(Result)
            })
        })
    }
}

module.exports = Client
