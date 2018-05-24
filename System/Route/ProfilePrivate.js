const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Upload     = require('../Handler/Upload');
const Misc       = require('../Handler/Misc');

PostRouter.post('/ProfilePrivate', Auth(), RateLimit(60, 60), async function(req, res)
{
    const ID = res.locals.ID;
    const Account = await DB.collection("account").aggregate([ { $match: { _id: ID } }, { $project: { _id: 0, Name: 1, Username: 1, Type: 1, Avatar: 1, AvatarServer: 1, Level: 1, Cash: 1, About: 1, Link: 1 } } ]).toArray();
    const Location = await DB.collection("location").aggregate([ { $match: { $and: [ { Owner: ID }, { Type: 1 } ] } }, { $project: { _id: 0, Name: 1, Latitude: 1, Longitude: 1 } } ]).toArray();
    const Badge = await DB.collection("badge").aggregate([ { $match: { $and: [ { Owner: ID }, { Type: 1 } ] } }, { $project: { _id: 0, Link: 1 } } ]).toArray();
    const ProfileCount = await DB.collection("account_view").find({ Account: ID }).count();
    const FollowingCount = await DB.collection("follow").find({ Owner: ID }).count();
    const FollowerCount = await DB.collection("follow").find({ Follow: ID }).count();
    const PostCount = await DB.collection("post").find({ Owner: ID }).count();
    const RatingTotal = await DB.collection("rating").find({ Owner: ID }).count();
    const Rating1 = await DB.collection("rating").find({ $and: [ { Owner: ID }, { Rating: 1 } ] }).count();
    const Rating2 = await DB.collection("rating").find({ $and: [ { Owner: ID }, { Rating: 2 } ] }).count();
    const Rating3 = await DB.collection("rating").find({ $and: [ { Owner: ID }, { Rating: 3 } ] }).count();
    const Rating4 = await DB.collection("rating").find({ $and: [ { Owner: ID }, { Rating: 4 } ] }).count();
    const Rating5 = await DB.collection("rating").find({ $and: [ { Owner: ID }, { Rating: 5 } ] }).count();
    const Star = ((Rating5 * 5) + (Rating4 * 4) + (Rating3 * 3) + (Rating2 * 2) + Rating1) / RatingTotal;

    let Profile = "";

    if (!Misc.IsUndefined(Account[0].Avatar))
        Profile = Upload.ServerURL(Account[0].Server) + Account[0].Avatar;

    const Result = { Message: 0, Profile: Profile, Name: Account[0].Name, Username: Account[0].Username, ProfileCount: ProfileCount, Following: FollowingCount, Follower: FollowerCount, Post: PostCount, Rating: RatingTotal, Star: Star };

    if (!Misc.IsUndefined(Account[0]) && !Misc.IsUndefined(Account[0].Type))
        Result.Type = Account[0].Type;

    if (!Misc.IsUndefined(Account[0]) && !Misc.IsUndefined(Account[0].Link))
        Result.Link = Account[0].Link;

    if (!Misc.IsUndefined(Account[0]) && !Misc.IsUndefined(Account[0].Level))
        Result.Level = Account[0].Level;

    if (!Misc.IsUndefined(Account[0]) && !Misc.IsUndefined(Account[0].Cash))
        Result.Cash = Account[0].Cash;

    if (!Misc.IsUndefined(Account[0]) && !Misc.IsUndefined(Account[0].About))
        Result.About = Account[0].About;

    if (!Misc.IsUndefined(Location[0]) && !Misc.IsUndefined(Location[0].Name))
        Result.Location = Location[0].Name;

    if (!Misc.IsUndefined(Location[0]) && !Misc.IsUndefined(Location[0].Latitude))
        Result.Latitude = Location[0].Latitude;

    if (!Misc.IsUndefined(Location[0]) && !Misc.IsUndefined(Location[0].Longitude))
        Result.Longitude = Location[0].Longitude;

    if (!Misc.IsUndefined(Badge[0]) && !Misc.IsUndefined(Badge[0].Link))
        Result.Badge = Badge[0].Link;

    res.json(Result);
});

module.exports = PostRouter;
