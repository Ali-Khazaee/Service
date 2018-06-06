'use strict'

// Set Production Environment
process.env.NODE_ENV = 'production'

//
// Libraries
//

const HTTP = require('http')
const FileSystem = require('fs')
const Server = HTTP.createServer()
const MongoDB = require('mongodb')
const UniqueName = require('uuid/v4')
const IO = require('socket.io')(Server)

const Auth = require('./System/Handler/Auth')
const Misc = require('./System/Handler/Misc')
const Type = require('./System/Handler/Type')
const Upload = require('./System/Handler/Upload')
const Config = require('./System/Config/Core')
const DBConfig = require('./System/Config/DataBase')
const ClientManager = require('./System/Handler/ClientManager')

// Connect To DataBase
MongoDB.MongoClient.connect('mongodb://' + DBConfig.USERNAME + ':' + DBConfig.PASSWORD + '@' + DBConfig.HOST + ':' + DBConfig.PORT + '/' + DBConfig.DATABASE,
    {
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 2000
    },
    function(Error, DataBase)
    {
        if (Error)
        {
            console.log('OnDBConnectWarning: ' + Error)
            return
        }

        Misc.Analyze('OnDBConnect', { })

        global.DB = DataBase.db(DBConfig.DataBase)
        global.MongoID = MongoDB.ObjectID

        IO.on('connection', function(Client)
        {
            Misc.Analyze('OnConnect', { IP: Client.request.connection.remoteAddress })

            Client.use(function(Packet, Next)
            {
                // if (Packet[0] === 'Authentication' || Misc.IsDefined(Client.__Owner))
                Next()
            })

            Client.on('Authentication', async function(Data, CallBack)
            {
                if (Misc.IsDefined(Client.__Owner))
                {
                    CallBack({ Result: 1 })
                    return
                }

                const AuthResult = await Auth.Verify(Data)

                if (AuthResult.Result !== 0)
                {
                    CallBack({ Result: 2 })
                    return
                }

                Client.__Owner = AuthResult.Owner

                ClientManager.Add(Client)

                CallBack({ Result: 0 })
            })

            Client.on('SendMessage', function(Data, CallBack)
            {
                // Client.emit('SendMessage', { 3: '4', 5: Buffer.alloc(610) })

                console.log(Data)

                CallBack({ ALI: 123 })
            })

            Client.on('SendMessage2', function(Data, CallBack)
            {
                if (Misc.IsInvalidJSON(Data))
                {
                    CallBack('{ "Result": 1 }')
                    return
                }

                const Message = JSON.parse(Data)

                if (Misc.IsUndefined(Message.To) || Misc.IsUndefined(Message.Message))
                {
                    CallBack('{ "Result": 2 }')
                    return
                }

                global.DB.collection('account').aggregate([ { $match: { _id: global.MongoID(Message.To) } }, { $limit: 1 }, { $project: { _id: 0, Owner: 1 } } ]).toArray(function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('OnSendMessageDBWarning', { Error: Error })
                        CallBack('{ "Result": -1 }')
                        return
                    }

                    if (Misc.IsUndefined(Result[0]))
                    {
                        CallBack('{ "Result": 3 }')
                        return
                    }

                    if (Message.Message.length > 4096)
                        Message.Message = Message.Message.substring(0, 4096)

                    const Time = Misc.Time()
                    const Data = { From: global.MongoID(Client.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Time: Time }

                    if (!Misc.IsUndefined(Message.ReplyID))
                        Data.Reply = Message.ReplyID

                    global.DB.collection('message').insertOne(Data)

                    const To = ClientManager.Find(Message.To)

                    if (!Misc.IsUndefined(To))
                        To.emit({ From: Client.__Owner, Message: Message.Message, Time: Time })

                    Misc.Analyze('SendMessage', { })

                    CallBack('{ "Result": 0 }')
                })
            })

            Client.on('SendData2', async function(Stream, Data, CallBack)
            {
                if (Misc.IsValidJSON(Data))
                {
                    CallBack('{ "Result": 1 }')
                    return
                }

                let Message = JSON.parse(Data)

                if (Misc.IsUndefined(Message.To) || Misc.IsUndefined(Message.Type))
                {
                    CallBack('{ "Result": 2 }')
                    return
                }

                global.DB.collection('account').aggregate([ { $match: { _id: global.MongoID(Message.To) } }, { $limit: 1 }, { $project: { _id: 0, Owner: 1 } } ]).toArray(async function(Error, QueryResult)
                {
                    if (Error)
                    {
                        Misc.Analyze('OnSendDataDBWarning', { Error: Error })
                        CallBack('{ "Result": -1 }')
                        return
                    }

                    if (Misc.IsUndefined(QueryResult[0]))
                    {
                        CallBack('{ "Result": 3 }')
                        return
                    }

                    const FileName = Config.APP_STORAGE_TEMP + UniqueName()
                    const FileWrite = FileSystem.createWriteStream(FileName)

                    let PipeResult = await Misc.Pipe(Stream, FileWrite)

                    if (PipeResult.Result !== 0)
                    {
                        CallBack('{ "Result": 4 }')
                        return
                    }

                    let UploadResult
                    const FileRead = FileSystem.createReadStream(FileName)

                    if (Message.Type === Type.Message.FILE)
                        UploadResult = await Upload.UploadFile(FileRead)
                    else if (Message.Type === Type.Message.VIDEO)
                        UploadResult = await Upload.UploadVideo(FileRead)
                    else if (Message.Type === Type.Message.IMAGE)
                        UploadResult = await Upload.UploadImage(FileRead)
                    else if (Message.Type === Type.Message.VOICE)
                        UploadResult = await Upload.UploadVoice(FileRead)

                    FileSystem.unlink(FileName)

                    if (UploadResult.Result !== 0)
                    {
                        CallBack('{ "Result": 5 }')
                        return
                    }

                    if (!Misc.IsUndefined(Message.Message) && Message.Message.length > 512)
                        Message.Message = Message.Message.substring(0, 512)

                    const Time = Misc.Time()
                    const Data = { From: global.MongoID(Client.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Type: Message.Type, Time: Time }

                    if (!Misc.IsUndefined(Message.ReplyID))
                        Data.Reply = Message.ReplyID

                    Data.Server = UploadResult.ID
                    Data.URL = UploadResult.URL

                    global.DB.collection('message').insertOne(Data)

                    const To = ClientManager.Find(Message.To)

                    if (!Misc.IsUndefined(To))
                        To.emit({ From: Client.__Owner, Message: Message.Message, Time: Time })

                    Misc.Analyze('SendData', { })

                    CallBack('{ "Result": 0 }')
                })
            })

            Client.on('error', function(Error)
            {
                Misc.Analyze('OnError', { Error: Error })
            })

            Client.on('disconnect', function()
            {
                Misc.Analyze('OnDisconnect', { IP: Client.request.connection.remoteAddress })
                ClientManager.Remove(Client)
            })
        })

        Server.listen(Config.APP_PORT, '0.0.0.0', function()
        {
            Misc.Analyze('OnStart', { })
        })
    })

/*
    Result List:
    -1 : DataBase Warning
*/
