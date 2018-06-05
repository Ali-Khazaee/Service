// Set Strict
'use strict'

const ClientList = new Map()

function Add(Client)
{
    ClientList.set(Client.id, Client)
}

function Find(Owner)
{
    for (let Client of ClientList)
    {
        if (Client[1].__Owner === Owner)
            return Client[1]
    }
}

function Remove(Client)
{
    ClientList.delete(Client.id)
}

function IsAvailable(Client)
{
    return ClientList.has(Client.id)
}

module.exports =
{
    Add: Add,
    Find: Find,
    Remove: Remove,
    IsAvailable: IsAvailable
}
