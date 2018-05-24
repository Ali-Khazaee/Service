const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostReport', Auth(), RateLimit(30, 60), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    const Reason = req.body.Reason;

    if (Misc.IsUndefined(Reason) || Reason.length < 10)
        return res.json({ Message: 2 });

    const Post = await DB.collection("post").aggregate([ { $match: { _id: PostID } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Post[0]))
        return res.json({ Message: 3 });

    DB.collection("post_report").insertOne({ Owner: res.locals.ID, Post: PostID, Time: Misc.Time(), Reason: Reason });

    res.json({ Message: 0 });
});

module.exports = PostRouter;
