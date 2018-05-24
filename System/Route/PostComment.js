const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostComment', Auth(), RateLimit(30, 60), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    const Post = await DB.collection("post").aggregate([ { $match: { _id: PostID } }, { $project: { Owner: 1 } } ]).toArray();

    if (Misc.IsUndefined(Post[0]))
        return res.json({ Message: 2 });

    const Message = req.body.Message;

    if (Misc.IsUndefined(Message))
        return res.json({ Message: 3 });

    const Owner = res.locals.ID;
    const Result = await DB.collection("post_comment").insertOne({ Post: PostID, Owner: Owner, Message: Message, Time: Misc.Time() });

    if (!Owner.equals(Post[0].Owner))
    {
        // TODO Add Notification
    }

    res.json({ Message: 0, ID: Result.insertedId });
});

module.exports = PostRouter;
