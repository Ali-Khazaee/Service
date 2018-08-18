'use strict'

const Config = require('../Config/Core')
const Packet = require('../Model/Packet')
const Auth = require('../Handler/AuthHandler')
const Misc = require('../Handler/MiscHandler')
const SignUp = require('../Model/DataType').SignUp
const SignIn = require('../Model/DataType').SignIn
const ClientManager = require('../Handler/ClientHandler')

module.exports = (Client) =>
{
    /**
     * @Packet Username
     *
     * @Description DarKhast e Bar Resie Username
     *
     * @Param {string} Username
     *
     * Result: 1 >> Username ( Undefined, GT: 32, LT: 3, NE: Regex )
     * Result: 2 >> Username Exist
     */
    Client.on(Packet.Username, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.test(Message.Username))
            return Client.Send(Packet.Username, ID, { Result: 1 })

        Message.Username = Message.Username.toLowerCase()

        global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.Username, Error: Error })
                return Client.Send(Packet.Username, ID, { Result: -1 })
            }

            if (Misc.IsDefined(Result[0]))
                return Client.Send(Packet.Username, ID, { Result: 2 })

            Client.Send(Packet.Username, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.Username, IP: Client._Address })
        })
    })

    /**
     * @PacketID SignUpPhone
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
    Client.on(Packet.SignUpPhone, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Country))
            return Client.Send(Packet.SignUpPhone, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.SignUpPhone, ID, { Result: 2 })

        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.text(Message.Username))
            return Client.Send(Packet.SignUpPhone, ID, { Result: 3 })

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
            return Client.Send(Packet.SignUpPhone, ID, { Result: 4 })

        global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SignUpPhone, Error: Error })
                return Client.Send(Packet.SignUpPhone, ID, { Result: -1 })
            }

            if (Misc.IsDefined(Result[0]))
                return Client.Send(Packet.SignUpPhone, ID, { Result: 5 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SignUpPhone, Error: Error2 })
                    return Client.Send(Packet.SignUpPhone, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.SignUpPhone, ID, { Result: 6 })

                let Code = 55555 // FixMe Misc.RandomNumber(5)

                global.DB.collection('register').insertOne({ Type: SignUp.Number, Number: Message.Number, Username: Message.Username, Code: Code, Time: Misc.Time() }, (Error3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SignUpPhone, Error: Error3 })
                        return Client.Send(Packet.SignUpPhone, ID, { Result: -1 })
                    }

                    // FixMe Add Request To SMS Panel

                    Client.Send(Packet.SignUpPhone, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SignUpPhone, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @PacketID SignUpPhoneVerify
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
    Client.on(Packet.SignUpPhoneVerify, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Code) || Message.Code.length !== 5)
            return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: SignUp.Number }, { Time: { $gt: Misc.Time() - 1800 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 1, Username: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SignUpPhoneVerify, Error: Error })
                return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: 3 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray((Error2, Result2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SignUpPhoneVerify, Error: Error2 })
                    return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: 4 })

                global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray((Error3, Result3) =>
                {
                    if (Misc.IsDefined(Error3))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SignUpPhoneVerify, Error: Error3 })
                        return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: 5 })

                    global.DB.collection('account').insertOne({ Username: Message.Username, Number: Message.Number, Time: Misc.Time() }, (Error4, Result4) =>
                    {
                        if (Misc.IsDefined(Error4))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.SignUpPhoneVerify, Error: Error4 })
                            return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: -1 })
                        }

                        Auth.AuthCreate(Result4.insertedId).then((Result5) =>
                        {
                            if (Result5.Result !== 0)
                                return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: -3 })

                            global.DB.collection('key').insertOne({ Owner: Result4.insertedId, Key: Result5.Key, Time: Misc.Time() }, (Error5) =>
                            {
                                if (Misc.IsDefined(Error5))
                                {
                                    Misc.Analyze('DBError', { Tag: Packet.SignUpPhoneVerify, Error: Error5 })
                                    return Client.Send(Packet.SignUpPhoneVerify, ID, { Result: -1 })
                                }

                                Client.__Owner = Result4.insertedId

                                ClientManager.Add(Client)

                                Client.Send(Packet.SignUpPhoneVerify, ID, { Result: 0, ID: Result4.insertedId, Key: Result5.Key })
                            })
                        })
                    })
                })
            })
        })
    })

    /**
     * @Packet Authentication
     *
     * @Description DarKhast e Ehraz e Hoviat
     *
     * @Param {string} Key
     *
     * Result: 1 >> Key ( Undefined )
     * Result: 2 >> Key Doesn't exist
     * Result: 3 >> Already Authenticated
     */
    Client.on(Packet.Authentication, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Key))
            return Client.Send(Packet.Authentication, ID, { Result: 1 })

        global.DB.collection('key').find({ $and: [ { Key: Message.Key }, { Revoke: { $exists: false } } ] }).limit(1).project({ _id: 0, Owner: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.Authentication, Error: Error })
                return Client.Send(Packet.Authentication, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.Authentication, ID, { Result: 2 })

            if (Misc.IsDefined(Client.__Owner))
                return Client.Send(Packet.Authentication, ID, { Result: 3 })

            Client.__Owner = Result[0].Owner

            ClientManager.Add(Client)

            Client.Send(Packet.Authentication, ID, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.Authentication, IP: Client._Address })
        })
    })

    /**
     * @Packet SignInPhone
     *
     * @Description Sign In Az Tariqe Phone Marhale Aval
     *
     * @Param {string} PhoneNumber
     *
     * Result: 1 >> PhoneNumber ( Undefined, NE: Regex )
     * Result: 2 >> PhoneNumber Dosen't Exist
     */
    Client.on(Packet.SignInPhone, (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.PhoneNumber) || !Config.PATTERN_IR_PHONE.test(Message.PhoneNumber))
            return Client.Send(Packet.SignInPhone, ID, { Result: 1 })

        global.DB.collection('account').find({ Number: Message.PhoneNumber }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.PhoneNumber, Error: Error })
                return Client.Send(Packet.SignInPhone, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SignInPhone, ID, { Result: 2 })

            let Code = 55555 // Fix Me - Misc.RandomNumber(5)

            global.DB.collection('register').insertOne({ Type: SignIn.Number, Number: Message.Number, Code: Code, Time: Misc.Time() }, (Error2) =>
            {
                if (Misc.IsDefined(Error2))
                {
                    Misc.Analyze('DBError', { Tag: Packet.PhoneNumber, Error: Error2 })
                    return Client.Send(Packet.SignInPhone, ID, { Result: -1 })
                }

                // Fix Me - Add Request To SMS Panel

                Client.Send(Packet.SignInPhone, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.SignInPhone, IP: Client._Address })
            })
        })
    })
}
