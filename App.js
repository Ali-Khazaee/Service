// Set Strict
'use strict'

// Set Production Environment
process.env.NODE_ENV = 'production'

//
// Libraries
//

const Fs = require('fs')
const Express = require('express')()
const HTTP = require('http')
const Server = HTTP.createServer(Express)
const IO = require('socket.io')(Server)
const IOStream = require('socket.io-stream')
const MongoDB = require('mongodb')
const UniqueName = require('uuid/v4')

const Misc = require('./System/Handler/Misc')
const Type = require('./System/Handler/Type')
const Upload = require('./System/Handler/Upload')
const Config = require('./System/Config/Core')
const DataBaseConfig = require('./System/Config/DataBase')

// Connect To DataBase
MongoDB.MongoClient.connect('mongodb://' + DataBaseConfig.USERNAME + ':' + DataBaseConfig.PASSWORD + '@' + DataBaseConfig.HOST + ':' + DataBaseConfig.PORT + '/' + DataBaseConfig.DATABASE,
    {
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 2000,
        useNewUrlParser: true
    },
    function(Error, DataBase)
    {
        if (Error)
        {
            Misc.Analyze('OnDBConnectWarning', { Error: Error })
            return
        }

        Misc.Analyze('OnDBConnect', { })

        global.DB = DataBase.db(DataBaseConfig.DataBase)
        global.MongoID = MongoDB.ObjectID

        IO.on('connection', function(Socket)
        {
            Misc.Analyze('OnConnect', { IP: Socket.request.connection.remoteAddress })

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

                const Post = await global.DB.collection('account').aggregate([ { $match: { _id: global.MongoID(Message.To) } }, { $project: { Owner: 1 } } ]).toArray()

                if (!Misc.IsUndefined(Post[0]))
                {
                    CallBack('{ "Result": 4 }')
                    return
                }

                let Result

                switch (Message.Type)
                {
                case Type.Message.TEXT:
                    if (Message.Message.length > 4096)
                        Message.Message = Message.Message.substring(0, 4096)
                    break
                case Type.Message.STICKER:
                    if (Message.Message.length > 512)
                        Message.Message = Message.Message.substring(0, 512)

                    break
                default:
                    if (Message.Message.length > 512)
                        Message.Message = Message.Message.substring(0, 512)

                    const ServerID = await Upload.BestServerID()
                    const ServerURL = Upload.ServerURL(ServerID)
                    const ServerPassword = Upload.ServerToken(ServerID)

                    const File = Fs.createWriteStream(Config.TEMP + UniqueName())

                    Stream.pipe(File)

                    if (Message.Type === Type.Message.FILE)
                        Result = await Upload.UploadFile(ServerURL, ServerPassword, File)
                    else if (Message.Type === Type.Message.VIDEO)
                        Result = await Upload.UploadVideo(ServerURL, ServerPassword, File)
                    else if (Message.Type === Type.Message.IMAGE)
                        Result = await Upload.UploadImage(ServerURL, ServerPassword, File)
                    else if (Message.Type === Type.Message.VOICE)
                        Result = await Upload.UploadVoice(ServerURL, ServerPassword, File)
                }

                CallBack(JSON.stringify(Result))
                Misc.Analyze('SendMessage', { })
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

            var io = require('socket.io-client')
            var ss = require('socket.io-stream')

            var socket = io.connect('ws://127.0.0.1:5000')
            var stream = ss.createStream()
            var filename = 'screenshot.png'

            console.log('1')

            ss(socket).emit('SendMessage', stream, {name: filename}, function(Data)
            {
                console.log('Result Returned: ' + Data)
            })

            console.log('2')

            Fs.createReadStream(filename).pipe(stream)

            console.log('3')

            /*
            // send data
            ss(socket).on('file', function(stream)
            {
                Fs.createReadStream('profile.png').pipe(stream)
            })

            // receive data
            ss(socket).emit('file', stream)
            stream.pipe(Fs.createWriteStream('profile2.png'))
            */
        })
    })

/*
    App.disable('x-powered-by')

    App.use(BodyParser.json())
    App.use(BodyParser.urlencoded({ extended: true }))
    App.get('/', function (req, res) { res.send('') })

    App.use('/', require('./System/Route/Auth'))

    App.use('/', require('./System/Route/PostBookmark'))
    App.use('/', require('./System/Route/PostComment'))
    App.use('/', require('./System/Route/PostCommentDelete'))
    App.use('/', require('./System/Route/PostCommentLike'))
    App.use('/', require('./System/Route/PostCommentLikeList'))
    App.use('/', require('./System/Route/PostCommentList'))
    App.use('/', require('./System/Route/PostDelete'))
    App.use('/', require('./System/Route/PostDeleteCheck'))
    App.use('/', require('./System/Route/PostDetail'))
    App.use('/', require('./System/Route/PostEdit'))
    App.use('/', require('./System/Route/PostLike'))
    App.use('/', require('./System/Route/PostLikeList'))
    App.use('/', require('./System/Route/PostListInbox'))
    App.use('/', require('./System/Route/PostReport'))
    App.use('/', require('./System/Route/PostVote'))
    App.use('/', require('./System/Route/PostWrite'))

    App.use('/', require('./System/Route/ProfileAbout'))
    App.use('/', require('./System/Route/ProfileBlock'))
    App.use('/', require('./System/Route/ProfileFollow'))
    App.use('/', require('./System/Route/ProfileLocation'))
    App.use('/', require('./System/Route/ProfilePrivate'))
    App.use('/', require('./System/Route/ProfileURL'))

    HTTP.listen(CoreConfig.PORT, '0.0.0.0', function () {
      console.log('Running Server Port: ' + CoreConfig.PORT)
    })
  })

 -1 = DB Error
 -2 = RateLimit Exceed
 -3 = BCrypt Hash Failed
 -4 = Auth Failed
 -5 = Admin Failed
 -6 = Request Failed
 -7 = Formidable Failed
 */
