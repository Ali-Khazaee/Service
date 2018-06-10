'use strict'

// Environment
process.env.NODE_ENV = 'production'

const FS = require('fs')
const Net = require('net')

const Misc = require('./Handler/Misc')
const Config = require('./Config/Core')
const Socket = require('./Handler/Socket')

const Server = Net.createServer()

Server.on('connection', function(Client2)
{
    const Client = new Socket(Client2)

    Client.on('SendMessage', function(Data, CallBack)
    {
        CallBack('CallBack')
    })

    Client.on('SendData', function(ReadStream, Data, CallBack)
    {
        var WriteStream = FS.createWriteStream(Data.name)
        ReadStream.pipe(WriteStream)

        WriteStream.on('finish', function()
        {
            CallBack('CallBack')
        })
    })
})

Server.on('error', function(Error)
{
    Misc.Analyze('ServerOnError', { Error: Error })
})

Server.on('close', function()
{
    Misc.Analyze('ServerOnClose', { })
})

Server.listen(Config.SERVER_PORT, '0.0.0.0', function()
{
    Misc.Analyze('ServerOnListen', { })
})
