const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Upload     = require('../Handler/Upload');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostDeleteCheck', Auth(), RateLimit(30, 60), async function(req, res)
{
    let ListID = req.body.List;

    if (Misc.IsUndefined(ListID))
        return res.json({ Message: 0 });

    const PostID = [], Result = [];

    for (const I of ListID.split(",")) { PostID.push(I); }

    for (const ID of PostID)
    {
        const IsDeleted = await DB.collection("post").aggregate([ { $match: { $and: [ { Post: PostID }, { Delete: { $gt: 0 } } ] } }, { $project: { _id: 1 } } ]).toArray();

        if (!Misc.IsUndefined(IsDeleted[0]))
            Result.push({ ID: ID });
    }

    res.json({ Message: 0, Result: Result });
});

module.exports = PostRouter;
