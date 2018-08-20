'use strict'

const Config = require('../Config/Core')
const Packet = require('../Model/Packet')
const DataType = require('../Model/DataType')
const Auth = require('../Handler/AuthHandler')
const Misc = require('../Handler/MiscHandler')
const ClientManager = require('../Handler/ClientHandler')

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

        Message.Username = Message.Username.toLowerCase()

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

                global.DB.collection('register').insertOne({ Type: DataType.SignUp.Number, Number: Message.Number, Username: Message.Username, Code: Code, Time: Misc.Time() }, (Error3) =>
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
     * @PacketID PhoneVerifySignUp
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
    Client.on(Packet.PhoneVerifySignUp, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || Message.Code.length !== 5)
            return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: DataType.SignUp.Number }, { Time: { $gt: Misc.Time() - 1800 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 1, Username: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneVerifySignUp, Error: Error })
                return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: 3 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PhoneVerifySignUp, Error: Error2 })
                    return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: 4 })

                global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.PhoneVerifySignUp, Error: Error3 })
                        return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: 5 })

                    global.DB.collection('account').insertOne({ Username: Message.Username, Number: Message.Number, Time: Misc.Time() }, (Error4, Result4) =>
                    {
                        if (Misc.IsDefined(Error4))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.PhoneVerifySignUp, Error: Error4 })
                            return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: -1 })
                        }

                        Auth.AuthCreate(Result4.insertedId).then((Result5) =>
                        {
                            if (Result5.Result !== 0)
                                return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: -3 })

                            global.DB.collection('key').insertOne({ Owner: Result4.insertedId, Key: Result5.Key, Time: Misc.Time() }, (Error5) =>
                            {
                                if (Misc.IsDefined(Error5))
                                {
                                    Misc.Analyze('DBError', { Tag: Packet.PhoneVerifySignUp, Error: Error5 })
                                    return Client.Send(Packet.PhoneVerifySignUp, ID, { Result: -1 })
                                }

                                Client.__Owner = Result4.insertedId

                                ClientManager.Add(Client)

                                Client.Send(Packet.PhoneVerifySignUp, ID, { Result: 0, ID: Result4.insertedId, Key: Result5.Key })
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
     * @Description Sign In Az Tarighe Phone Marhale Aval
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

        global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneSignIn, Error: Error })
                return Client.Send(Packet.PhoneSignIn, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.PhoneSignIn, ID, { Result: 2 })

            let Code = 55555 // FixMe - Misc.RandomNumber(5)

            global.DB.collection('register').insertOne({ Type: DataType.SignIn.Number, Number: Message.Number, Code: Code, Time: Misc.Time() }, (Error2) =>
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
     * @PacketID SignInPhoneVerify
     *
     * @Description Taeedie Sing in Az Tarighe Phone Marhale Dovom
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
    Client.on(Packet.SignInPhoneVerify, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || Message.Code.length !== 5)
            return Client.Send(Packet.SignInPhoneVerify, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.SignInPhoneVerify, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: SignIn.Number }, { Time: { $gt: Misc.Time() - 1800 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 1, Username: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SignInPhoneVerify, Error: Error })
                return Client.Send(Packet.SignInPhoneVerify, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SignInPhoneVerify, ID, { Result: 3 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SignInPhoneVerify, Error: Error2 })
                    return Client.Send(Packet.SignInPhoneVerify, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.SignInPhoneVerify, ID, { Result: 4 })

                global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SignInPhoneVerify, Error: Error3 })
                        return Client.Send(Packet.SignInPhoneVerify, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.SignInPhoneVerify, ID, { Result: 5 })

                    global.DB.collection('account').insertOne({ Username: Message.Username, Number: Message.Number, Time: Misc.Time() }, (Error4, Result4) =>
                    {
                        if (Misc.IsDefined(Error4))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.SignInPhoneVerify, Error: Error4 })
                            return Client.Send(Packet.SignInPhoneVerify, ID, { Result: -1 })
                        }

                        Auth.AuthCreate(Result4.insertedId).then((Result5) =>
                        {
                            if (Result5.Result !== 0)
                                return Client.Send(Packet.SignInPhoneVerify, ID, { Result: -3 })

                            global.DB.collection('key').insertOne({ Owner: Result4.insertedId, Key: Result5.Key, Time: Misc.Time() }, (Error5) =>
                            {
                                if (Misc.IsDefined(Error5))
                                {
                                    Misc.Analyze('DBError', { Tag: Packet.SignInPhoneVerify, Error: Error5 })
                                    return Client.Send(Packet.SignInPhoneVerify, ID, { Result: -1 })
                                }

                                Client.__Owner = Result4.insertedId

                                ClientManager.Add(Client)

                                Client.Send(Packet.SignInPhoneVerify, ID, { Result: 0, ID: Result4.insertedId, Key: Result5.Key })
                            })
                        })
                    })
                })
            })
        })
    })
}
