'use strict'

const DotEnv = require('dotenv')
const Net = require('net')
const HTTP = require('http')
const MongoDB = require('mongodb')

const Misc = require('./Handler/MiscHandler')
const Socket = require('./Handler/SocketHandler')

process.on('uncaughtException', (Error) => Misc.Analyze('AppUncaughtException', { Error: Error }))
process.on('unhandledRejection', (Error) => Misc.Analyze('AppUnhandledRejection', { Error: Error }))

DotEnv.config()
global.Config = require('./Config')

MongoDB.MongoClient.connect(`mongodb://${Config.DataBase.USERNAME}:${Config.DataBase.PASSWORD}@${Config.DataBase.HOST}:${Config.DataBase.PORT}/${Config.DataBase.NAME}`,
{
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 2500,
    useNewUrlParser: true
},
(Error, DataBase) =>
{
    if (Misc.IsDefined(Error))
    {
        Misc.Analyze('DBError', { Tag: 'Initial', Error: Error })
        return
    }

    Misc.Analyze('DBConnected')

    global.MongoID = MongoDB.ObjectID
    global.DB = DataBase.db(Config.DataBase.NAME)

    const Server = Net.createServer()

    Server.on('connection', (Sock) =>
    {
        const Client = new Socket(Sock)

        Misc.Analyze('ClientConnected', { IP: Client._Address })

        require('./Route/General')(Client)
        require('./Route/Authentication')(Client)
        require('./Route/Messenger')(Client)
    })

    Server.on('close', () =>
    {
        Misc.Analyze('ServerClose')
    })

    Server.on('error', (Error) =>
    {
        Misc.Analyze('ServerError', { Error: Error })
    })

    Server.listen(Config.SERVER_PORT, '0.0.0.0', () =>
    {
        Misc.Analyze('ServerListen')
    })

    const ServerHTTP = HTTP.createServer((Request, Response) =>
    {
        // FixMe
        Response.end()
    })

    ServerHTTP.listen(Config.HTTP_PORT, (Error) =>
    {
        if (Error)
        {
            Misc.Analyze('HTTPError', { Error: Error })
            return
        }

        Misc.Analyze('HTTPListen')
    })
})

/*
    Internal Result List:
    -1 : DataBase Warning
    -2 : Request Warning
    -3 : Authentication Warning
*/
