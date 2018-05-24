const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostCommentLike', Auth(), RateLimit(30, 60), async function(req, res)
{
    const CommentID = MongoID(req.body.CommentID);

    if (Misc.IsUndefined(CommentID))
        return res.json({ Message: 1 });

    const Comment = await DB.collection("post_comment").aggregate([ { $match: { $and: [ { _id: CommentID }, { Delete: { $not: { $gt: 0 } } } ] } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Comment[0]))
        return res.json({ Message: 2 });

    const Owner = res.locals.ID;
    const Like = await DB.collection("post_comment_like").aggregate([ { $match: { $and: [ { Comment: CommentID }, { Owner: Owner } ] } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Like[0]))
    {
        DB.collection("post_comment_like").insertOne({ Owner: Owner, Comment: CommentID, Time: Misc.Time() });

        // TODO Add Notification
    }
    else
    {
        DB.collection("post_comment_like").deleteOne({ _id: Like[0]._id });

        // TODO Add Notification
    }

    res.json({ Message: 0 });
});

module.exports = PostRouter;
