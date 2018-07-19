'use strict'

// Environment
process.env.NODE_ENV = 'production'

// const FS = require('fs')
const Net = require('net')
const MongoDB = require('mongodb')
// const Request = require('request')
// const UniqueName = require('uuid/v4')

const Misc = require('./Handler/Misc')
const Auth = require('./Handler/Auth')
const Config = require('./Config/Core')
const Socket = require('./Handler/Socket')
const Packet = require('./Handler/Packet')
const DBConfig = require('./Config/DataBase')
// const UploadHandler = require('./Handler/UploadHandler')
const TypeList = require('./Handler/TypeList')
const Language = require('./Handler/Language')
const ClientManager = require('./Handler/ClientManager')

process.on('uncaughtException', function(Error)
{
    Misc.Analyze('UncaughtException', { Error: Error })
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
            Misc.Analyze('DBError', { Error: Error })
            return
        }

        Misc.Analyze('DBConnected')

        global.MongoID = MongoDB.ObjectID
        global.DB = DataBase.db(DBConfig.DataBase)

        const Server = Net.createServer()

        Server.on('connection', function(RealClient)
        {
            Misc.Analyze('ClientConnected', { IP: RealClient.remoteAddress })

            const Client = new Socket(RealClient)

            /**
             * @PacketID 1
             *
             * @Description DarKhast e Bar Resie Username
             *
             * @Param {string} Username
             *
             * Result: 1 >> Username == Undefined
             * Result: 2 >> Username < 3
             * Result: 3 >> Username > 32
             * Result: 4 >> Username != Regex ( Not allowed )
             * Result: 5 >> Username Exist
             */
            Client.on(Packet.Username, function(Message)
            {
                if (Misc.IsUndefined(Message.Username))
                    return Client.Send({ Result: 1 })

                if (Message.Username.length < 3)
                    return Client.Send({ Result: 2 })

                if (Message.Username.length > 32)
                    return Client.Send({ Result: 3 })

                Message.Username = Message.Username.toLowerCase()

                if (Message.Username.search(Config.PATTERN_USERNAME) === -1)
                    return Client.Send({ Result: 4 })

                global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray(function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('DBError', { Error: Error })
                        return Client.Send({ Result: -1 })
                    }

                    if (Misc.IsDefined(Result[0]))
                        return Client.Send({ Result: 5 })

                    Client.Send({ Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.Username, IP: RealClient.remoteAddress })
                })
            })

            /**
             * @PacketID 2
             *
             * @Description Sabte Nam Az Tarighe Phone Marhale Aval
             *
             * @Param {string} Number
             * @Param {string} Country
             * @Param {string} Username
             *
             * Support Countries: 'IR'
             *
             * Result: 1 >> Country == Undefined
             * Result: 2 >> Number == Undefined
             * Result: 3 >> Username == Undefined
             * Result: 4 >> Country Not Supported
             * Result: 5 >> Number != Regex ( Not Allowed )
             * Result: 6 >> Username < 3
             * Result: 7 >> Username > 32
             * Result: 8 >> Username != Regex ( Not Allowed )
             * Result: 9 >> Username Already Used
             * Result: 10 >> Number Already Used
             */
            Client.on(Packet.SignUpPhone, function(Message)
            {
                if (Misc.IsUndefined(Message.Country))
                    return Client.Send({ Result: 1 })

                if (Misc.IsUndefined(Message.Number))
                    return Client.Send({ Result: 2 })

                if (Misc.IsUndefined(Message.Username))
                    return Client.Send({ Result: 3 })

                let CountryPattern
                let CountryIsInvalid = true

                switch (Message.Country.toUpperCase())
                {
                case 'IR':
                    CountryPattern = Config.PATTERN_IR_PHONE
                    CountryIsInvalid = false
                    break
                }

                if (CountryIsInvalid)
                    return Client.Send({ Result: 4 })

                if (Message.Number.search(CountryPattern) === -1)
                    return Client.Send({ Result: 5 })

                if (Message.Username.length < 3)
                    return Client.Send({ Result: 6 })

                if (Message.Username.length > 32)
                    return Client.Send({ Result: 7 })

                Message.Username = Message.Username.toLowerCase()

                if (Message.Username.search(Config.PATTERN_USERNAME) === -1)
                    return Client.Send({ Result: 8 })

                global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray(function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('DBError', { Error: Error })
                        return Client.Send({ Result: -1 })
                    }

                    if (Misc.IsDefined(Result[0]))
                        return Client.Send({ Result: 9 })

                    global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray(function(Error, Result)
                    {
                        if (Error)
                        {
                            Misc.Analyze('DBError', { Error: Error })
                            return Client.Send({ Result: -1 })
                        }

                        if (Misc.IsDefined(Result[0]))
                            return Client.Send({ Result: 10 })

                        let Code = Misc.RandomNumber(5)

                        global.DB.collection('register').insertOne({ Type: TypeList.SignUp.Number, Number: Message.Number, Username: Message.Username, Code: Code, CreatedTime: Misc.Time() }, function(Error2)
                        {
                            if (Error2)
                            {
                                Misc.Analyze('DBError', { Error: Error2 })
                                return Client.Send({ Result: -1 })
                            }

                            // FixMe Add Request To SMS Panel

                            Client.Send({ Result: 0 })

                            Misc.Analyze('Request', { ID: Packet.SignUpPhone, IP: RealClient.remoteAddress })
                        })
                    })
                })
            })

            /**
             * @PacketID 3
             *
             * @Description Taeedie Sabte Nam Az Tarighe Phone Marhale Dovom
             *
             * @Param {string} Number
             * @Param {string} Code
             *
             * Result: 1 >> Code == Undefined
             * Result: 2 >> Number == Undefined
             * Result: 3 >> Code Invalid
             * Result: 4 >> Request Invalid
             * Result: 5 >> Number Already Used
             * Result: 6 >> Username Already Used
             *
             * Return:
             *           ID: Account ID Bayad To Client Save She
             *           Key: Account Key Bayad To Client Save She, Mojavez e Dastresi
             */
            Client.on(Packet.SignUpPhoneVerify, function(Message)
            {
                if (Misc.IsUndefined(Message.Code))
                    return Client.Send({ Result: 1 })

                if (Misc.IsUndefined(Message.Number))
                    return Client.Send({ Result: 2 })

                if (Message.Code.length !== 5)
                    return Client.Send({ Result: 3 })

                Message.Number = Message.Number.replace(Config.PATTERN_ALL_PHONE, '')

                global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: TypeList.SignUp.Number }, { CreatedTime: { $gt: Misc.Time() - 900 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 1 }).toArray(function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('DBError', { Error: Error })
                        return Client.Send({ Result: -1 })
                    }

                    if (Misc.IsUndefined(Result[0]))
                        return Client.Send({ Result: 4 })

                    global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray(function(Error2, Result2)
                    {
                        if (Error2)
                        {
                            Misc.Analyze('DBError', { Error: Error2 })
                            return Client.Send({ Result: -1 })
                        }

                        if (Misc.IsDefined(Result2[0]))
                            return Client.Send({ Result: 5 })

                        global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray(function(Error3, Result3)
                        {
                            if (Error3)
                            {
                                Misc.Analyze('DBError', { Error: Error3 })
                                return Client.Send({ Result: -1 })
                            }

                            if (Misc.IsDefined(Result3[0]))
                                return Client.Send({ Result: 6 })

                            global.DB.collection('account').insertOne({ Username: Message.Username, Number: Message.Number, CreatedTime: Misc.Time() }, async function(Error4, Result4)
                            {
                                if (Error4)
                                {
                                    Misc.Analyze('DBError', { Error: Error4 })
                                    return Client.Send({ Result: -1 })
                                }

                                const AuthResult = await Auth.Create(Result4.insertedId)

                                if (AuthResult.Result !== 0)
                                    return Client.Send({ Result: -3 })

                                ClientManager.Add(Client)

                                Client.__Owner = Result4.insertedId
                                Client.Send({ Result: 0, ID: Result4.insertedId, Key: AuthResult.Key })
                            })
                        })
                    })
                })
            })
        })

        Server.on('close', function()
        {
            Misc.Analyze('ServerClose')
        })

        Server.on('error', function(Error)
        {
            Misc.Analyze('ServerError', { Error: Error })
        })

        Server.listen(Config.SERVER_PORT, '0.0.0.0', function()
        {
            Misc.Analyze('ServerListen')
        })
    })

/*
    Internal Result List:
    -1 : DataBase Warning
    -2 : Request Warning
    -3 : Authentication Warning
*/

/*
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

                    Misc.API('OnSignIn', { })
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

                Misc.API('OnAuthentication', { })
            })

            Client.on('GetMessage', function(Data, CallBack)
            {
                if (Misc.IsInvalidJSON(Data))
                {
                    CallBack({ Result: 1 })
                    return
                }

                Data = JSON.parse(Data)

                if (Misc.IsUndefined(Data.Who) || Misc.IsInvalidID(Data.Who))
                {
                    CallBack({ Result: 2 })
                    return
                }

                Data.Skip = parseInt(Data.Skip || 0)

                // $or: [ { $and: [ { From: global.MongoID(Client.__Owner) }, { To: global.MongoID(Data.Who) } ] }, { $and: [ { From: global.MongoID(Data.Who) }, { To: global.MongoID(Client.__Owner) } ] } ]

                global.DB.collection('message').find({ }).sort({ Time: 1 }).skip(Data.Skip).limit(10).toArray(async function(Error, Result)
                {
                    if (Error)
                    {
                        Misc.Analyze('OnDBQuery', { Tag: 'GetMessage', Error: Error }, 'error')
                        CallBack({ Result: -1 })
                        return
                    }

                    for (let I = 0; I < Result.length; I++)
                    {
                        global.DB.collection('message').find({ $and: [ { _id: Result[I]._id }, { Delivery: { $exists: false } } ] }).toArray(function(Error2, Result2)
                        {
                            if (Error2)
                            {
                                Misc.Analyze('OnDBQuery', { Tag: 'GetMessage', Error: Error2 }, 'error')
                                return
                            }

                            if (Misc.IsUndefined(Result2[0]))
                                return

                            const Time = Misc.TimeMili()
                            const From = ClientManager.Find(Result2[0].From)

                            if (Misc.IsDefined(From))
                                From.emit('OnDelivery', { ID: Result2[0]._id, Delivery: Time })
                        })
                    }

                    CallBack({ Result: 0, Data: Result })

                    Misc.API('GetMessage', { })
                })
            })

            Client.on('SendData2', async function(Stream, Data, CallBack)
            {
                var WriteStream = FS.createWriteStream(Config.APP_STORAGE_TEMP + UniqueName())
                Stream.pipe(WriteStream)

                WriteStream.on('finish', function()
                {
                    console.log('FinishL ')
                })
            })

            Client.on('SendMessage', function(Data, CallBack)
            {
                if (Misc.IsInvalidJSON(Data))
                {
                    CallBack({ Result: 1 })
                    return
                }

                Data = JSON.parse(Data)

                if (Misc.IsUndefined(Data.To) || Misc.IsInvalidID(Data.To) || Misc.IsUndefined(Data.Message))
                {
                    CallBack({ Result: 2 })
                    return
                }

                global.DB.collection('account').find({ '_id': global.MongoID(Data.To) }).limit(1).project({ _id: 1 }).toArray(async function(Error, Result)
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

                    const Time = Misc.TimeMili()
                    const Message = { From: global.MongoID(Client.__Owner), To: global.MongoID(Data.To), Message: Data.Message, Type: MessageType.TEXT, Time: Time }

                    if (Misc.IsDefined(Data.ReplyID))
                        Message.Reply = Data.ReplyID

                    const To = ClientManager.Find(Message.To)

                    if (Misc.IsDefined(To))
                    {
                        To.emit(Message)
                        Message.Delivery = Time
                    }

                    Client.Send2('SendMessage2', { Name: 'Ali' })

                    global.DB.collection('message').insertOne(Message)

                    CallBack({ Result: 0, ID: Message._id, Time: Time, Delivery: Message.Delivery })

                    Misc.API('SendMessage', { })
                })
            })
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
