'use strict'

process.env.SERVER_ID = 1
process.env.NODE_ENV = 'production'

const Net = require('net')
const HTTP = require('http')
const MongoDB = require('mongodb')

const Config = require('./Config/Core')
const DBConfig = require('./Config/DataBase')
const Misc = require('./Handler/MiscHandler')
const Socket = require('./Handler/SocketHandler')

process.on('uncaughtException', (Error) => Misc.Analyze('AppUncaughtException', { Error: Error }))
process.on('unhandledRejection', (Error) => Misc.Analyze('AppUnhandledRejection', { Error: Error }))

MongoDB.MongoClient.connect(`mongodb://${DBConfig.USERNAME}:${DBConfig.PASSWORD}@${DBConfig.HOST}:${DBConfig.PORT}/${DBConfig.DATABASE}`,
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
        global.DB = DataBase.db(DBConfig.DataBase)

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

        HTTP.createServer((Request, Response) =>
        {
            // FixMe
            Response.end()
        })

        HTTP.listen(Config.HTTP_PORT, (Error) =>
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
