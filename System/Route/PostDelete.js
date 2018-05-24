const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostDelete', Auth(), RateLimit(30, 60), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    const Post = await DB.collection("post").aggregate([ { $match: { $and: [ { _id: PostID }, { Owner: res.locals.ID }, { Delete: { $not: { $gt: 0 } } } ] } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Post[0]))
        return res.json({ Message: 2 });

    DB.collection("post").updateOne({ _id: PostID }, { $set: { Delete: Misc.Time() } } );

    res.json({ Message: 0 });
});

module.exports = PostRouter;
