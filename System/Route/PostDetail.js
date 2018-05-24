const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Upload     = require('../Handler/Upload');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/PostDetail', Auth(), RateLimit(60, 60), async function(req, res)
{
    const PostID = MongoID(req.body.PostID);

    if (Misc.IsUndefined(PostID))
        return res.json({ Message: 1 });

    const Post = await DB.collection("post").aggregate([ { $match: { _id: PostID } } ]).toArray();

    if (Misc.IsUndefined(Post[0]))
        return res.json({ Message: 2 });

    const Owner = res.locals.ID;
    const Account = await DB.collection("account").aggregate([{ $match: { _id: Post[0].Owner } }, { $project: { _id: 0, Name: 1, Medal: 1, Username: 1, Avatar: 1, AvatarServer: 1 } } ]).toArray();
    const IsLike = await DB.collection("post_like").find({ $and: [ { Owner: Owner }, { Post: Post[0]._id } ] }).count();
    const IsFollow = await DB.collection("follow").find({ $and: [ { Owner: Owner }, { Follow: Post[0].Owner } ] }).count();
    const IsBookmark = await DB.collection("post_bookmark").find({ $and: [ { Owner: Owner }, { Post: Post[0]._id } ] }).count();
    const LikeCount = await DB.collection("post_like").find({ Post: Post[0]._id }).count();
    const CommentCount = await DB.collection("post_comment").find({ $and: [ { Post: Post[0]._id }, { Delete: { $not: { $gt: 0 } } } ] }).count();
    const Avatar = (Misc.IsUndefined(Account[0]) || Misc.IsUndefined(Account[0].Avatar)) ? '' : Upload.ServerURL(Account[0].AvatarServer) + Account[0].Avatar;

    if (Post[0].Type === 3)
    {
        const Vote = await DB.collection("post_vote").aggregate([{ $match: { $and: [ { Owner: Owner }, { Post: Post[0]._id } ] } }, { $project: { _id: 0, Vote: 1 } } ]).toArray();

        if (!Misc.IsUndefined(Vote[0]) || Post[0].Data.Time < Misc.Time())
        {
            const Count1 = await DB.collection("post_vote").find({ $and: [ { Vote: "1" }, { Post: Post[0]._id } ] }).count();
            const Count2 = await DB.collection("post_vote").find({ $and: [ { Vote: "2" }, { Post: Post[0]._id } ] }).count();
            const Count3 = await DB.collection("post_vote").find({ $and: [ { Vote: "3" }, { Post: Post[0]._id } ] }).count();
            const Count4 = await DB.collection("post_vote").find({ $and: [ { Vote: "4" }, { Post: Post[0]._id } ] }).count();
            const Count5 = await DB.collection("post_vote").find({ $and: [ { Vote: "5" }, { Post: Post[0]._id } ] }).count();

            Post[0].Data.Vote = Misc.IsUndefined(Vote[0]) ? 0 : Vote[0].Vote;
            Post[0].Data.Count1 = Count1;
            Post[0].Data.Count2 = Count2;
            Post[0].Data.Count3 = Count3;
            Post[0].Data.Count4 = Count4;
            Post[0].Data.Count5 = Count5;
        }
    }

    if (!Misc.IsUndefined(Post[0].Server))
    {
        let Server = Upload.ServerURL(Post[0].Server);

        if (Post[0].Type === 2 || Post[0].Type === 4)
            Post[0].Data.URL = Server + Post[0].Data.URL;

        if (Post[0].Type === 1)
            Post[0].Data.forEach(function(c, i) { Post[0].Data[i] = Server + c; });
    }

    const NewPost = { Result: 0, ID: Post[0]._id, Profile: Avatar, Name: Account[0].Name, Medal: Account[0].Medal, Username: Account[0].Username,
        Time: Post[0].Time, Message: Post[0].Message, Type: Post[0].Type, Data: Post[0].Data, Owner: Post[0].Owner,
        View: Post[0].View, Category: Post[0].Category, LikeCount: LikeCount, CommentCount: CommentCount, Like: IsLike,
        Follow: IsFollow, Comment: Post[0].Comment, Bookmark: IsBookmark };

    const PersonList = await DB.collection("post_like").aggregate([ { $match: { Post: Post[0]._id } },
        { $sort: { Time: -1 } },
        { $lookup: { from: "account", localField: "Owner", foreignField: "_id", as: "Data" } },
        { $unwind: "$Data" },
        { $project: { _id: 0, "Data._id": 1, "Data.Avatar": 1, "Data.AvatarServer": 1 } },
        { $group: { _id: { ID: "$Data._id", Avatar: "$Data.Avatar", Server: "$Data.AvatarServer" } } },
        { $limit: 10 } ]).toArray();

    let PersonCount = 0;

    for (const Person of PersonList)
    {
        if (PersonCount > 3 || Misc.IsUndefined(Person._id.Avatar) || Post[0].Owner.equals(Person._id.ID))
            continue;

        const Profile = Upload.ServerURL(Person._id.Server) + Person._id.Avatar;

        switch (PersonCount)
        {
            case 0: NewPost.I1 = Person._id.ID; NewPost.I1P = Profile; break;
            case 1: NewPost.I2 = Person._id.ID; NewPost.I2P = Profile; break;
            case 2: NewPost.I3 = Person._id.ID; NewPost.I3P = Profile; break;
            case 3: NewPost.I4 = Person._id.ID; NewPost.I4P = Profile; break;
        }

        PersonCount++;
    }

    res.json(NewPost);
});

module.exports = PostRouter;
