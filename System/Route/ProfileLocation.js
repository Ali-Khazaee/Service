const PostRouter = require('express').Router();
const RateLimit  = require('../Handler/RateLimit');
const Auth       = require('../Handler/Auth');
const Misc       = require('../Handler/Misc');

PostRouter.post('/ProfileAbout', Auth(), RateLimit(60, 60), async function(req, res)
{
    let Name = req.body.Name;
    let Latitude = req.body.Latitude;
    let Longitude = req.body.Longitude;

    if (Misc.IsUndefined(Name) || Misc.IsUndefined(Latitude) || Misc.IsUndefined(Longitude))
       return res.json({ Message: 1 });

    if (Name.length > 32)
        Name = Name.substr(0, 32);

    let ResultName = "";

    for (let I = 0; I < Name.length; I++)
    {
        if (Name.charCodeAt(I) === 10)
            continue;

        ResultName += Name[I];
    }

    const ID = res.locals.ID;
    const Result = { Owner: ID, Name: Name, Latitude: Latitude, Longitude: Longitude, Time: Misc.Time() };

    await DB.collection("location").updateOne({ Owner: ID }, { $set: { Active: 0 } });
    await DB.collection("location").insertOne(Result);

    res.json({ Message: 0, Result: ResultName });
});

module.exports = PostRouter;
