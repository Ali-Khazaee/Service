const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostLike', Auth(), RateLimit(30, 60), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    const Post = await DB.collection("post").aggregate([ { $match: { _id: PostID } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Post[0]))
        return res.json({ Message: 2 });

    const Owner = res.locals.ID;
    const Like = await DB.collection("post_like").aggregate([ { $match: { $and: [ { Post: PostID }, { Owner: Owner } ] } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Like[0]))
    {
        DB.collection("post_like").insertOne({ Owner: Owner, Post: PostID, Time: Misc.Time() });

        // TODO Add Notification
    }
    else
    {
        DB.collection("post_like").deleteOne({ _id: Like[0]._id });

        // TODO Add Notification
    }

    res.json({ Message: 0 });
});

module.exports = PostRouter;
