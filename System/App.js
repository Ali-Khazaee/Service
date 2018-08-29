'use strict'

require('dotenv').config()

const Net = require('net')
const HTTP = require('http')
const MongoDB = require('mongodb')

global.Config =
{
    SERVER_STORAGE: './Storage/',
    SERVER_STORAGE_TEMP: './Storage/Temp/',

    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}

const Misc = require('./Handler/MiscHandler')
const Socket = require('./Handler/SocketHandler')

process.on('uncaughtException', (Error) => Misc.Analyze('AppUncaughtException', { Error: Error }))
process.on('unhandledRejection', (Error) => Misc.Analyze('AppUnhandledRejection', { Error: Error }))

MongoDB.MongoClient.connect(`mongodb://${process.env.DATABASE_USERNAME}:${Config.DataBase.PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
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

    Server.listen(process.env.SERVER_PORT, '0.0.0.0', () =>
    {
        Misc.Analyze('ServerListen')
    })

    const ServerHTTP = HTTP.createServer((Request, Response) =>
    {
        // FixMe
        Response.end()
    })

    ServerHTTP.listen(process.env.HTTP_PORT, (Error) =>
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
    -4 : RateLimit Exceed
*/
