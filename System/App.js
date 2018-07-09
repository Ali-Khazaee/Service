'use strict'

// Environment
process.env.NODE_ENV = 'production'

const FS = require('fs')
const Net = require('net')
const MongoDB = require('mongodb')
const UniqueName = require('uuid/v4')

const Misc = require('./Handler/Misc')
const Auth = require('./Handler/Auth')
const Config = require('./Config/Core')
const Socket = require('./Handler/Socket')
const DBConfig = require('./Config/DataBase')
const UploadHandler = require('./Handler/UploadHandler')
const ClientManager = require('./Handler/ClientManager')
const MessageType = require('./Handler/TypeList').Message

process.on('uncaughtException', function(Error)
{
    Misc.Analyze('OnException', { Error: Error }, 'error')
})

MongoDB.MongoClient.connect('mongodb://' + DBConfig.USERNAME + ':' + DBConfig.PASSWORD + '@' + DBConfig.HOST + ':' + DBConfig.PORT + '/' + DBConfig.DATABASE,
    {
        reconnectTries: Number.MAX_VALUE,
        reconnectInterval: 2000,
        useNewUrlParser: true
    },
    function(Error, DataBase)
    {
        if (Error)
        {
            Misc.Analyze('OnDBConnect', { Error: Error }, 'error')
            return
        }

        Misc.Analyze('OnDBConnect', { })

        global.MongoID = MongoDB.ObjectID
        global.DB = DataBase.db(DBConfig.DataBase)

        const Server = Net.createServer()

        Server.on('connection', function(Client2)
        {
            Misc.Analyze('OnClientConnect', { IP: Client2.remoteAddress })

            const Client = new Socket(Client2)

            Client.on('disconnect', function(Client)
            {
                Misc.Analyze('OnClientDisconnect', { IP: Client2.remoteAddress })
                ClientManager.Remove(Client)
            })

            Client.on('SignIn', function(Data, CallBack)
            {
                if (Misc.IsInvalidJSON(Data))
                {
                    CallBack({ Result: 1 })
                    return
                }

                if (Misc.IsUndefined(Data.Username))
                {
                    CallBack({ Result: 2 })
                    return
                }

                global.DB.collection('account').findOne({ Username: Data.Username }, async function(Error, Document)
                {
                    if (Error)
                    {
                        Misc.Analyze('OnDBQuery', { Tag: 'SignIn', Error: Error }, 'error')
                        CallBack({ Result: -1 })
                        return
                    }

                    if (Misc.IsDefined(Document))
                    {
                        CallBack({ Result: 3 })
                        return
                    }

                    const Register = await global.DB.collection('account').insertOne({ Username: Data.Username })
                    const AuthResult = await Auth.Create(Register.insertedId)

                    if (AuthResult.Result !== 0)
                    {
                        await global.DB.collection('account').deleteOne({ Username: Data.Username })
                        CallBack({ Result: 4 })
                        return
                    }

                    Client.__Owner = Register.insertedId

                    ClientManager.Add(Client)

                    CallBack({ Result: 0, ID: Register.insertedId, Key: AuthResult.Key })

                    Misc.Analyze('OnSignIn', { })
                })
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
                    CallBack({ Result: 2, Code: AuthResult.Result })
                    return
                }

                Client.__Owner = AuthResult.Owner

                ClientManager.Add(Client)

                CallBack({ Result: 0 })

                Misc.Analyze('OnAuthentication', { })
            })

            Client.on('SendMessage', function(Data, CallBack)
            {
                if (Misc.IsInvalidJSON(Data))
                {
                    CallBack({ Result: 1 })
                    return
                }

                if (Misc.IsUndefined(Data.To) || Misc.IsUndefined(Data.Message))
                {
                    CallBack({ Result: 2 })
                    return
                }

                global.DB.collection('account').aggregate([ { $match: { _id: global.MongoID(Data.To) } }, { $limit: 1 }, { $project: { _id: 0, Owner: 1 } } ]).toArray(async function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('OnDBQuery', { Tag: 'SendMessage', Error: Error }, 'error')
                        CallBack({ Result: -1 })
                        return
                    }

                    if (Misc.IsUndefined(Result[0]))
                    {
                        CallBack({ Result: 3 })
                        return
                    }

                    if (Data.Message.length > 4096)
                        Data.Message = Data.Message.substring(0, 4096)

                    const Time = Misc.Time()
                    const Message = { From: global.MongoID(Client.__Owner), To: global.MongoID(Data.To), Message: Data.Message, Type: MessageType.TEXT, Time: Time }

                    if (Misc.IsDefined(Data.ReplyID))
                        Message.Reply = Data.ReplyID

                    global.DB.collection('message').insertOne(Message)

                    const To = ClientManager.Find(Message.To)

                    if (Misc.IsDefined(To))
                        To.emit(Message)

                    CallBack({ Result: 0 })

                    Misc.Analyze('SendMessage', { })
                })
            })
        })

        Server.on('error', function(Error)
        {
            Misc.Analyze('OnServer', { Error: Error }, 'error')
        })

        Server.on('close', function()
        {
            Misc.Analyze('OnServerClose', { }, 'error')
        })

        Server.listen(Config.SERVER_PORT, '0.0.0.0', function()
        {
            Misc.Analyze('OnServerListen', { Port: Config.SERVER_PORT })
        })
    })

var os = require('os')
var ifaces = os.networkInterfaces()

Object.keys(ifaces).forEach(function(ifname)
{
    var alias = 0

    ifaces[ifname].forEach(function(iface)
    {
        if (iface.family !== 'IPv4' || iface.internal !== false)
            return

        if (alias >= 1)
            Misc.Analyze('OnIP1', { Name: ifname, Alias: alias, Address: iface.address })
        else
            Misc.Analyze('OnIP2', { Name: ifname, Address: iface.address })

        ++alias
    })
})

/*
    Result List:
    -1 : DataBase Warning
*/

/*
            Client.on('SendData', function(ReadStream, Data, CallBack)
            {
                var WriteStream = FS.createWriteStream(Data.name)
                ReadStream.pipe(WriteStream)

                WriteStream.on('finish', function()
                {
                    CallBack('CallBack')
                })
            })

            Client.on('SendMessage', function(Data, CallBack)
            {
                if (Misc.IsInvalidJSON(Data))
                {
                    CallBack({ Result: 1 })
                    return
                }

                if (Misc.IsUndefined(Data.To) || Misc.IsUndefined(Data.Type))
                {
                    CallBack({ Result: 2 })
                    return
                }

                if (Data.Type === Type.Message.TEXT && Misc.IsUndefined(Data.Message))
                {
                    CallBack({ Result: 3 })
                    return
                }

                global.DB.collection('account').aggregate([ { $match: { _id: global.MongoID(Data.To) } }, { $limit: 1 }, { $project: { _id: 0, Owner: 1 } } ]).toArray(async function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('OnSendMessageDBWarning', { Error: Error })
                        CallBack({ Result: -1 })
                        return
                    }

                    if (Misc.IsUndefined(Result[0]))
                    {
                        CallBack({ Result: 4 })
                        return
                    }

                    if (Data.Type === Type.Message.TEXT && Data.Message.length > 4096)
                        Data.Message = Data.Message.substring(0, 4096)
                    else if (Misc.IsDefined(Data.Message) && Data.Message.length > 512)
                        Data.Message = Data.Message.substring(0, 512)

                    const Time = Misc.Time()
                    const Message = { From: global.MongoID(Client.__Owner), To: global.MongoID(Data.To), Message: Data.Message, Type: Data.Type, Time: Time }

                    if (Misc.IsDefined(Data.ReplyID))
                        Message.Reply = Data.ReplyID

                    if (Misc.IsDefined(Data.Data) && (Data.Type === Type.Message.IMAGE || Data.Type === Type.Message.FILE || Data.Type === Type.Message.VIDEO || Data.Type === Type.Message.VOICE))
                    {
                        let UploadResult
                        const FileName = Config.APP_STORAGE_TEMP + UniqueName()

                        try
                        {
                            FileSystem.writeFileSync(FileName, Data.Data)
                        }
                        catch (Error2)
                        {
                            Misc.Analyze('OnSendMessageWarning', { Error: Error2 })
                            CallBack({ Result: 5 })
                            return
                        }

                        if (Data.Type === Type.Message.FILE)
                            UploadResult = await Upload.UploadFile(FileName)
                        else if (Data.Type === Type.Message.VIDEO)
                            UploadResult = await Upload.UploadVideo(FileName)
                        else if (Data.Type === Type.Message.IMAGE)
                            UploadResult = await Upload.UploadImage(FileName)
                        else if (Data.Type === Type.Message.VOICE)
                            UploadResult = await Upload.UploadVoice(FileName)

                        FileSystem.unlink(FileName)

                        if (UploadResult.Result !== 0)
                        {
                            CallBack({ Result: 5 })
                            return
                        }

                        Message.URL = UploadResult.Path
                        Message.Server = UploadResult.ID
                    }

                    global.DB.collection('message').insertOne(Message)

                    const To = ClientManager.Find(Message.To)

                    if (Misc.IsDefined(To))
                        To.emit({ From: Client.__Owner, Message: Data.Message, Type: Data.Type, Time: Time })

                    Misc.Analyze('SendMessage', { })

                    CallBack({ Result: 0 })
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
        })
        */
