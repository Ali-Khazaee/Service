const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/ProfileBlock', Auth(), RateLimit(30, 60), async function(req, res)
{
    let Username = req.body.Username;

    if (Misc.IsUndefined(Username))
        return res.json({ Message: 1 });

    Username = Username.toLowerCase();

    const Account = await DB.collection("account").aggregate([ { $match: { Username: Username } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Account[0]))
        return res.json({ Message: 2 });

    const Owner = res.locals.ID;

    if (Owner.equals(Account[0]._id))
        return res.json({ Message: 3 });

    DB.collection("block").insertOne({ Owner: Owner, Target: Account[0]._id, Time: Misc.Time() });
    DB.collection("follow").deleteMany({ $or: [ { $and: [ { Owner: Owner }, { Follow: Account[0]._id } ] }, { $and: [ { Owner: Account[0]._id }, { Follow: Owner } ] } ] });

    res.json({ Message: 0 });
});

module.exports = PostRouter;
