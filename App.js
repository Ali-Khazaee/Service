// Set Strict
'use strict'

// Set Production Environment
process.env.NODE_ENV = 'production'

//
// Libraries
//

const FileSystem = require('fs')
const Express = require('express')()
const HTTP = require('http')
const Server = HTTP.createServer(Express)
const IO = require('socket.io')(Server)
const IOStream = require('socket.io-stream')
const MongoDB = require('mongodb')
const UniqueName = require('uuid/v4')

const Auth = require('./System/Handler/Auth')
const Misc = require('./System/Handler/Misc')
const Type = require('./System/Handler/Type')
const Upload = require('./System/Handler/Upload')
const Config = require('./System/Config/Core')
const DataBaseConfig = require('./System/Config/DataBase')

// Connect To DataBase
MongoDB.MongoClient.connect('mongodb://' + DataBaseConfig.USERNAME + ':' + DataBaseConfig.PASSWORD + '@' + DataBaseConfig.HOST + ':' + DataBaseConfig.PORT + '/' + DataBaseConfig.DATABASE,
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

        global.DB = DataBase.db(DataBaseConfig.DataBase)
        global.MongoID = MongoDB.ObjectID

        IO.on('connection', function(Socket)
        {
            Misc.Analyze('OnConnect', { IP: Socket.request.connection.remoteAddress })

            Socket.on('Authentication', function(Data, CallBack)
            {
                if (!Misc.IsUndefined(Socket.__Owner))
                {
                    CallBack('{ "Result": 1 }')
                    return
                }

                const AuthResult = Auth.Verify(Data)

                if (AuthResult.Result !== 0)
                {
                    CallBack('{ "Result": 2 }')
                    return
                }

                Socket.__Owner = AuthResult.Owner
                CallBack('{ "Result": 0 }')
            })

            Socket.on('SendMessage', function(Data, CallBack)
            {
                if (Misc.IsValidJSON(Data))
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

                    const Data = { From: global.MongoID(Socket.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Time: Misc.Time() }

                    if (!Misc.IsUndefined(Message.ReplyID))
                        Data.Reply = Message.ReplyID

                    global.DB.collection('message').insertOne(Data)

                    Misc.Analyze('SendMessage', { })

                    CallBack('{ "Result": 0 }')
                })
            })

            IOStream(Socket).on('SendData', async function(Stream, Data, CallBack)
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
                        Misc.Analyze('OnSendMessageDBWarning', { Error: Error })
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

                    const Data = { From: global.MongoID(Socket.__Owner), To: global.MongoID(Message.To), Message: Message.Message, Type: Message.Type, Time: Misc.Time() }

                    if (!Misc.IsUndefined(Message.ReplyID))
                        Data.Reply = Message.ReplyID

                    Data.Server = UploadResult.ID
                    Data.URL = UploadResult.URL

                    global.DB.collection('message').insertOne(Data)

                    Misc.Analyze('SendData', { })

                    CallBack('{ "Result": 0 }')
                })
            })

            Socket.on('error', function(Error)
            {
                Misc.Analyze('OnError', { Error: Error })
            })

            Socket.on('disconnect', function()
            {
                Misc.Analyze('OnDisconnect', { IP: Socket.request.connection.remoteAddress })
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
