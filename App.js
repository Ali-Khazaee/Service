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
    async function(Error, DataBase)
    {
        if (Error)
        {
            Misc.Analyze('OnDBConnectWarning', { Error: Error })
            return
        }

        Misc.Analyze('OnDBConnect', { })

        global.DB = DataBase.db(DataBaseConfig.DataBase)
        global.MongoID = MongoDB.ObjectID

        if (true)
        {
            const Key = 'eyJPd25lciI6IlFRIiwiQ13JlYXRlVGltZSI6MTUyNzk1NTMyMn0=.TI4CiQZ6G0rx2HDM9fKi3ANj7JYs8bwYXbexQhg/gIgBm4zTWNfAxU0Uay5bo9ZkdL7vssER1RZXCtICF67BglYb+5iF6mzSWI4NwcmUgQXl1s4m0CTYgzeDTpRXEg3cHpAeaufkfdsiZf2uHRIzRcmkNLvTSXNsl7t5zKg+BhPk7eEh7DzBhMUvkLkLxm3XTPMjp1+g8iq+Pb+O66/Dkmktq8ygLSt653TgpyilDE5NXSDoLO9fobsX6bn/rYBPi8I3XgHcYZ6Qpe1YrG4jo8d3eTmGyOZNJzDeT3AhFsuifp4Y7Spd4hJ/4W7wf78ac454fEih09CSK2hteEXL4w=='

            const QQ = await Auth.Delete(Key)

            console.log(QQ)

            /*
            const Verify = Auth.Verify(Owner)

            console.log(Verify)

            const Update = Auth.Update(Owner, 'IP')

            console.log(Update)

            const Delete = Auth.Delete(Owner)

            console.log(Delete)
            */
            return
        }

        IO.on('connection', function(Socket)
        {
            Misc.Analyze('OnConnect', { IP: Socket.request.connection.remoteAddress })

            Socket.on('auth', function(Data, CallBack)
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

            /**
             * @api
             * SendMessage - API Sending Message
             *
             * @param
             * {stream} Stream - The stream from client
             *
             * {JSON} Data - The data is a valid JSON
             * {
             *     {MongoID} To - The Reciever
             *     {int} MessageType - The message type
             *     {
             *         TEXT: 0,
             *         VIDEO: 1,
             *         IMAGE: 2,
             *         GIF: 3,
             *         FILE: 4,
             *         VOTE: 5,
             *         STICKER: 6,
             *         VOICE: 7
             *     }
             *     {string} Message - The message
             *     {
             *         it must be lower than 4096 characters,
             *         if type is != 0 then it can be empty
             *     }
             * }
             *
             * {function} CallBack - Return the result to the client
             *
             * @return {string} Result - The result is JSON
             * {
             *     0: Success
             *     1: Fail - Data is invalid JSON
             *     2: Fail - Data is wrong
             *     3: Fail - Message is empty
             *     4: Fail - To doesn't exist
             *     5: Fail - Upload failed
             * }
             *
             */
            IOStream(Socket).on('SendMessage', async function(Stream, Data, CallBack)
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

                if (Message.Type === 0 && (Misc.IsUndefined(Message.Message)))
                {
                    CallBack('{ "Result": 3 }')
                    return
                }

                /*
                Remove This When Authtication is Complete
                Query e Limit + Projection Hatman Baresi She Resultesh DOroste Ya Na
                const Post = await global.DB.collection('account').aggregate([ { $match: { _id: global.MongoID(Message.To) }, $limit: 1 }, { $project: { Owner: 1 } } ]).toArray()

                if (!Misc.IsUndefined(Post[0]))
                {
                    CallBack('{ "Result": 4 }')
                    return
                }
                */

                let Result

                switch (Message.Type)
                {
                case Type.Message.TEXT:
                    if (!Misc.IsUndefined(Message.Message) && Message.Message.length > 4096)
                        Message.Message = Message.Message.substring(0, 4096)

                    Result.Result = 0
                    break
                default:
                    if (!Misc.IsUndefined(Message.Message) && Message.Message.length > 512)
                        Message.Message = Message.Message.substring(0, 512)

                    const ServerID = await Upload.BestServerID()
                    const ServerURL = Upload.ServerURL(ServerID)
                    const ServerPassword = Upload.ServerToken(ServerID)
                    const FileName = Config.TEMP + UniqueName()
                    const FileWrite = FileSystem.createWriteStream(FileName)

                    let UploadResult = await Misc.SyncPipe(Stream, FileWrite)

                    if (Misc.IsUndefined(UploadResult.Result) || UploadResult.Result !== 0)
                    {
                        CallBack('{ "Result": 5 }')
                        return
                    }

                    const FileRead = FileSystem.createReadStream(FileName)

                    if (Message.Type === Type.Message.FILE)
                        UploadResult = await Upload.UploadFile(ServerURL, ServerPassword, FileRead)
                    else if (Message.Type === Type.Message.VIDEO)
                        UploadResult = await Upload.UploadVideo(ServerURL, ServerPassword, FileRead)
                    else if (Message.Type === Type.Message.IMAGE)
                        UploadResult = await Upload.UploadImage(ServerURL, ServerPassword, FileRead)
                    else if (Message.Type === Type.Message.VOICE)
                        UploadResult = await Upload.UploadVoice(ServerURL, ServerPassword, FileRead)

                    FileSystem.unlink(FileName)

                    if (Misc.IsUndefined(UploadResult.Result) || UploadResult.Result !== 0)
                    {
                        CallBack('{ "Result": 6 }')
                        return
                    }

                    Result.ServerID = ServerID
                    Result.URL = UploadResult.Path
                    Result.Result = UploadResult.Result
                }

                if (Misc.IsUndefined(Result.Result) || Result.Result !== 0)
                {
                    CallBack('{ "Result": 7 }')
                    return
                }

                global.DB.collection('message').insertOne({ From: global.MongoID(Socket.AID), To: global.MongoID(Message.To), Message: Message.Message, Type: Message.Type, Server: Result.ServerID, URL: Result.URL, Time: Misc.Time() })

                // @TODO Send to Curent user age online hast

                CallBack('{ "Result": 0 }')
                Misc.Analyze('SendMessage', { From: global.MongoID(Socket.AID), To: global.MongoID(Message.To) })
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

        Server.listen(Config.PORT, '0.0.0.0', function()
        {
            Misc.Analyze('OnStart', { })
        })
    })
