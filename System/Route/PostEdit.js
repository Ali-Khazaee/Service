const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostEdit', Auth(), RateLimit(60, 1800), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    const Post = await DB.collection("post").aggregate([ { $match: { $and: [ { _id: PostID }, { Owner: res.locals.ID }, { Delete: { $not: { $gt: 0 } } } ] } }, { $project: { _id: 1, Type: 1, Time: 1 } } ]).toArray();

    if (Misc.IsUndefined(Post[0]))
        return res.json({ Message: 2 });

    if ((Post[0].Time + 172800) < Misc.Time())
        return res.json({ Message: 3 });

    let Message = req.body.Message;

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

    if (Post[0].Type === 0 && ResultMessage.length < 30)
        return res.json({ Message: 4 });

    DB.collection("post").updateOne({ _id: PostID }, { $set: { Message: ResultMessage, EditTime: Misc.Time() } } );

    res.json({ Message: 0, Text: ResultMessage });
});

module.exports = PostRouter;
