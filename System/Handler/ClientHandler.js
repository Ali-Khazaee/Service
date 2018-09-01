'use strict'

const Misc = require('./MiscHandler')

const ClientList = new Map()

module.exports.Add = (Client) =>
{
    ClientList.set(Client._ID, Client)

    DB.collection('client').insertOne({ ID: Client._ID, Owner: MongoID(Client.__Owner), ServerID: process.env.SERVER_ID, Time: Misc.Time() })
}

module.exports.Remove = (ID) =>
{
    ClientList.delete(ID)

    DB.collection('client').deleteOne({ ID: ID }, (Error, Result) =>
    {
        if (Misc.IsDefined(Error))
            Misc.Analyze('ClientRemove', { Error: Error })
    })
}

module.exports.Send = (Owner, PacketID, ID, Message, CallBack) =>
{
    DB.collection('client').find({ Owner: MongoID(Owner) }).project({ _id: 0, ID: 1, ServerID: 1 }).toArray((Error, Result) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('DBError', { Tag: 'ClientHandler-Send', Error: Error })
            return
        }

        if (Misc.IsUndefined(Result[0]))
            return

        for (let I = 0; I < Result.length; I++)
        {
            if (Result[I].ServerID === process.env.SERVER_ID)
            {
                if (ClientList.has(Result[I].ID))
                {
                    ClientList.get(Result[I].ID).Send(PacketID, ID, Message)

                    if (typeof CallBack === 'function')
                        CallBack()
                }
            }
            else
            {
                // FixMe

                if (typeof CallBack === 'function')
                    CallBack()
            }
        }
    })
}
