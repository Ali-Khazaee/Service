const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/ProfileURL', Auth(), RateLimit(60, 60), async function(req, res)
{
    let URL = req.body.URL;

    if (Misc.IsUndefined(URL))
        URL = "";
    else if (URL.length > 512)
        URL = URL.substr(0, 512);

    await DB.collection("account").updateOne({ _id: res.locals.ID }, { $set: { Link: URL } });

    res.json({ Message: 0 });
});

module.exports = PostRouter;
