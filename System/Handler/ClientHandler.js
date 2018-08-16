'use strict'

const Misc = require('./MiscHandler')

module.exports.Add = (Client) =>
{
    global.DB.collection('client').insertOne({ ID: Client._ID, Owner: Client.__Owner, ServerID: process.env.SERVER_ID, Time: Misc.Time() })
}

module.exports.Remove = (ID) =>
{
    global.DB.collection('client').remove({ ID: ID })
}

module.exports.Find = (Owner) =>
{
    return new Promise((resolve) =>
    {
        global.DB.collection('client').find({ Owner: Owner }).limit(1).project({ _id: 0, ID: 1, ServerID: 1 }).toArray((Result, Error) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: 'ClientHandler-IsConnected', Error: Error })
                resolve(false)
                return
            }

            resolve(Result[0])
        })
    })
}
