const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/ProfileFollow', Auth(), RateLimit(30, 60), async function(req, res)
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

    if (await Misc.IsBlock(Account[0]._id, Owner) || await Misc.IsBlock(Owner, Account[0]._id))
        return res.json({ Message: 4 });

    const Follow = await DB.collection("follow").aggregate([ { $match: { $and: [ { Owner: Owner }, { Follow: Account[0]._id } ] } }, { $project: { _id: 1 } } ]).toArray();

    if (Misc.IsUndefined(Follow[0]))
    {
        DB.collection("follow").insertOne({ Owner: Owner, Follow: Account[0]._id, Time: Misc.Time() });

        // TODO Add Notification
    }
    else
    {
        DB.collection("follow").deleteOne({ _id: Follow[0]._id });

        // TODO Add Notification
    }

    res.json({ Message: 0 });
});

module.exports = PostRouter;
