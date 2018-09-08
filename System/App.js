'use strict'

require('dotenv').config()

global.Config =
{
    SERVER_STORAGE: `${__dirname}/../Storage`,
    SERVER_STORAGE_TEMP: `${__dirname}/../Storage/Temp`,

    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}

const TLS = require('tls')
const FileSystem = require('fs')
const MongoDB = require('mongodb')

const Push = require('./Handler/PushHandler')
const Misc = require('./Handler/MiscHandler')
const Socket = require('./Handler/SocketHandler')

process.on('uncaughtException', (Error) => Misc.Analyze('AppUncaughtException', { Error: Error }))
process.on('unhandledRejection', (Error) => Misc.Analyze('AppUnhandledRejection', { Error: Error }))

MongoDB.MongoClient.connect(`mongodb://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
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
    global.DB = DataBase.db(process.env.DATABASE_NAME)

    //
    // Server Client
    //

    const ServerOption =
    {
        key: FileSystem.readFileSync(`${Config.SERVER_STORAGE}/ServerPrivateKey.pem`),
        cert: FileSystem.readFileSync(`${Config.SERVER_STORAGE}/ServerPublicKey.pem`),
        rejectUnauthorized: true
    }

    const ServerClient = TLS.createServer(ServerOption, (Sock) =>
    {
        const Client = new Socket(Sock)

        Misc.Analyze('ClientConnected', { IP: Client._Address })

        require('./Api/General')(Client)
        require('./Api/Authentication')(Client)
        require('./Api/Messenger')(Client)
        require('./Api/Profile')(Client)
    })

    ServerClient.on('close', () => Misc.Analyze('ServerClientClose'))

    ServerClient.on('error', (Error) => Misc.Analyze('ServerClientError', { Error: Error }))

    ServerClient.listen(process.env.CORE_CLIENT_PORT, '0.0.0.0', () => Misc.Analyze('ServerClientListen'))

    //
    // Server Push
    //

    const ServerPush = TLS.createServer(ServerOption, (Sock) =>
    {
        const Client = new Push.Socket(Sock)

        Misc.Analyze('PushConnected', { IP: Client._Address })
    })

    ServerPush.on('close', () => Misc.Analyze('ServerPushClose'))

    ServerPush.on('error', (Error) => Misc.Analyze('ServerPushError', { Error: Error }))

    ServerPush.listen(process.env.CORE_PUSH_PORT, '0.0.0.0', () => Misc.Analyze('ServerPushListen'))

    setInterval(() =>
    {
        const Mem = process.memoryUsage()

        Misc.Analyze('Performance', { RSS: Misc.Size(Mem.rss), Heap: Misc.Size(Mem.heapTotal), Used: Misc.Size(Mem.heapUsed), 'C++': Misc.Size(Mem.external) })
    }, 2000)
})

/*
    Internal Result List:
    -1 : DataBase Warning
    -2 : RateLimit Exceed
    -3 : Authentication Warning
    -4 : Invalid Message
*/
