var AuthRouter = require('express').Router();
var RateLimit  = require('../Handler/RateLimit');
var CoreConfig = require('../Config/Core');
var Formidable = require('formidable');
var Request    = require('request');
var Upload     = require('../Handler/Upload');
var BCrypt     = require('bcrypt');
var Auth       = require('../Handler/Auth');
var Misc       = require('../Handler/Misc');
var Fs         = require('fs');

AuthRouter.post('/SignInGoogle', RateLimit(30, 60), function(req, res)
{
    var Token = req.body.Token;
    var Session = req.body.Session;

    if (typeof Token === 'undefined' || Token === '')
        return res.json({ Message: 1 });

    var GoogleAuth = require('google-auth-library');
    var AuthGoogle = new GoogleAuth;
    var Client = new AuthGoogle.OAuth2('590625045379-pnhlgdqpr5i8ma705ej7akcggsr08vdf.apps.googleusercontent.com', '', '');

    Client.verifyIdToken(Token, '590625045379-pnhlgdqpr5i8ma705ej7akcggsr08vdf.apps.googleusercontent.com', function(error, result)
    {
        if (error)
            return res.json({ Message: 2 });

        var PayLoad = result.getPayload();

        if (typeof PayLoad === 'undefined' || PayLoad === null || PayLoad === '')
            return res.json({ Message: 3 });

        if (PayLoad['iss'] !== "accounts.google.com" && PayLoad['iss'] !== "https://accounts.google.com")
            return res.json({ Message: 4 });

        if (PayLoad['aud'] !== '590625045379-pnhlgdqpr5i8ma705ej7akcggsr08vdf.apps.googleusercontent.com')
            return res.json({ Message: 5 });

        var IP = req.connection.remoteAddress;

        if (typeof Session === 'undefined' || Session === '')
            Session = "Unknown Session - " + IP;
        else
            Session = Session + " - " + IP;

        var Email = PayLoad['email'].toLowerCase();

        DB.collection("account").findOne({ Email: Email }, { _id: 1, GoogleID: 1 }, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -1 });
            }

            if (result1 !== null && result1.GoogleID !== PayLoad['sub'])
                return res.json({ Message: 6 });

            DB.collection("account").findOne({ GoogleID: PayLoad['sub'] }, { Username: 1, AvatarServer: 1, Avatar: 1 }, function(error2, result2)
            {
                if (error2)
                {
                    Misc.Log(error2);
                    return res.json({ Message: -1 });
                }

                if (result2 !== null)
                {
                    var Avatar = '';
                    var Token = Auth.CreateToken(result2._id);

                    if (typeof result2.AvatarServer !== 'undefined' && result2.AvatarServer !== null && typeof result2.Avatar !== 'undefined' && result2.Avatar !== null)
                        Avatar = Upload.ServerURL(result2.AvatarServer) + result2.Avatar;

                    DB.collection("account").updateOne({ _id: result2._id }, { $push: { Session: { Name: Session, Token: Token, Time: Misc.Time() } } });

                    return res.json({ Message: 0, Registered: true, Token: Token, ID: result2._id, Username: result2.Username, Avatar: Avatar });
                }

                res.json({ Message: 0, Registered: false });
            });
        });
    });
});

AuthRouter.post('/Username', RateLimit(60, 60), function(req, res)
{
    var Username = req.body.Username;

    if (typeof Username === 'undefined' || Username === '')
        return res.json({ Message: 1 });

    if (Username.length < 3)
        return res.json({ Message: 2 });

    if (Username.length > 32)
        return res.json({ Message: 3 });

    Username = Username.toLowerCase();

    if (Username.search(CoreConfig.USERNAME_PATTERN) === -1)
        return res.json({ Message: 4 });

    DB.collection("account").findOne({ Username: Username }, { _id: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result !== null)
            return res.json({ Message: 5 });

        res.json({ Message: 0 });
    });
});

AuthRouter.post('/SignInGoogleVerify', RateLimit(30, 60), function(req, res)
{
    var Form = new Formidable.IncomingForm();
    Form.uploadDir = "./System/Storage/";
    Form.encoding = 'utf-8';
    Form.parse(req, function (error, fields, files)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -7 });
        }

        var Token = fields.Token;
        var Session = fields.Session;
        var Username = fields.Username;
        var Name = fields.Name;
        var Description = fields.Description;

        if (typeof Token === 'undefined' || Token === '')
            return res.json({ Message: 1 });
        
        if (typeof Username === 'undefined' || Username === '')
            return res.json({ Message: 2 });

        if (Username.length < 3)
            return res.json({ Message: 3 });

        if (Username.length > 32)
            return res.json({ Message: 4 });

        Username = Username.toLowerCase();

        if (Username.search(CoreConfig.USERNAME_PATTERN) === -1)
            return res.json({ Message: 5 });

        if (typeof Name === 'undefined' || Name === '')
            return res.json({ Message: 6 });

        if (Name.length < 2)
            return res.json({ Message: 7 });

        if (Name.length > 32)
            return res.json({ Message: 8 });

        Name = Name.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2694-\u2697]|\uD83E[\uDD10-\uDD5D])/g, '');

        var GoogleAuth = require('google-auth-library');
        var AuthGoogle = new GoogleAuth;
        var Client = new AuthGoogle.OAuth2('590625045379-pnhlgdqpr5i8ma705ej7akcggsr08vdf.apps.googleusercontent.com', '', '');

        Client.verifyIdToken(Token, '590625045379-pnhlgdqpr5i8ma705ej7akcggsr08vdf.apps.googleusercontent.com', function(error1, result1)
        {
            if (error1)
                return res.json({ Message: 9 });

            var PayLoad = result1.getPayload();

            if (typeof PayLoad === 'undefined' || PayLoad === null || PayLoad === '')
                return res.json({ Message: 10 });

            if (PayLoad['iss'] !== "accounts.google.com" && PayLoad['iss'] !== "https://accounts.google.com")
                return res.json({ Message: 11 });

            if (PayLoad['aud'] !== '590625045379-pnhlgdqpr5i8ma705ej7akcggsr08vdf.apps.googleusercontent.com')
                return res.json({ Message: 12 });

            var Time = Misc.Time();
            var IP = req.connection.remoteAddress;

            if (typeof Session === 'undefined' || Session === '')
                Session = "Unknown Session - " + IP;
            else
                Session = Session + " - " + IP;

            DB.collection("account").findOne({ Username: Username }, { _id: 1 }, function(error2, result2)
            {
                if (error2)
                {
                    Misc.Log(error2);
                    return res.json({ Message: -1 });
                }

                if (result2 !== null)
                    return res.json({ Message: 13 });

                if (typeof files.Avatar === 'undefined')
                {
                    DB.collection("account").insertOne({ GoogleID: PayLoad['sub'], Name: Name, Username: Username, Email: PayLoad['email'], Description: Description, Time: Time, Online: Time }, function(error3, result3)
                    {
                        if (error3)
                        {
                            Misc.Log(error3);
                            return res.json({ Message: -1 });
                        }

                        var Token = Auth.CreateToken(result3.insertedId);

                        DB.collection("account").updateOne({ _id: result3.insertedId }, { $push: { Session: { Name: Session, Token: Token, Time: Time } } });

                        res.json({ Message: 0, Token: Token, ID: result3.insertedId, Username: Username, Avatar: '' });
                    });
                }
                else
                {
                    Upload.BestServerID().then((ID) =>
                    {
                        Request.post({ url: Upload.ServerURL(ID) + "/UploadImage", formData: { Password: Upload.ServerToken(ID), FileImage: Fs.createReadStream(files.Avatar.path) } }, function(error2, httpResponse, body)
                        {
                            if (error2)
                            {
                                Misc.Log(error2);
                                return res.json({ Message: -6 });
                            }
                            
                            DB.collection("account").insertOne({ GoogleID: PayLoad['sub'], Name: Name, Username: Username, Email: PayLoad['email'], AvatarServer: ID, Avatar: JSON.parse(body).Path, Description: Description, Time: Time, Online: Time }, function(error3, result3)
                            {
                                if (error3)
                                {
                                    Misc.Log(error3);
                                    return res.json({ Message: -1 });
                                }

                                var Token = Auth.CreateToken(result3.insertedId);

                                DB.collection("account").updateOne({ _id: result3.insertedId }, { $push: { Session: { Name: Session, Token: Token, Time: Time } } });

                                res.json({ Message: 0, Token: Token, ID: result3.insertedId, Username: Username, Avatar: Upload.ServerURL(ID) + JSON.parse(body).Path });
                            });
                        });
                    })
                    .catch(function(e)
                    {
                        Misc.Log(e);
                        return res.json({ Message: -6 });
                    });
                }
            });
        });
    });
});

AuthRouter.post('/SignUpPhone', RateLimit(2, 60), function(req, res)
{
    var Code = req.body.Code;
    var Phone = req.body.Phone;

    if (typeof Code === 'undefined' || Code === '')
        return res.json({ Message: 1 });

    if (Code.length < 1)
        return res.json({ Message: 2 });

    if (Code.length > 3)
        return res.json({ Message: 3 });

    if (typeof Phone === 'undefined' || Phone === '')
        return res.json({ Message: 4 });

    if (Phone.length < 7)
        return res.json({ Message: 5 });

    if (Phone.length > 15)
        return res.json({ Message: 6 });

    while(Phone.charAt(0) === '0')
    {
        Phone = Phone.substr(1);
    }

    DB.collection("account").findOne({ $and: [ { Code: Code }, { Phone: Phone } ] }, { _id: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result !== null)
            return res.json({ Message: 7 });

        var Key = Misc.RandomNumber(5);

        DB.collection("register").insertOne({ Type: 0, Code: Code, Phone: Phone, Key: Key, Time: Misc.Time() }, function(error2)
        {
            if (error2)
            {
                Misc.Log(error2);
                return res.json({ Message: -1 });
            }

            var Message = 'کد تاییدیه شما در بیوگرام' + '\n\n' + Key + '\n\n' + 'Biogram.co';

            Request.post({ url: 'http://niksms.com/fa/PublicApi/GroupSms', form: { message: Message, numbers: (Code + Phone), yourMessageIds: Misc.Time(), senderNumber: '30006179', username: '09385454764', password: 'Salam123', sendType: 1, sendOn: null }}, function(error3)
            {
                if (error3)
                {
                    Misc.Log(error3);
                    return res.json({ Message: -6 });
                }

                res.json({ Message: 0 });
            });
        });
    });
});

AuthRouter.post('/SignInPhone', RateLimit(2, 60), function(req, res)
{
    var Code = req.body.Code;
    var Phone = req.body.Phone;

    if (typeof Code === 'undefined' || Code === '')
        return res.json({ Message: 1 });

    if (Code.length < 1)
        return res.json({ Message: 2 });

    if (Code.length > 3)
        return res.json({ Message: 3 });

    if (typeof Phone === 'undefined' || Phone === '')
        return res.json({ Message: 4 });

    if (Phone.length < 7)
        return res.json({ Message: 5 });

    if (Phone.length > 15)
        return res.json({ Message: 6 });

    while(Phone.charAt(0) === '0')
    {
        Phone = Phone.substr(1);
    }

    DB.collection("account").findOne({ $and: [ { Code: Code }, { Phone: Phone } ] }, { _id: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result === null)
            return res.json({ Message: 7 });

        var Key = Misc.RandomNumber(5);

        DB.collection("register").insertOne({ Type: 1, Code: Code, Phone: Phone, Key: Key, Time: Misc.Time() }, function(error2)
        {
            if (error2)
            {
                Misc.Log(error2);
                return res.json({ Message: -1 });
            }

            var Message = 'کد تاییدیه شما در بیوگرام' + '\n\n' + Key + '\n\n' + 'Biogram.co';

            Request.post({ url: 'http://niksms.com/fa/PublicApi/GroupSms', form: { message: Message, numbers: (Code + Phone), yourMessageIds: Misc.Time(), senderNumber: '30006179', username: '09385454764', password: 'Salam123', sendType: 1, sendOn: null }}, function(error3)
            {
                if (error3)
                {
                    Misc.Log(error3);
                    return res.json({ Message: -6 });
                }

                res.json({ Message: 0 });
            });
        });
    });
});

AuthRouter.post('/SignUpPhoneVerify', RateLimit(60, 60), function(req, res)
{
    var Code = req.body.Code;
    var Phone = req.body.Phone;
    var VerifyCode = req.body.VerifyCode;

    if (typeof Code === 'undefined' || Code === '')
        return res.json({ Message: 1 });

    if (Code.length < 1)
        return res.json({ Message: 2 });

    if (Code.length > 3)
        return res.json({ Message: 3 });

    if (typeof Phone === 'undefined' || Phone === '')
        return res.json({ Message: 4 });

    if (Phone.length < 7)
        return res.json({ Message: 5 });

    if (Phone.length > 15)
        return res.json({ Message: 6 });

    while (Phone.charAt(0) === '0')
    {
        Phone = Phone.substr(1);
    }

    if (typeof VerifyCode === 'undefined' || VerifyCode === '')
        return res.json({ Message: 7 });

    if (VerifyCode.length !== 5)
        return res.json({ Message: 8 });

    DB.collection("register").findOne({ $and: [ { Code: Code }, { Type: 0 }, { Phone: Phone }, { Key: VerifyCode } ] }, { _id: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result === null)
            return res.json({ Message: 9 });

        res.json({ Message: 0 })
    });
});

AuthRouter.post('/SignInPhoneVerify', RateLimit(60, 60), function(req, res)
{
    var Code = req.body.Code;
    var Phone = req.body.Phone;
    var VerifyCode = req.body.VerifyCode;

    if (typeof Code === 'undefined' || Code === '')
        return res.json({ Message: 1 });

    if (Code.length < 1)
        return res.json({ Message: 2 });

    if (Code.length > 3)
        return res.json({ Message: 3 });

    if (typeof Phone === 'undefined' || Phone === '')
        return res.json({ Message: 4 });

    if (Phone.length < 7)
        return res.json({ Message: 5 });

    if (Phone.length > 15)
        return res.json({ Message: 6 });

    while (Phone.charAt(0) === '0')
    {
        Phone = Phone.substr(1);
    }

    if (typeof VerifyCode === 'undefined' || VerifyCode === '')
        return res.json({ Message: 7 });

    if (VerifyCode.length !== 5)
        return res.json({ Message: 8 });

    DB.collection("register").findOne({ $and: [ { Code: Code }, { Type: 1 }, { Phone: Phone }, { Key: VerifyCode } ] }, { _id: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result === null)
            return res.json({ Message: 9 });

        DB.collection("account").findOne({ $and: [ { Code: Code }, { Phone: Phone } ] }, { _id: 1, Username: 1, Avatar: 1, AvatarServer: 1 }, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -1 });
            }

            if (result1 === null)
                return res.json({ Message: 10 });

            var Avatar = '';
            var Token = Auth.CreateToken(result1._id);

            if (typeof result1.AvatarServer !== 'undefined' && result1.AvatarServer !== null && typeof result1.Avatar !== 'undefined' && result1.Avatar !== null)
                Avatar = Upload.ServerURL(result1.AvatarServer) + result1.Avatar;

            var Session = req.body.Session;
            var IP = req.connection.remoteAddress;

            if (typeof Session === 'undefined' || Session === '')
                Session = "Unknown Session - " + IP;
            else
                Session = Session + " - " + IP;

            DB.collection("account").updateOne({ _id: result1._id }, { $push: { Session: { Name: Session, Token: Token, Time: Misc.Time() } } });

            res.json({ Message: 0, Token: Token, ID: result1._id, Username: result1.Username, Avatar: Avatar });
        });
    });
});

AuthRouter.post('/SignUpEmail', RateLimit(30, 60), function(req, res)
{
    var Username = req.body.Username;
    var Password = req.body.Password;
    var Email = req.body.Email;

    if (typeof Username === 'undefined' || Username === '')
        return res.json({ Message: 1 });

    if (Username.length < 3)
        return res.json({ Message: 2 });

    if (Username.length > 32)
        return res.json({ Message: 3 });

    Username = Username.toLowerCase();

    if (Username.search(CoreConfig.USERNAME_PATTERN) === -1)
        return res.json({ Message: 4 });

    if (typeof Password === 'undefined' || Password === '')
        return res.json({ Message: 5 });

    if (Password.length < 3)
        return res.json({ Message: 6 });

    if (Password.length > 32)
        return res.json({ Message: 7 });

    Password = Password.toLowerCase();

    if (typeof Email === 'undefined' || Email === '')
        return res.json({ Message: 8 });

    Email = Email.toLowerCase();

    if (Misc.IsValidEmail(Email))
        return res.json({ Message: 9 });

    DB.collection("account").findOne({ $or: [ { Email: Email }, { Username: Username } ] }, { _id: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result !== null)
            return res.json({ Message: 10 });

        BCrypt.hash(Password, 8, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -3 });
            }

            var Time = Misc.Time();
            var Key = Misc.RandomNumber(5);

            DB.collection("register").insertOne({ Username: Username, Password: result1, Type: 2, Email: Email, Key: Key, Time: Time }, function(error2, result2)
            {
                if (error2)
                {
                    Misc.Log(error2);
                    return res.json({ Message: -1 });
                }

                var To = Username + " <" + Email + ">";
                var Subject = "[Biogram] Please complete your registration";
                var Body = "<p>Welcome to biogram</p>" +
                           "<p>You can use the code within the 30 mins to complete your registration:</p>" +
                           "<p>" + Key + "</p>" +
                           "If you don't use this code within 30 mins, it will expire" +
                           "Thanks," +
                           "Your friends at Biogram";

                Misc.SendEmail(To, Subject, Body);

                res.json({ Message: 0 });
            });
        });
    });
});

AuthRouter.post('/SignUpEmailVerify', RateLimit(60, 60), function(req, res)
{
    var VerifyCode = req.body.VerifyCode;

    if (typeof VerifyCode === 'undefined' || VerifyCode === '')
        return res.json({ Message: 1 });

    if (VerifyCode.length !== 5)
        return res.json({ Message: 2 });

    DB.collection("register").findOne({ $and: [ { Type: 2 }, { Key: VerifyCode } ] }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result === null)
            return res.json({ Message: 3 });

        res.json({ Message: 0 })
    });
});

AuthRouter.post('/SignInEmail', RateLimit(30, 60), function(req, res)
{
    var EmailOrUsername = req.body.EmailOrUsername;
    var Password = req.body.Password;
    var Session = req.body.Session;

    if (typeof EmailOrUsername === 'undefined' || EmailOrUsername === '')
        return res.json({ Message: 1 });

    if (EmailOrUsername.length < 3)
        return res.json({ Message: 2 });

    if (EmailOrUsername.length > 64)
        return res.json({ Message: 3 });

    EmailOrUsername = EmailOrUsername.toLowerCase();

    if (typeof Password === 'undefined' || Password === '')
        return res.json({ Message: 4 });

    if (Password.length < 3)
        return res.json({ Message: 5 });

    if (Password.length > 32)
        return res.json({ Message: 6 });

    Password = Password.toLowerCase();

    if (Username.search(CoreConfig.USERNAME_PATTERN) === -1)
    {
        DB.collection("account").findOne({ Email: EmailOrUsername }, { _id: 1, Password: 1, Avatar: 1, AvatarServer: 1 }, function(error, result)
        {
            if (error)
            {
                Misc.Log(error);
                return res.json({ Message: -1 });
            }

            if (result === null)
                return res.json({ Message: 7 });

            var Hash = result.Password.replace('$2y$', '$2a$');

            BCrypt.compare(Password, Hash, function(error1, result1)
            {
                if (error1)
                {
                    Misc.Log(error1);
                    return res.json({ Message: -3 });
                }

                if (result1 === false)
                    return res.json({ Message: 8 });

                var Avatar = '';
                var IP = req.connection.remoteAddress;
                var Token = Auth.CreateToken(result._id);

                if (typeof Session === 'undefined' || Session === '')
                    Session = "Unknown Session - " + IP;
                else
                    Session = Session + " - " + IP;
                
                if (typeof result1.AvatarServer !== 'undefined' && result1.AvatarServer !== null && typeof result1.Avatar !== 'undefined' && result1.Avatar !== null)
                    Avatar = Upload.ServerURL(result1.AvatarServer) + result1.Avatar;

                DB.collection("account").updateOne({ _id: result._id }, { $push: { Session: { Name: Session, Token: Token, Time: Misc.Time() } } });

                res.json({ Message: 0, Token: Token, ID: result._id, Username: Username, Avatar: Avatar});
            });
        }); 
    }
    else
    {
        DB.collection("account").findOne({ Username: EmailOrUsername }, { _id: 1, Password: 1, Avatar: 1, AvatarServer: 1 }, function(error, result)
        {
            if (error)
            {
                Misc.Log(error);
                return res.json({ Message: -1 });
            }

            if (result === null)
                return res.json({ Message: 7 });

            var Hash = result.Password.replace('$2y$', '$2a$');

            BCrypt.compare(Password, Hash, function(error1, result1)
            {
                if (error1)
                {
                    Misc.Log(error1);
                    return res.json({ Message: -3 });
                }

                if (result1 === false)
                    return res.json({ Message: 8 });

                var Avatar = '';
                var IP = req.connection.remoteAddress;
                var Token = Auth.CreateToken(result._id);

                if (typeof Session === 'undefined' || Session === '')
                    Session = "Unknown Session - " + IP;
                else
                    Session = Session + " - " + IP;
                
                if (typeof result1.AvatarServer !== 'undefined' && result1.AvatarServer !== null && typeof result1.Avatar !== 'undefined' && result1.Avatar !== null)
                    Avatar = Upload.ServerURL(result1.AvatarServer) + result1.Avatar;

                DB.collection("account").updateOne({ _id: result._id }, { $push: { Session: { Name: Session, Token: Token, Time: Misc.Time() } } });

                res.json({ Message: 0, Token: Token, ID: result._id, Username: Username, Avatar: Avatar});
            });
        });
    }
});

AuthRouter.post('/ResetPassword', RateLimit(30, 60), function(req, res)
{
    var EmailOrUsername = req.body.EmailOrUsername;

    if (typeof EmailOrUsername === 'undefined' || EmailOrUsername === '')
        return res.json({ Message: 1 });

    EmailOrUsername = EmailOrUsername.toLowerCase();

    if (Misc.IsValidEmail(EmailOrUsername))
    {
        if (EmailOrUsername.search(CoreConfig.USERNAME_PATTERN) === -1)
            return res.json({ Message: 2 });

        DB.collection("account").findOne({ Username: EmailOrUsername }, { _id: 1, Email: 1 }, function(error, result)
        {
            if (error)
            {
                Misc.Log(error);
                return res.json({ Message: -1 });
            }

            if (result === null)
                return res.json({ Message: 3 });

            var RandomString = Misc.RandomString(25);

            DB.collection("recovery_password").insertOne({ ID: result._id, Username: EmailOrUsername, Email: result.Email, Key: RandomString, Time: Misc.Time() });

            var URL = "http://biogram.co/RecoveryPassword/" + RandomString;
            var To = EmailOrUsername + " <" + result.Email + ">";
            var Subject = "[Biogram] Please reset your password";
            var Body = "<p>We heard that you lost your GitHub password. Sorry about that!</p>" +
                       "<p>But don't worry! You can use the following link within the 3 hours to reset your password:</p>" +
                       "<p><a href='" + URL + "'>" + URL + "</a></p>" +
                       "<p>If you don't use this link within 3 hours, it will expire</p>" +
                       "<p>Thanks,</p>" +
                       "<p>Your friends at Biogram</p>";

            Misc.SendEmail(To, Subject, Body);

            res.json({ Message: 0 });
        });
    }
    else
    {
        DB.collection("account").findOne({ Email: EmailOrUsername }, { _id: 1, Username: 1 }, function(error, result)
        {
            if (error)
            {
                Misc.Log(error);
                return res.json({ Message: -1 });
            }

            if (result === null)
                return res.json({ Message: 3 });

            var RandomString = Misc.RandomString(25);

            DB.collection("recovery_password").insertOne({ ID: result._id, Username: result.Username, Email: EmailOrUsername, Key: RandomString, Time: Misc.Time() });

            var URL = "http://biogram.co/RecoveryPassword/" + RandomString;
            var To = result.Username + " <" + EmailOrUsername + ">";
            var Subject = "[Biogram] Please reset your password";
            var Body = "<p>We heard that you lost your GitHub password. Sorry about that!</p>" +
                "<p>But don't worry! You can use the following link within the 3 hours to reset your password:</p>" +
                "<p><a href='" + URL + "'>" + URL + "</a></p>" +
                "<p>If you don't use this link within 3 hours, it will expire</p>" +
                "<p>Thanks,</p>" +
                "<p>Your friends at Biogram</p>";

            Misc.SendEmail(To, Subject, Body);

            res.json({ Message: 0 });
        });
    }
});

AuthRouter.post('/SignUpPhoneFinish', RateLimit(30, 60), function(req, res)
{
    var Form = new Formidable.IncomingForm();
    Form.uploadDir = "./System/Storage/";
    Form.encoding = 'utf-8';
    Form.parse(req, function (error, fields, files)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -7 });
        }

        var Code = fields.Code;
        var Session = fields.Session;
        var Username = fields.Username;
        var Name = fields.Name;
        var Description = fields.Description;

        if (typeof Code === 'undefined' || Code === '')
            return res.json({ Message: 1 });
        
        if (typeof Username === 'undefined' || Username === '')
            return res.json({ Message: 2 });

        if (Username.length < 3)
            return res.json({ Message: 3 });

        if (Username.length > 32)
            return res.json({ Message: 4 });

        Username = Username.toLowerCase();

        if (Username.search(CoreConfig.USERNAME_PATTERN) === -1)
            return res.json({ Message: 5 });

        if (typeof Name === 'undefined' || Name === '')
            return res.json({ Message: 6 });

        if (Name.length < 2)
            return res.json({ Message: 7 });

        if (Name.length > 32)
            return res.json({ Message: 8 });

        Name = Name.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2694-\u2697]|\uD83E[\uDD10-\uDD5D])/g, '');

        DB.collection("register").findOne({ $and: [ { Type: 0 }, { Key: Code } ] }, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -1 });
            }

            if (result1 === null)
                return res.json({ Message: 9 });

            var Time = Misc.Time();
            var IP = req.connection.remoteAddress;

            if (typeof Session === 'undefined' || Session === '')
                Session = "Unknown Session - " + IP;
            else
                Session = Session + " - " + IP;

            DB.collection("account").findOne({ Username: Username }, { _id: 1 }, function(error2, result2)
            {
                if (error2)
                {
                    Misc.Log(error2);
                    return res.json({ Message: -1 });
                }

                if (result2 !== null)
                    return res.json({ Message: 10 });

                if (typeof files.Avatar === 'undefined')
                {
                    DB.collection("account").insertOne({ Code: result1.Code, Phone: result1.Phone, Name: Name, Username: Username, Description: Description, Time: Time, Online: Time }, function(error3, result3)
                    {
                        if (error3)
                        {
                            Misc.Log(error3);
                            return res.json({ Message: -1 });
                        }

                        var Token = Auth.CreateToken(result3.insertedId);

                        DB.collection("account").updateOne({ _id: result3.insertedId }, { $push: { Session: { Name: Session, Token: Token, Time: Time } } });

                        res.json({ Message: 0, Token: Token, ID: result3.insertedId, Username: Username, Avatar: '' });
                    });
                }
                else
                {
                    Upload.BestServerID().then((ID) =>
                    {
                        Request.post({ url: Upload.ServerURL(ID) + "/UploadImage", formData: { Password: Upload.ServerToken(ID), FileImage: Fs.createReadStream(files.Avatar.path) } }, function(error2, httpResponse, body)
                        {
                            if (error2)
                            {
                                Misc.Log(error2);
                                return res.json({ Message: -6 });
                            }

                            DB.collection("account").insertOne({ Code: result1.Code, Phone: result1.Phone, Name: Name, Username: Username, AvatarServer: ID, Avatar: JSON.parse(body).Path, Description: Description, Time: Time, Online: Time }, function(error3, result3)
                            {
                                if (error3)
                                {
                                    Misc.Log(error3);
                                    return res.json({ Message: -1 });
                                }

                                var Token = Auth.CreateToken(result3.insertedId);

                                DB.collection("account").updateOne({ _id: result3.insertedId }, { $push: { Session: { Name: Session, Token: Token, Time: Time } } });

                                res.json({ Message: 0, Token: Token, ID: result3.insertedId, Username: Username, Avatar: Upload.ServerURL(ID) + JSON.parse(body).Path });
                            });
                        });
                    })
                    .catch(function(e)
                    {
                        Misc.Log(e);
                        return res.json({ Message: -6 });
                    });
                }
            });
        });
    });
});

AuthRouter.post('/SignUpEmailFinish', RateLimit(30, 60), function(req, res)
{
    var Form = new Formidable.IncomingForm();
    Form.uploadDir = "./System/Storage/";
    Form.encoding = 'utf-8';
    Form.parse(req, function (error, fields, files)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -7 });
        }

        var Code = fields.Code;
        var Session = fields.Session;
        var Name = fields.Name;
        var Description = fields.Description;

        if (typeof Code === 'undefined' || Code === '')
            return res.json({ Message: 1 });

        if (typeof Name === 'undefined' || Name === '')
            return res.json({ Message: 6 });

        if (Name.length < 2)
            return res.json({ Message: 7 });

        if (Name.length > 32)
            return res.json({ Message: 8 });

        Name = Name.replace(/([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2694-\u2697]|\uD83E[\uDD10-\uDD5D])/g, '');

        DB.collection("register").findOne({ $and: [ { Type: 2 }, { Key: Code } ] }, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -1 });
            }

            if (result1 === null)
                return res.json({ Message: 9 });

            var Time = Misc.Time();
            var Username = result1.Username;
            var IP = req.connection.remoteAddress;

            if (typeof Session === 'undefined' || Session === '')
                Session = "Unknown Session - " + IP;
            else
                Session = Session + " - " + IP;

            if (typeof Username === 'undefined' || Username === '')
                return res.json({ Message: 2 });

            if (Username.length < 3)
                return res.json({ Message: 3 });

            if (Username.length > 32)
                return res.json({ Message: 4 });

            Username = Username.toLowerCase();

            if (Username.search(CoreConfig.USERNAME_PATTERN) === -1)
                return res.json({ Message: 5 });

            DB.collection("account").findOne({ Username: Username }, { _id: 1 }, function(error2, result2)
            {
                if (error2)
                {
                    Misc.Log(error2);
                    return res.json({ Message: -1 });
                }

                if (result2 !== null)
                    return res.json({ Message: 10 });

                if (typeof files.Avatar === 'undefined')
                {
                    DB.collection("account").insertOne({ Email: result1.Email, Name: Name, Username: Username, Description: Description, Time: Time, Online: Time }, function(error3, result3)
                    {
                        if (error3)
                        {
                            Misc.Log(error3);
                            return res.json({ Message: -1 });
                        }

                        var Token = Auth.CreateToken(result3.insertedId);

                        DB.collection("account").updateOne({ _id: result3.insertedId }, { $push: { Session: { Name: Session, Token: Token, Time: Time } } });

                        res.json({ Message: 0, Token: Token, ID: result3.insertedId, Username: Username, Avatar: '' });
                    });
                }
                else
                {
                    Upload.BestServerID().then((ID) =>
                    {
                        Request.post({ url: Upload.ServerURL(ID) + "/UploadImage", formData: { Password: Upload.ServerToken(ID), FileImage: Fs.createReadStream(files.Avatar.path) } }, function(error2, httpResponse, body)
                        {
                            if (error2)
                            {
                                Misc.Log(error2);
                                return res.json({ Message: -6 });
                            }

                            DB.collection("account").insertOne({ Email: result1.Email, Name: Name, Username: Username, AvatarServer: ID, Avatar: JSON.parse(body).Path, Description: Description, Time: Time, Online: Time }, function(error3, result3)
                            {
                                if (error3)
                                {
                                    Misc.Log(error3);
                                    return res.json({ Message: -1 });
                                }

                                var Token = Auth.CreateToken(result3.insertedId);

                                DB.collection("account").updateOne({ _id: result3.insertedId }, { $push: { Session: { Name: Session, Token: Token, Time: Time } } });

                                res.json({ Message: 0, Token: Token, ID: result3.insertedId, Username: Username, Avatar: Upload.ServerURL(ID) + JSON.parse(body).Path });
                            });
                        });
                    })
                    .catch(function(e)
                    {
                        Misc.Log(e);
                        return res.json({ Message: -6 });
                    });
                }
            });
        });
    });
});

/*AuthRouter.get('/RecoveryPassword/:Key', RateLimit(30, 60), function(req, res)
{
    var Key = req.params.Key;

    if (typeof Key === 'undefined' || Token === '')
        return res.json({ Message: 1 });

    DB.collection("recovery_password").findOne({ Key: Key }, { _id: 0, ID: 1, Username: 1, Email: 1, Key: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result === null)
            return res.json({ Message: 2 });

        if (result.Key !== Key)
            return res.json({ Message: 3 });

        var Password = Misc.RandomString(5);

        BCrypt.hash(Password, 8, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -3 });
            }

            DB.collection("account").updateOne({ _id: result.ID }, { $set: { Password: result1 } });

            var To = result.Username + " <" + result.Email + ">";
            var Subject = "[Biogram] your new password"; // TODO Reset Text
            var Body = "<p>We heard that you lost your GitHub password. Sorry about that!</p>" +
                "<p>But don't worry! You can use the following link within the 3 hours to reset your password:</p>" +
                "Password: " + Password +
                "If you don't use this link within 3 hours, it will expire" +
                "Thanks," +
                "Your friends at Biogram";

            Misc.SendEmail(To, Subject, Body);

            res.json({ Message: 0 });
        });
    });
});

AuthRouter.post('/ChangePassword', Auth(), RateLimit(30, 60), function(req, res)
{
    var PasswordOld = req.body.PasswordOld;
    var PasswordNew = req.body.PasswordNew;

    if (typeof PasswordOld === 'undefined' || PasswordOld === '')
        return res.json({ Message: 1 });

    if (PasswordOld.length < 3)
        return res.json({ Message: 2 });

    if (PasswordOld.length > 32)
        return res.json({ Message: 3 });

    PasswordOld = PasswordOld.toLowerCase();

    if (typeof PasswordNew === 'undefined' || PasswordNew === '')
        return res.json({ Message: 4 });

    if (PasswordNew.length < 3)
        return res.json({ Message: 5 });

    if (PasswordNew.length > 32)
        return res.json({ Message: 6 });

    PasswordNew = PasswordNew.toLowerCase();

    DB.collection("account").findOne({ _id: res.locals.ID }, { _id: 0, Password: 1 }, function(error, result)
    {
        if (error)
        {
            Misc.Log(error);
            return res.json({ Message: -1 });
        }

        if (result === null)
            return res.json({ Message: 7 });

        var Hash = result.Password.replace('$2y$', '$2a$');

        BCrypt.compare(PasswordOld, Hash, function(error1, result1)
        {
            if (error1)
            {
                Misc.Log(error1);
                return res.json({ Message: -3 });
            }

            if (result1 === false)
                return res.json({ Message: 8 });

            BCrypt.hash(PasswordNew, 8, function(error2, result2)
            {
                if (error2)
                {
                    Misc.Log(error2);
                    return res.json({ Message: -3 });
                }

                DB.collection("account").updateOne({ _id: res.locals.ID }, { $set: { Password: result2 } });

                res.json({ Message: 0 });
            });
        });
    });
});*/

module.exports = AuthRouter;
