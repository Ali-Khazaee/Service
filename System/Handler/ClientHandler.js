'use strict'

const Misc = require('./MiscHandler')
const Push = require('./PushHandler')

const ClientList = new Map()

module.exports.Add = (Client) =>
{
    DB.collection('client').insertOne({ ID: Client._ID, Owner: MongoID(Client.__Owner), ServerID: process.env.CORE_ID, Time: Misc.Time() }, (Error) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('ClientHandler-Add', { Error: Error })
            return
        }

        ClientList.set(Client._ID, Client)
    })
}

module.exports.Remove = (ID) =>
{
    DB.collection('client').deleteOne({ ID: ID }, (Error) =>
    {
        if (Misc.IsDefined(Error))
        {
            Misc.Analyze('ClientHandler-Remove', { Error: Error })
            return
        }

        ClientList.delete(ID)
    })
}

module.exports.Send = (ClientID, PacketID, Message) =>
{
    if (ClientList.has(ClientID))
        ClientList.get(ClientID).Send(PacketID, 0, Message)
}

module.exports.Push = (Owner, PacketID, Message, CallBack) =>
{
    DB.collection('client').find({ Owner: Owner }).project({ _id: 0, ID: 1, ServerID: 1 }).toArray((Error, Result) =>
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
            if (Result[I].ServerID === process.env.CORE_ID)
            {
                if (ClientList.has(Result[I].ID))
                {
                    ClientList.get(Result[I].ID).Send(PacketID, 0, Message)

                    if (typeof CallBack === 'function')
                        CallBack()
                }
            }
            else
            {
                Push(Result[I].ServerID, Result[I].ID, PacketID, Message).then((Result) =>
                {
                    if (Result && typeof CallBack === 'function')
                        CallBack()
                })
            }
        }
    })
}
