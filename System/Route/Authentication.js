const Misc = require('../Handler/Misc')
const Config = require('../Config/Core')
const Packet = require('../Handler/Packet')
const Auth = require('../Handler/Auth')
const Types = require('../Handler/Types')

module.exports = function(Client)
{
    /**
     * @Packet Username
     *
     * @Description DarKhast e Bar Resie Username
     *
     * @Param {string} Username
     *
     * Result: 1 >> Username ( Undefined, GT: 32, LT: 3, NQ: Regex )
     * Result: 2 >> Username Exist
     */
    Client.on(Packet.Username, function(Message)
    {
        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.test(Message.Username))
            return Client.Send(Packet.Username, { Result: 1 })

        Message.Username = Message.Username.toLowerCase()

        global.DB.collection('account').find({ Username: Message.Username }).limit(1).project({ _id: 1 }).toArray(function(Error, Result)
        {
            if (Error)
            {
                Misc.Analyze('DBError', { Error: Error })
                return Client.Send(Packet.Username, { Result: -1 })
            }

            if (Misc.IsDefined(Result[0]))
                return Client.Send(Packet.Username, { Result: 2 })

            Client.Send(Packet.Username, { Result: 0 })

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
     * Result: 3 >> Username ( Undefined, GT: 32, LT: 3, NQ: Regex )
     * Result: 4 >> Country | Number ( Not Allowed )
     * Result: 5 >> Username Already Used
     * Result: 6 >> Number Already Used
     */
    Client.on(Packet.SignUpPhone, function(Message)
    {
        if (Misc.IsUndefined(Message.Country))
            return Client.Send({ Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send({ Result: 2 })

        if (Misc.IsUndefined(Message.Username) || Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.text(Message.Username))
            return Client.Send({ Result: 3 })

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

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray(function(Error2, Result2)
            {
                if (Error2)
                {
                    Misc.Analyze('DBError', { Error: Error2 })
                    return Client.Send({ Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send({ Result: 6 })

                let Code = 55555 // FixMe Misc.RandomNumber(5)

                global.DB.collection('register').insertOne({ Type: Types.SignUp.Number, Number: Message.Number, Username: Message.Username, Code: Code, Time: Misc.Time() }, function(Error3)
                {
                    if (Error3)
                    {
                        Misc.Analyze('DBError', { Error: Error3 })
                        return Client.Send({ Result: -1 })
                    }

                    // FixMe Add Request To SMS Panel

                    Client.Send({ Result: 0 })

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
    Client.on(Packet.SignUpPhoneVerify, function(Message)
    {
        if (Misc.IsUndefined(Message.Code) || Message.Code.length !== 5)
            return Client.Send({ Result: 1 })

        if (Misc.IsUndefined(Message.Number))
            return Client.Send({ Result: 2 })

        global.DB.collection('register').find({ $and: [ { Code: Message.Code }, { Type: Types.SignUp.Number }, { Time: { $gt: Misc.Time() - 900 } }, { Number: Message.Number } ] }).limit(1).project({ _id: 1, Username: 1 }).toArray(function(Error, Result)
        {
            if (Error)
            {
                Misc.Analyze('DBError', { Error: Error })
                return Client.Send({ Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send({ Result: 3 })

            global.DB.collection('account').find({ Number: Message.Number }).limit(1).project({ _id: 1 }).toArray(function(Error2, Result2)
            {
                if (Error2)
                {
                    Misc.Analyze('DBError', { Error: Error2 })
                    return Client.Send({ Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send({ Result: 4 })

                global.DB.collection('account').find({ Username: Result[0].Username }).limit(1).project({ _id: 1 }).toArray(function(Error3, Result3)
                {
                    if (Error3)
                    {
                        Misc.Analyze('DBError', { Error: Error3 })
                        return Client.Send({ Result: -1 })
                    }

                    if (Misc.IsDefined(Result3[0]))
                        return Client.Send({ Result: 5 })

                    global.DB.collection('account').insertOne({ Username: Message.Username, Number: Message.Number, Time: Misc.Time() }, async function(Error4, Result4)
                    {
                        if (Error4)
                        {
                            Misc.Analyze('DBError', { Error: Error4 })
                            return Client.Send({ Result: -1 })
                        }

                        const AuthResult = await Auth.Create(Result4.insertedId)

                        if (AuthResult.Result !== 0)
                            return Client.Send({ Result: -3 })

                        global.DB.collection('key').insertOne({ Owner: Result4.insertedId, Key: AuthResult.Key, Time: Misc.Time() }, async function(Error5)
                        {
                            if (Error5)
                            {
                                Misc.Analyze('DBError', { Error: Error5 })
                                return Client.Send({ Result: -1 })
                            }

                            Client.__Owner = Result4.insertedId

                            Client.Add()

                            Client.Send({ Result: 0, ID: Result4.insertedId, Key: AuthResult.Key })
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
     */
    Client.on(Packet.Authentication, function(Message)
    {
        if (Misc.IsUndefined(Message.Key))
            return Client.Send(Packet.Authentication, { Result: 1 })

        global.DB.collection('key').find({ $and: [ { Key: Message.Key }, { Revoke: { $exists: false } } ] }).limit(1).project({ _id: 0, Owner: 1 }).toArray(function(Error, Result)
        {
            if (Error)
            {
                Misc.Analyze('DBError', { Error: Error })
                return Client.Send(Packet.Authentication, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.Authentication, { Result: 2 })

            Client.__Owner = Result[0].Owner

            Client.Add()

            Client.Send(Packet.Authentication, { Result: 0 })

            Misc.Analyze('Request', { ID: Packet.Authentication, IP: Client._Address })
        })
    })
}

/*
    /**
     * @PacketID 4
     *
     * @Description Sabte Nam Az Tarighe Email Marhale Aval
     *
     * @Param {string} Email
     * @Param {string} Username
     *
     * Result: 1 >> Email == Undefined
     * Result: 2 >> Username == Undefined
     * Result: 3 >> Username != Regex ( Not Allowed )
     * Result: 4 >> Email Invalid
     * Result: 5 >> Username Already Used
     * Result: 6 >> Email Already Used
     * /
    Client.on(Packet.SignUpEmail, function(Message)
    {
        if (Misc.IsUndefined(Message.Email))
            return Client.Send({ Result: 1 })

        if (Misc.IsUndefined(Message.Username))
            return Client.Send({ Result: 2 })

        Message.Username = Message.Username.toLowerCase()

        if (Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.text(Message.Username))
            return Client.Send({ Result: 3 })

        Message.Email = Message.Email.toLowerCase()

        if (!Config.PATTERN_EMAIL.text(Message.Email))
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

            global.DB.collection('account').find({ Email: Message.Email }).limit(1).project({ _id: 1 }).toArray(function(Error2, Result2)
            {
                if (Error2)
                {
                    Misc.Analyze('DBError', { Error: Error2 })
                    return Client.Send({ Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send({ Result: 6 })

                let Code = Misc.RandomNumber(5)

                global.DB.collection('register').insertOne({ Type: Types.SignUp.Email, Email: Message.Email, Username: Message.Username, Code: Code, CreatedTime: Misc.Time() }, function(Error3)
                {
                    if (Error3)
                    {
                        Misc.Analyze('DBError', { Error: Error3 })
                        return Client.Send({ Result: -1 })
                    }

                    // FixMe Message For Every Language

                    let Subject = Language('EN', Language.RegisterEmailSubject, Code)
                    let Content = Language('EN', Language.RegisterEmailContent, Code)

                    NodeMailer.createTransport({ host: Config.EMAIL_HOST, port: Config.EMAIL_PORT, secure: Config.EMAIL_SECURE, auth: { user: Config.EMAIL_USERNAME, pass: Config.EMAIL_PASSWORD } }).sendMail({ from: Config.EMAIL_FROM, to: Message.Email, subject: Subject, html: Content })

                    Client.Send({ Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SignUpEmail, IP: Client.remoteAddress })
                })
            })
        })
    })

    /**
        * @PacketID 5
        *
        * @Description Sabte Nam Az Tarighe Email Marhale Dovom
        *
        * @Param {string} Email
        * @Param {string} Username
        *
        * Result: 1 >> Email == Undefined
        * Result: 2 >> Username == Undefined
        * Result: 3 >> Username != Regex ( Not Allowed )
        * Result: 4 >> Email Invalid
        * Result: 5 >> Username Already Used
        * Result: 6 >> Email Already Used
        * /
    Client.on(Packet.SignUpEmail, function(Message)
    {
        if (Misc.IsUndefined(Message.Email))
            return Client.Send({ Result: 1 })

        if (Misc.IsUndefined(Message.Username))
            return Client.Send({ Result: 2 })

        Message.Username = Message.Username.toLowerCase()

        if (Message.Username.length < 3 || Message.Username.length > 32 || !Config.PATTERN_USERNAME.text(Message.Username))
            return Client.Send({ Result: 3 })

        Message.Email = Message.Email.toLowerCase()

        if (!Config.PATTERN_EMAIL.text(Message.Email))
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

            global.DB.collection('account').find({ Email: Message.Email }).limit(1).project({ _id: 1 }).toArray(function(Error2, Result2)
            {
                if (Error2)
                {
                    Misc.Analyze('DBError', { Error: Error2 })
                    return Client.Send({ Result: -1 })
                }

                if (Misc.IsDefined(Result2[0]))
                    return Client.Send({ Result: 6 })

                let Code = Misc.RandomNumber(5)

                global.DB.collection('register').insertOne({ Type: Types.SignUp.Email, Email: Message.Email, Username: Message.Username, Code: Code, CreatedTime: Misc.Time() }, function(Error3)
                {
                    if (Error3)
                    {
                        Misc.Analyze('DBError', { Error: Error3 })
                        return Client.Send({ Result: -1 })
                    }

                    // FixMe Message For Every Language

                    let Subject = Language('EN', Language.RegisterEmailSubject, Code)
                    let Content = Language('EN', Language.RegisterEmailContent, Code)

                    NodeMailer.createTransport({ host: Config.EMAIL_HOST, port: Config.EMAIL_PORT, secure: Config.EMAIL_SECURE, auth: { user: Config.EMAIL_USERNAME, pass: Config.EMAIL_PASSWORD } }).sendMail({ from: Config.EMAIL_FROM, to: Message.Email, subject: Subject, html: Content })

                    Client.Send({ Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SignUpEmail, IP: Client.remoteAddress })
                })
            })
        })
    })
*/
