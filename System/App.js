'use strict'

// Set Production Environment
process.env.NODE_ENV = 'production'

const Server = require('./Library/Server')

const Misc = require('./Handler/Misc')
const Config = require('./Config/Core')

const App = new Server()

App.on('connection', function(Client)
{
    Client.on('simple', function(Data)
    {
        console.log(Data)

        // console.log(require('util').inspect(Client, false, null))
    })

    Client.on('simplecallback', function(username, CallBack)
    {
        CallBack(username === 'alejandro')
    })

    Client.on('stream', function(readStream, info, CallBack)
    {
        var writeStream = require('fs').createWriteStream(info.name)
        readStream.pipe(writeStream)

        writeStream.on('finish', function()
        {
            CallBack('Image "' + info.name + '" stored!')
        })
    })
})

App.on('error', function(Error)
{
    Misc.Analyze('ServerOnError', { Error: Error })
})

App.on('close', function()
{
    Misc.Analyze('ServerOnClose', { })
})

App.listen(Config.SERVER_PORT, '0.0.0.0', function()
{
    Misc.Analyze('ServerOnListen', { })
})

/*
*
*
*/

const Socket = require('fast-tcp').Socket
const socket = new Socket({ host: 'localhost', port: Config.SERVER_PORT })

socket.emit('simple', 'simple emit work')

socket.emit('simplecallback', 'alejandro', function(response)
{
    console.log('simplecallback: ' + response)
})

var writeStream = socket.stream('stream', { name: 'img-copy.jpg' }, function(response)
{
    console.log('stream works: ' + response)
})

require('fs').createReadStream('./System/img.jpg').pipe(writeStream)
