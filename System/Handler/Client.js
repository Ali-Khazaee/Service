'use strict'

const Misc = require('./Misc')

const ClientList = new Map()

function Add(Client)
{
    if (Misc.IsDefined(Client._ID))
        ClientList.set(Client._ID, Client)
}

function Remove(Client)
{
    if (Misc.IsDefined(Client._ID))
        ClientList.delete(Client._ID)
}

function IsConnected(Client)
{
    return Misc.IsDefined(Client._ID) ? ClientList.has(Client._ID) : false
}

function Find(Owner)
{
    for (let Client of ClientList)
    {
        if (Client[1].__Owner === Owner)
            return Client[1]
    }
}

module.exports =
{
    Add: Add,
    Find: Find,
    Remove: Remove,
    IsConnected: IsConnected
}
