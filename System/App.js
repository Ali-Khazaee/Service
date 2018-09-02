'use strict'

require('dotenv').config()

global.Config =
{
    SERVER_STORAGE: './Storage/',
    SERVER_STORAGE_TEMP: './Storage/Temp/',

    PATTERN_EMAIL: /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-z\-0-9]+\.)+[a-z]{2,}))$/,
    PATTERN_USERNAME: /^(?![^a-z])(?!.*([_.])\1)[\w.]*[a-z]$/,
    PATTERN_IR_PHONE: /^\+989\d{9}$/
}

const Net = require('net')
const HTTP2 = require('http2')
const FileSystem = require('fs')
const MongoDB = require('mongodb')

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
    // Server TCP
    //

    const ServerTCP = Net.createServer()

    ServerTCP.on('connection', (Sock) =>
    {
        const Client = new Socket(Sock)

        Misc.Analyze('ClientConnected', { IP: Client._Address })

        require('./Route/General')(Client)
        require('./Route/Authentication')(Client)
        require('./Route/Messenger')(Client)
    })

    ServerTCP.on('close', () => Misc.Analyze('ServerTCPClose'))

    ServerTCP.on('error', (Error) => Misc.Analyze('ServerTCPError', { Error: Error }))

    ServerTCP.listen(process.env.SERVER_PORT, '0.0.0.0', () => Misc.Analyze('ServerTCPListen'))

    //
    // Server HTTP2
    //

    const ServerHTTP2 = HTTP2.createSecureServer({ key: FileSystem.readFileSync('./Storage/HttpPrivateKey.pem'), cert: FileSystem.readFileSync('./Storage/HttpPublicKey.pem') })

    ServerHTTP2.on('error', (Error) => Misc.Analyze('HTTP2Error', { Error: Error }))

    ServerHTTP2.on('stream', (Client, Header) =>
    {
        if (Header['key'] !== '123')
        {
            Client.end('Wrong Key')
            return
        }

        let Data = ''

        Client.on('data', (BufferMessage) =>
        {
            console.log('Data Called')
            Data += BufferMessage
        })

        Client.on('end', () =>
        {
            console.log('End Called')

            let Result = ''

            switch (Header[HTTP2.constants.HTTP2_HEADER_PATH])
            {
                case '/':
                    Result = 'Default Path'
                    break
            }

            Client.end(Result)
        })
    })

    ServerHTTP2.listen(process.env.HTTP2_PORT, '0.0.0.0', (Error) =>
    {
        if (Error)
        {
            Misc.Analyze('HTTP2Error', { Error: Error })
            return
        }

        Misc.Analyze('HTTP2Listen')

        const Client = HTTP2.connect('https://localhost:37001', { ca: FileSystem.readFileSync('./Storage/HttpPublicKey.pem') })

        Client.on('error', (err) => console.error(err))

        const BufferMessage = Buffer.from(JSON.stringify('{ "Ali": 1010 }'))

        const Request = Client.request({ ':method': 'POST', ':path': '/', 'Key': '123', 'Length': BufferMessage.length })

        let Data = ''

        Request.on('data', (chunk) =>
        {
            Data += chunk
        })

        Request.on('end', () =>
        {
            console.log(`Client Request Respone: ${Data}`)
            Client.close()
        })

        Request.setEncoding('utf8')
        Request.write(BufferMessage)
        Request.end()
    })
})

/*
    Internal Result List:
    -1 : DataBase Warning
    -2 : Request Warning
    -3 : Authentication Warning
    -4 : RateLimit Exceed
*/
