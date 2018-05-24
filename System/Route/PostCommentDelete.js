const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostCommentDelete', Auth(), RateLimit(30, 60), async function(req, res)
{
    const CommentID = MongoID(req.body.CommentID);

    if (Misc.IsUndefined(CommentID))
        return res.json({ Message: 1 });

    const Comment = await DB.collection("post_comment").aggregate([ { $match: { $and: [ { _id: CommentID }, { Delete: { $not: { $gt: 0 } } } ] } }, { $project: { Post: 1, Owner: 1 } } ]).toArray();

    if (Misc.IsUndefined(Comment[0]))
        return res.json({ Message: 2 });

    const Owner = res.locals.ID;

    if (Comment[0].Owner.equals(Owner))
        DB.collection("post_comment").updateOne({ _id: CommentID }, { $set: { Delete: Misc.Time() } } );
    else
    {
        const Post = await DB.collection("post").aggregate([ { $match: { $and: [ { _id: Comment[0].Post }, { Owner: Owner } ] } }, { $project: { _id: 1 } } ]).toArray();

        if (!Misc.IsUndefined(Post[0]))
            DB.collection("post_comment").updateOne({ _id: CommentID }, { $set: { Delete: Misc.Time() } } );
    }

    res.json({ Message: 0 });
});

module.exports = PostRouter;
