'use strict'

const Misc = require('./MiscHandler')

const ClientList = new Map()

module.exports.Add = (Client) =>
{
    ClientList.set(Client._ID, Client)

    global.DB.collection('client').insertOne({ ID: Client._ID, Owner: Client.__Owner, ServerID: Config.ServerID, Time: Misc.Time() })
}

module.exports.Remove = (ID) =>
{
    ClientList.delete(ID)

    global.DB.collection('client').deleteOne({ ID: ID })
}

module.exports.Send = (Owner, PacketID, ID, Message, CallBack) =>
{
    global.DB.collection('client').find({ Owner: Owner }).project({ _id: 0, ID: 1, ServerID: 1 }).toArray((Result, Error) =>
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
            if (Result[I].ServerID === Config.ServerID)
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
                // FixMe Send HTTP To Remote Server

                if (typeof CallBack === 'function')
                    CallBack()
            }
        }
    })
}
