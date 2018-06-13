'use strict'

const ClientList = new Map()

function Add(Client)
{
    ClientList.set(Client.id, Client)
}

function Remove(Client)
{
    ClientList.delete(Client.id)
}

function IsConnected(Client)
{
    return ClientList.has(Client.id)
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
