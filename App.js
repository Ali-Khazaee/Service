'use strict'

const Fs = require('fs')
const Express = require('express')()
const HTTP = require('http')
const Server = HTTP.createServer(Express)
const IO = require('socket.io')(Server)
const IOStream = require('socket.io-stream')
const MongoDB = require('mongodb')

const Misc = require('./System/Handler/Misc')
const Type = require('./System/Handler/Type')
const Config = require('./System/Config/Core')
const DataBaseConfig = require('./System/Config/DataBase')

MongoDB.MongoClient.connect('mongodb://' + DataBaseConfig.USERNAME + ':' + DataBaseConfig.PASSWORD + '@' + DataBaseConfig.HOST + ':' + DataBaseConfig.PORT + '/' + DataBaseConfig.DATABASE,
    {
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 2000
    },
    function(Error, DataBase)
    {
        if (Error)
        {
            Misc.Log('[DB]: ' + Error)
            return
        }

        Misc.Analyze('OnDBConnect', { })

        global.DB = DataBase.db(DataBaseConfig.DataBase)
        global.MongoID = MongoDB.ObjectID

        IO.on('connection', function(Socket)
        {
            Misc.Analyze('OnConnect', { IP: Socket.request.connection.remoteAddress })

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

                switch (Message.Type)
                {
                case Type.Message.VIDEO:
                case Type.Message.GIF:
                case Type.Message.IMAGE:
                case Type.Message.FILE:
                case Type.Message.TEXT:
                    if (Message.Message.length > 512)
                        Message.Message = Message.Message.substring(0, 512)
                    break
                default:
                    if (Message.Message.length > 4096)
                        Message.Message = Message.Message.substring(0, 4096)
                }

                // Stream.pipe(Fs.createWriteStream('ali.png'))

                CallBack('{ "Result": 0 }')
                Misc.Analyze('SendMessage', { })
            })

            Socket.on('error', function(Error)
            {
                Misc.Log('[IO]: ' + Error)
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
const App = require('express')()
const HTTP = require('http').Server(App)
const BodyParser = require('body-parser')
const MongoDB = require('mongodb')
const CoreConfig = require('./System/Config/Core')
const DataBaseConfig = require('./System/Config/DataBase')
const Misc = require('./System/Handler/Misc')

MongoDB.MongoClient.connect('mongodb://' + DataBaseConfig.USERNAME + ':' + DataBaseConfig.PASSWORD + '@' + DataBaseConfig.HOST + ':' + DataBaseConfig.PORT + '/' + DataBaseConfig.DATABASE,
  {
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 2000
  },
  function (error, database) {
    if (error) {
      Misc.Log('[DB]: ' + error)
      process.exit(1)
    }

    console.log('MongoDB Connected')

    global.DB = database.db('BioGram2')

    global.MongoID = MongoDB.ObjectID

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
