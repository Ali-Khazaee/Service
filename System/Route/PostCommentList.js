const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Upload     = require('../Handler/Upload');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostCommentList', Auth(), RateLimit(30, 60), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    let Skip = parseInt(req.body.Skip);

    if (Misc.IsUndefined(Skip))
        Skip = 0;

    const Result = [];
    const PersonList = await DB.collection("post_comment").aggregate([ { $match: { $and: [ { Post: PostID }, { Delete: { $not: { $gt: 0 } } } ] } },
        { $sort: { Time: 1 } },
        { $skip: Skip },
        { $lookup: { from: "account", localField: "Owner", foreignField: "_id", as: "Data" } },
        { $unwind: "$Data" },
        { $project: { _id: 1, Owner: 1, Message: 1, Time: 1, "Data._id": 1, "Data.Username": 1, "Data.Name": 1, "Data.Avatar": 1, "Data.AvatarServer": 1 } },
        { $group: { _id: { ID: "$_id", Owner: "$Owner", Message: "$Message", Time: "$Time", Username: "$Data.Username", Avatar: "$Data.Avatar", Server: "$Data.AvatarServer" } } },
        { $limit: 8 } ]).toArray();

    for (const Person of PersonList)
    {
        let Avatar = "";

        if (!Misc.IsUndefined(Person._id.Avatar))
            Avatar = Upload.ServerURL(Person._id.Server) + Person._id.Avatar;

        const Count = await DB.collection("post_comment_like").find({ Comment: Person._id.ID }).count();
        const IsLike = await DB.collection("post_comment_like").find({ $and: [ { Comment: Person._id.ID }, { Owner: res.locals.ID } ] }).count();

        Result.push({ ID: Person._id.ID, Message: Person._id.Message, Owner: Person._id.Owner, Time: Person._id.Time, Count: Count, Like: IsLike !== 0, Username: Person._id.Username, Avatar: Avatar });
    }

    res.json({ Message: 0, Result: Result });
});

module.exports = PostRouter;
