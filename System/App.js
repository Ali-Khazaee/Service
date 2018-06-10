'use strict'

// Environment
process.env.NODE_ENV = 'production'

const Net = require('net')

const Misc = require('./Handler/Misc')
const Config = require('./Config/Core')
const Socket = require('./Handler/Socket')

const Server = Net.createServer()

Server.on('connection', function(Client2)
{
    const Client = new Socket(Client2)

    Client.on('emit', function(Data)
    {
        console.log('Server Emit: ' + Data)
    })

    Client.on('emit2', function(Data, CallBack)
    {
        console.log('Server Emit2 Ack: ' + Data)
        CallBack('Server Result Emit2')
    })

    Client.on('stream', function(readStream, Data, CallBack)
    {
        console.log('Server Stream With Ack: ' + Data)

        var writeStream = require('fs').createWriteStream(Data.name)
        readStream.pipe(writeStream)

        writeStream.on('finish', function()
        {
            CallBack('Server Result Stream')
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

/*
*
*
*/

const Socket2 = require('fast-tcp').Socket
const socket = new Socket2({ host: 'localhost', port: Config.SERVER_PORT })

socket.emit('emit', 'Data e Emit')

socket.emit('emit2', 'Data e Emit2', function(response)
{
    console.log('Client Emit2 Ack: ' + response)
})

var writeStream = socket.stream('stream', { name: 'img-copy.jpg' }, function(response)
{
    console.log('Client Stream Ack: ' + response)
})

require('fs').createReadStream('./System/img.jpg').pipe(writeStream)
