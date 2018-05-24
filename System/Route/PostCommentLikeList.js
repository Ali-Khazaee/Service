const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Upload     = require('../Handler/Upload');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostCommentLikeList', Auth(), RateLimit(30, 60), async function(req, res)
{
    const CommentID = MongoID(req.body.CommentID);

    if (Misc.IsUndefined(CommentID))
        return res.json({ Message: 1 });

    let Skip = parseInt(req.body.Skip);

    if (Misc.IsUndefined(Skip))
        Skip = 0;

    const Result = [];
    const PersonList = await DB.collection("post_comment_like").aggregate([ { $match: { Comment: CommentID } },
        { $sort: { Time: -1 } },
        { $skip: Skip },
        { $lookup: { from: "account", localField: "Owner", foreignField: "_id", as: "Data" } },
        { $unwind: "$Data" },
        { $project: { _id: 0, "Data._id": 1, "Data.Username": 1, "Data.Name": 1, "Data.Avatar": 1, "Data.AvatarServer": 1 } },
        { $group: { _id: { ID: "$Data._id", Username: "$Data.Username", Name: "$Data.Name", Avatar: "$Data.Avatar", Server: "$Data.AvatarServer" } } },
        { $limit: 10 } ]).toArray();

    for (const Person of PersonList)
    {
        let Profile = "";

        if (!Misc.IsUndefined(Person._id.Avatar))
            Profile = Upload.ServerURL(Person._id.Server) + Person._id.Avatar;

        const Follow = await DB.collection("follow").find({ $and: [ { Owner: res.locals.ID }, { Follow: Person._id.ID } ] }).count();

        Result.push({ ID: Person._id.ID, Username: Person._id.Username, Name: Person._id.Name, Avatar: Profile, Follow: Follow !== 0 });
    }

    res.json({ Message: 0, Result: Result });
});

module.exports = PostRouter;
