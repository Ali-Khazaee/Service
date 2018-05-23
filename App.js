'use strict'

const Express = require('express')()
const HTTP = require('http')
const Server = HTTP.createServer(Express)
const IO = require('socket.io')(Server)
const Misc = require('./System/Handler/Misc')
const Config = require('./System/Config/Core')

IO.on('connection', function(Socket)
{
    Misc.Analyze('OnConnect', { IP: Socket.request.connection.remoteAddress })

    Socket.on('SendMessage', function (Data, CallBack)
    {
        if (Misc.IsValidJSON(Data))
        {
            CallBack('{ Result: 1 }')
            return
        }

        let Message = JSON.parse(Data)

        if (Misc.IsUndefined(Message.To) || Misc.IsUndefined(Message.Message))
        {
            CallBack('{ Result: 2 }')
            return
        }

        if (Message.Message.length > 4096)
            Message.Message = Message.Message.substring(0, 4096)

        CallBack('{ Result: 0 }')
    })

    Socket.on('disconnect', function()
    {
        Misc.Analyze('OnDisconnect', { IP: Socket.request.connection.remoteAddress })
    })
})

Server.listen(Config.PORT, '0.0.0.0', function()
{
    Misc.Analyze('OnStart', { })
})



