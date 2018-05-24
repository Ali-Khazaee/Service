const PostRouter = require('express').Router();
const Formidable = require('formidable');
const RateLimit  = require('../Handler/RateLimit');
const Upload     = require('../Handler/Upload');
const Auth       = require('../Handler/Auth');
const Post       = require('../Handler/Post');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostWrite', Auth(), RateLimit(60, 1800), function(req, res)
{
    const Form = new Formidable.IncomingForm();
    Form.uploadDir = "./System/Storage/Temp/";
    Form.encoding = 'utf-8';
    Form.parse(req, async function (error, fields, files)
    {
        if (error)
        {
            Misc.Log("[PostWrite]: " + error);
            return res.json({ Message: -7 });
        }

        let Message = fields.Message;
        let Category = fields.Category;
        const Type = parseInt(fields.Type);
        const Vote = fields.Vote;
        const World = fields.World;

        if (Misc.IsUndefined(Type) ||  Type > 4 || Type < 0)
            return res.json({ Message: 1 });

        if (Type === 0 && (Misc.IsUndefined(Message) || Message.length < 30))
            return res.json({ Message: 2 });

        if (Misc.IsUndefined(Category) || Category > 22 || Category < 1)
            Category = 100;

        if (!Misc.IsUndefined(Message) && Message.length > 300)
            Message = Message.substr(0, 300);

        let NewLine = 0;
        let ResultMessage = "";

        for (let I = 0; I < Message.length; I++)
        {
            if (Message.charCodeAt(I) === 10)
                NewLine++;

            if (NewLine > 4 && Message.charCodeAt(I) === 10)
                continue;

            ResultMessage += Message[I];
        }

        const Data = [];
        const ServerID = await Upload.BestServerID();
        const ServerURL = Upload.ServerURL(ServerID);
        const ServerPass = Upload.ServerToken(ServerID);

        switch (Type)
        {
            case 1:
            {
                if (files.Image1 === undefined || files.Image1 === null || files.Image1.size > 6291456)
                    return res.json({ Message: 3 });

                Data.push(await Post.UploadImage(ServerURL, ServerPass, files.Image1));

                if (files.Image2 !== undefined && files.Image2 !== null && files.Image2.size < 6291456)
                    Data.push(await Post.UploadImage(ServerURL, ServerPass, files.Image2));

                if (files.Image3 !== undefined && files.Image3 !== null && files.Image3.size < 6291456)
                    Data.push(await Post.UploadImage(ServerURL, ServerPass, files.Image3));
            }
                break;
            case 2:
                if (files.Video === undefined || files.Video === null)
                    return res.json({ Message: 3 });

                Data.push(await Post.UploadVideo(ServerURL, ServerPass, files.Video));
                break;
            case 3:
                try
                {
                    let OldVote = JSON.parse(Vote);

                    if (Misc.IsUndefined(OldVote.Vote1) || Misc.IsUndefined(OldVote.Vote2) || Misc.IsUndefined(OldVote.Time) || OldVote.Time < Misc.Time())
                        return res.json({ Message: 3 });

                    let NewVote = { Vote1: OldVote.Vote1, Vote2: OldVote.Vote2 };

                    if (!Misc.IsUndefined(OldVote.Vote3))
                        NewVote.Vote3 = OldVote.Vote3;

                    if (!Misc.IsUndefined(OldVote.Vote4))
                        NewVote.Vote4 = OldVote.Vote4;

                    if (!Misc.IsUndefined(OldVote.Vote5))
                        NewVote.Vote5 = OldVote.Vote5;

                    NewVote.Time = OldVote.Time;

                    Data.push(NewVote);
                }
                catch (e)
                {
                    Misc.Log("[PostWrite-2]: " + e);
                    return res.json({ Message: 3 });
                }
                break;
            case 4:
                if (files.File === undefined || files.File === null)
                    return res.json({ Message: 3 });

                Data.push(await Post.UploadFile(ServerURL, ServerPass, files.File));
                break;
        }

        const Owner = res.locals.ID;
        const Result = { Owner: Owner, World: World, Category: Category, Type: Type, Time: Misc.Time() };

        if (Type === 1 || Type === 2 || Type === 4)
            Result.Server = ServerID;

        if (ResultMessage.length > 0)
            Result.Message = ResultMessage;

        Result.Data = (Type === 1) ? Data : Data[0];

        await DB.collection("post").insertOne(Result);

        if (ResultMessage.length > 0)
        {
            const AccountList = ResultMessage.match(/@(\w+)/gi);

            if (!Misc.IsUndefined(AccountList))
            {
                for (let I = 0; I < AccountList.length; I++)
                {
                    const Account = await DB.collection("account").aggregate([ { $match: { Username: AccountList[I] } }, { $project: { _id: 1 } } ]).toArray();

                    if (Misc.IsUndefined(Account[0]) || Owner.equals(Account[0]._id))
                        continue;

                    // TODO Add Notification
                }
            }

            const TagList = ResultMessage.match(/#(\w+)/ugi);

            if (!Misc.IsUndefined(TagList))
            {
                for (let I = 0; I < TagList.length; I++)
                {
                    const Tag = TagList[I].toLowerCase().slice(1);

                    DB.collection("tag").updateOne({ Tag: Tag }, { $set: { Tag: Tag } }, { upsert: true });
                }
            }
        }

        if (!Misc.IsUndefined(Result.Server))
        {
            if (Result.Type === 2 || Result.Type === 4)
                Result.Data.URL = ServerURL + Result.Data.URL;

            if (Result.Type === 1)
                Result.Data.forEach(function(c, i) { Result.Data[i] = ServerURL + c; });
        }

        res.json({ Message: 0, Result: Result });
    });
});

module.exports = PostRouter;
