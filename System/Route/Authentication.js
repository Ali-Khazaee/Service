'use strict'

const Config = require('../Config/Core')
const Packet = require('../Model/Packet')
const Auth = require('../Handler/AuthHandler')
const Misc = require('../Handler/MiscHandler')
const ClientManager = require('../Handler/ClientHandler')
const Language = require('../Handler/LanguageHandler')
const DataType = require('../Model/DataType').Authentication

module.exports = (Client) =>
{
    /**
     * @PacketID PhoneSignUp
     *
     * @Description Sabte Nam Az Tarighe Phone Marhale Aval
     *
     * @Param {string} Number
     * @Param {string} Country
     * @Param {string} Username
     *
     * Support Countries: 'IR'
     *
     * Result: 1 >> Country Undefined
     * Result: 2 >> Number Undefined
     * Result: 3 >> Username ( Undefined, GT: 32, LT: 3, NE: Regex )
     * Result: 4 >> Country | Number ( Not Allowed )
     * Result: 5 >> Username Already Used
     * Result: 6 >> Number Already Used
     */
    Client.on(Packet.PhoneSignUp, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Country))
            return Client.Send(Packet.PhoneSignUp, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.PhoneSignUp, ID, { Result: 2 })

        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.text(Message.Username))
            return Client.Send(Packet.PhoneSignUp, ID, { Result: 3 })

        let CountryPattern
        let CountryIsInvalid = true

        switch (Message.Country.toUpperCase())
        {
            case 'IR':
                CountryPattern = Config.PATTERN_IR_PHONE
                CountryIsInvalid = false
                break
        }

        if (CountryIsInvalid || !CountryPattern.test(Message.Number))
            return Client.Send(Packet.PhoneSignUp, ID, { Result: 4 })

        Message.Username = Message.Username.toLowerCase()

        global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneSignUp, Error: Error })
                return Client.Send(Packet.PhoneSignUp, ID, { Result: -1 })
            }

            if (Misc.IsDefined(Result[0]))
                return Client.Send(Packet.PhoneSignUp, ID, { Result: 5 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PhoneSignUp, Error: Error2 })
                    return Client.Send(Packet.PhoneSignUp, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.PhoneSignUp, ID, { Result: 6 })

                let Code = 55555 // FixMe Misc.RandomNumber(5)

                global.DB.collection('register').insertOne({ Type: DataType.PhoneSignUp, Number: Message.Number, Username: Message.Username, Code: Code, Country: Message.Country.toUpperCase(), Time: Misc.Time() }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.PhoneSignUp, Error: Error3 })
                        return Client.Send(Packet.PhoneSignUp, ID, { Result: -1 })
                    }

                    // FixMe Add Request To SMS Panel

                    Client.Send(Packet.PhoneSignUp, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.PhoneSignUp, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @PacketID PhoneSignUpVerify
     *
     * @Description Taeedie Sabte Nam Az Tarighe Phone Marhale Dovom
     *
     * @Param {string} Number
     * @Param {string} Code
     *
     * Result: 1 >> Code ( Undefined, Invalid )
     * Result: 2 >> Number == Undefined
     * Result: 3 >> Request Invalid
     * Result: 4 >> Number Already Used
     * Result: 5 >> Username Already Used
     *
     * @Return ID: Account ID Bayad To Client Save She
     *         Key: Account Key Bayad To Client Save She, Mojavez e Dastresi e Account e
     */
    Client.on(Packet.PhoneSignUpVerify, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || String(Message.Code).length !== 5)
            return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: DataType.PhoneSignUp }, { Time: { $gt: Misc.Time() - 1800 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 0, Username: 1, Country: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneSignUpVerify, Error: Error })
                return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: 3 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PhoneSignUpVerify, Error: Error2 })
                    return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: 4 })

                global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.PhoneSignUpVerify, Error: Error3 })
                        return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: 5 })

                    global.DB.collection('account').insertOne({ Username: Result[0].Username, Number: Message.Number, Country: Result[0].Country, Time: Misc.Time() }, (Error4, Result4) =>
                    {
                        if (Misc.IsDefined(Error4))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.PhoneSignUpVerify, Error: Error4 })
                            return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: -1 })
                        }

                        Auth.AuthCreate(Result4.insertedId).then((Result5) =>
                        {
                            if (Result5.Result !== 0)
                                return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: -3 })

                            global.DB.collection('key').insertOne({ Owner: Result4.insertedId, Key: Result5.Key, Time: Misc.Time() }, (Error5) =>
                            {
                                if (Misc.IsDefined(Error5))
                                {
                                    Misc.Analyze('DBError', { Tag: Packet.PhoneSignUpVerify, Error: Error5 })
                                    return Client.Send(Packet.PhoneSignUpVerify, ID, { Result: -1 })
                                }

                                if (Misc.IsUndefined(Client.__Owner))
                                {
                                    Client.__Owner = Result4.insertedId
                                    ClientManager.Add(Client)
                                }

                                Client.Send(Packet.PhoneSignUpVerify, ID, { Result: 0, ID: Result4.insertedId, Key: Result5.Key })
                            })
                        })
                    })
                })
            })
        })
    })

    /**
     * @Packet PhoneSignIn
     *
     * @Description Vorod Az Tarighe Phone Marhale Aval
     *
     * @Param {string} Number
     *
     * Result: 1 >> Number ( Undefined, NE: Regex )
     * Result: 2 >> Number Dosen't Exist
     */
    Client.on(Packet.PhoneSignIn, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.PhoneSignIn, ID, { Result: 1 })

        global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1, Country: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneSignIn, Error: Error })
                return Client.Send(Packet.PhoneSignIn, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PhoneSignIn, ID, { Result: 2 })

            let Code = 55555 // FixMe - Misc.RandomNumber(5)

            global.DB.collection('register').insertOne({ Owner: Result[0]._id, Type: DataType.PhoneSignIn, Number: Message.Number, Code: Code, Time: Misc.Time() }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PhoneSignIn, Error: Error2 })
                    return Client.Send(Packet.PhoneSignIn, ID, { Result: -1 })
                }

                // FixMe - Add Request To SMS Panel

                Client.Send(Packet.PhoneSignIn, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.PhoneSignIn, IP: Client._Address })
            })
        })
    })

    /**
     * @PacketID PhoneSignInVerify
     *
     * @Description Taeedie Vorod Az Tarighe Phone Marhale Dovom
     *
     * @Param {string} Number
     * @Param {string} Code
     *
     * Result: 1 >> Code ( Undefined, Invalid )
     * Result: 2 >> Number == Undefined
     * Result: 3 >> Request Invalid
     *
     * @Return ID: Account ID Bayad To Client Save She
     *         Key: Account Key Bayad To Client Save She, Mojavez e Dastresi e Account e
     */
    Client.on(Packet.PhoneSignInVerify, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || String(Message.Code).length !== 5)
            return Client.Send(Packet.PhoneSignInVerify, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.PhoneSignInVerify, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: DataType.PhoneSignIn }, { Time: { $gt: Misc.Time() - 1800 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 1, Owner: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneSignInVerify, Error: Error })
                return Client.Send(Packet.PhoneSignInVerify, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PhoneSignInVerify, ID, { Result: 3 })

            Auth.AuthCreate(Result[0].Owner).then((Result2) =>
            {
                if (Result2.Result !== 0)
                    return Client.Send(Packet.PhoneSignInVerify, ID, { Result: -3 })

                global.DB.collection('key').insertOne({ Owner: Result[0].Owner, Key: Result2.Key, Time: Misc.Time() }, (Error2) =>
                {
                    if (Misc.IsDefined(Error2))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.PhoneSignInVerify, Error: Error2 })
                        return Client.Send(Packet.PhoneSignInVerify, ID, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Client.__Owner))
                    {
                        Client.__Owner = Result[0].Owner
                        ClientManager.Add(Client)
                    }

                    Client.Send(Packet.PhoneSignInVerify, ID, { Result: 0, ID: Result[0].Owner, Key: Result2.Key })
                })
            })
        })
    })

    /**
     * @PacketID EmailSignUp
     *
     * @Description Sabte Nam Az Tarighe Email Marhale Aval
     *
     * @Param {string} Email
     * @Param {string} Country
     * @Param {string} Username
     *
     * Support Countries: 'IR'
     *
     * Result: 1 >> Country Undefined
     * Result: 2 >> Email ( Undefined, NE: Regex )
     * Result: 3 >> Username ( Undefined, GT: 32, LT: 3, NE: Regex )
     * Result: 4 >> Country ( Not Allowed )
     * Result: 5 >> Username Already Used
     * Result: 6 >> Email Already Used
     */
    Client.on(Packet.EmailSignUp, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Country))
            return Client.Send(Packet.EmailSignUp, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Email) || !Config.PATTERN_EMAIL.test(Message.Email))
            return Client.Send(Packet.EmailSignUp, ID, { Result: 2 })

        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.test(Message.Username))
            return Client.Send(Packet.EmailSignUp, ID, { Result: 3 })

        let CountryIsInvalid = true

        switch (Message.Country.toUpperCase())
        {
            case 'IR':
                CountryIsInvalid = false
                break
        }

        if (CountryIsInvalid)
            return Client.Send(Packet.EmailSignUp, ID, { Result: 4 })

        Message.Username = Message.Username.toLowerCase()

        global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.EmailSignUp, Error: Error })
                return Client.Send(Packet.EmailSignUp, ID, { Result: -1 })
            }

            if (Misc.IsDefined(Result[0]))
                return Client.Send(Packet.EmailSignUp, ID, { Result: 5 })

            global.DB.collection('account').find({ Email: Message.Email }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.EmailSignUp, Error: Error2 })
                    return Client.Send(Packet.EmailSignUp, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.EmailSignUp, ID, { Result: 6 })

                let Code = 55555 // FixMe Misc.RandomNumber(5)

                global.DB.collection('register').insertOne({ Type: DataType.EmailSignUp, Email: Message.Email, Username: Message.Username, Code: Code, Country: Message.Country.toUpperCase(), Time: Misc.Time() }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.EmailSignUp, Error: Error3 })
                        return Client.Send(Packet.EmailSignUp, ID, { Result: -1 })
                    }

                    Misc.SendEmail(Message.Email, Language.Lang(Message.Country, Language.EmailSignUpSubject), Language.Lang(Message.Country, Language.EmailSignUpMessage, Code))

                    Client.Send(Packet.EmailSignUp, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.EmailSignUp, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @PacketID EmailSignUpVerify
     *
     * @Description Taeedie Sabte Nam Az Tarighe Email Marhale Dovom
     *
     * @Param {string} Email
     * @Param {string} Code
     *
     * Result: 1 >> Code ( Undefined, Invalid )
     * Result: 2 >> Email == Undefined
     * Result: 3 >> Request Invalid
     * Result: 4 >> Email Already Used
     * Result: 5 >> Username Already Used
     *
     * @Return ID: Account ID Bayad To Client Save She
     *         Key: Account Key Bayad To Client Save She, Mojavez e Dastresi e Account e
     */
    Client.on(Packet.EmailSignUpVerify, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || String(Message.Code).length !== 5)
            return Client.Send(Packet.EmailSignUpVerify, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Email))
            return Client.Send(Packet.EmailSignUpVerify, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: DataType.EmailSignUp }, { Time: { $gt: Misc.Time() - 1800 } }, { Email: Message.Email } ] }).limit(1).project({ _id: 0, Username: 1, Country: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.EmailSignUpVerify, Error: Error })
                return Client.Send(Packet.EmailSignUpVerify, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.EmailSignUpVerify, ID, { Result: 3 })

            global.DB.collection('account').find({ Email: Message.Email }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.EmailSignUpVerify, Error: Error2 })
                    return Client.Send(Packet.EmailSignUpVerify, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.EmailSignUpVerify, ID, { Result: 4 })

                global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.EmailSignUpVerify, Error: Error3 })
                        return Client.Send(Packet.EmailSignUpVerify, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.EmailSignUpVerify, ID, { Result: 5 })

                    global.DB.collection('account').insertOne({ Username: Result[0].Username, Email: Message.Email, Country: Result[0].Country, Time: Misc.Time() }, (Error4, Result4) =>
                    {
                        if (Misc.IsDefined(Error4))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.EmailSignUpVerify, Error: Error4 })
                            return Client.Send(Packet.EmailSignUpVerify, ID, { Result: -1 })
                        }

                        Auth.AuthCreate(Result4.insertedId).then((Result5) =>
                        {
                            if (Result5.Result !== 0)
                                return Client.Send(Packet.EmailSignUpVerify, ID, { Result: -3 })

                            global.DB.collection('key').insertOne({ Owner: Result4.insertedId, Key: Result5.Key, Time: Misc.Time() }, (Error5) =>
                            {
                                if (Misc.IsDefined(Error5))
                                {
                                    Misc.Analyze('DBError', { Tag: Packet.EmailSignUpVerify, Error: Error5 })
                                    return Client.Send(Packet.EmailSignUpVerify, ID, { Result: -1 })
                                }

                                if (Misc.IsUndefined(Client.__Owner))
                                {
                                    Client.__Owner = Result4.insertedId
                                    ClientManager.Add(Client)
                                }

                                Client.Send(Packet.EmailSignUpVerify, ID, { Result: 0, ID: Result4.insertedId, Key: Result5.Key })
                            })
                        })
                    })
                })
            })
        })
    })

    /**
     * @Packet EmailSignIn
     *
     * @Description Vorod Az Tarighe Email Marhale Aval
     *
     * @Param {string} Email
     *
     * Result: 1 >> Email ( Undefined, NE: Regex )
     * Result: 2 >> Email Dosen't Exist
     */
    Client.on(Packet.EmailSignIn, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Email))
            return Client.Send(Packet.EmailSignIn, ID, { Result: 1 })

        global.DB.collection('account').find({ Email: Message.Email }).limit(1).project({ _id: 1, Country: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.EmailSignIn, Error: Error })
                return Client.Send(Packet.EmailSignIn, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.EmailSignIn, ID, { Result: 2 })

            let Code = 55555 // FixMe - Misc.RandomNumber(5)

            global.DB.collection('register').insertOne({ Owner: Result[0]._id, Type: DataType.EmailSignIn, Email: Message.Email, Code: Code, Time: Misc.Time() }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.EmailSignIn, Error: Error2 })
                    return Client.Send(Packet.EmailSignIn, ID, { Result: -1 })
                }

                Misc.SendEmail(Message.Email, Language.Lang(Result[0].Country, Language.EmailSignInSubject), Language.Lang(Result[0].Country, Language.EmailSignInMessage, Code))

                Client.Send(Packet.EmailSignIn, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.EmailSignIn, IP: Client._Address })
            })
        })
    })

    /**
     * @PacketID EmailSignInVerify
     *
     * @Description Taeedie Vorod Az Tarighe Email Marhale Dovom
     *
     * @Param {string} Email
     * @Param {string} Code
     *
     * Result: 1 >> Code ( Undefined, Invalid )
     * Result: 2 >> Email == Undefined
     * Result: 3 >> Request Invalid
     *
     * @Return ID: Account ID Bayad To Client Save She
     *         Key: Account Key Bayad To Client Save She, Mojavez e Dastresi e Account e
     */
    Client.on(Packet.EmailSignInVerify, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || String(Message.Code).length !== 5)
            return Client.Send(Packet.EmailSignInVerify, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Email))
            return Client.Send(Packet.EmailSignInVerify, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: DataType.EmailSignIn }, { Time: { $gt: Misc.Time() - 1800 } }, { Email: Message.Email } ] }).limit(1).project({ _id: 1, Owner: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.EmailSignInVerify, Error: Error })
                return Client.Send(Packet.EmailSignInVerify, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.EmailSignInVerify, ID, { Result: 3 })

            Auth.AuthCreate(Result[0].Owner).then((Result2) =>
            {
                if (Result2.Result !== 0)
                    return Client.Send(Packet.EmailSignInVerify, ID, { Result: -3 })

                global.DB.collection('key').insertOne({ Owner: Result[0].Owner, Key: Result2.Key, Time: Misc.Time() }, (Error2) =>
                {
                    if (Misc.IsDefined(Error2))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.EmailSignInVerify, Error: Error2 })
                        return Client.Send(Packet.EmailSignInVerify, ID, { Result: -1 })
                    }

                    if (Misc.IsUndefined(Client.__Owner))
                    {
                        Client.__Owner = Result[0].Owner
                        ClientManager.Add(Client)
                    }

                    Client.Send(Packet.EmailSignInVerify, ID, { Result: 0, ID: Result[0].Owner, Key: Result2.Key })
                })
            })
        })
    })
}
