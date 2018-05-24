const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/ProfileAbout', Auth(), RateLimit(60, 60), async function(req, res)
{
    let Message = req.body.Message;

    if (!Misc.IsUndefined(Message) && Message.length > 512)
        Message = Message.substr(0, 512);

    let NewLine = 0;
    let ResultMessage = "";

    for (let I = 0; I < Message.length; I++)
    {
        if (Message.charCodeAt(I) === 10)
            NewLine++;

        if (NewLine > 8 && Message.charCodeAt(I) === 10)
            continue;

        ResultMessage += Message[I];
    }

    await DB.collection("account").updateOne({ _id: res.locals.ID }, { $set: { About: ResultMessage } });

    res.json({ Message: 0, Result: ResultMessage });
});

module.exports = PostRouter;
