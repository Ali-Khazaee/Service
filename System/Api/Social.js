'use strict'

const Packet = require('../Model/Packet')
const Misc = require('../Handler/MiscHandler')
const RateLimit = require('../Handler/RateLimitHandler')

module.exports = (Client) =>
{
    /**
     * @Packet SocialFollow
     *
     * @Description Follow Kardan Yek Person
     *
     * @Param {string} Who
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     * Result: 2 >> You can't follow yourself
     * Result: 3 >> Who dosen't exists
     * Result: 4 >> Person Already followed
     */
    Client.On(Packet.SocialFollow, RateLimit(600, 3600), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.SocialFollow, ID, { Result: 1 })

        if (Message.Who === Client.__Owner)
            return Client.Send(Packet.SocialFollow, ID, { Result: 2 })

        Message.Who = MongoID(Message.Who)

        DB.collection('account').findOne({ _id: Message.Who }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialFollow, Error: Error })
                return Client.Send(Packet.SocialFollow, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialFollow, ID, { Result: 3 })

            DB.collection('follow').findOne({ $and: [ { Owner: Message.Who }, { Followed: MongoID(Client.__Owner) } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialFollow, Error: Error })
                    return Client.Send(Packet.SocialFollow, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result[0]))
                    return Client.Send(Packet.SocialFollow, ID, { Result: 4 })

                DB.collection('follow').insertOne({ Owner: Message.Who, Followed: MongoID(Client.__Owner) }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialFollow, Error: Error })
                        return Client.Send(Packet.SocialFollow, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialFollow, ID, { Result: 0 })
                    Misc.Analyze('Request', { ID: Packet.SocialFollow, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialUnFollow
     *
     * @Description UnFollow Kardan Yek Person
     *
     * @Param {string} Who
     *
     * Result: 1 >> Who ( Undefined, Invalid )
     * Result: 2 >> Who dosen't exists
     * Result: 3 >> Person isn't followed at all
     */
    Client.On(Packet.SocialUnFollow, RateLimit(600, 3600), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.Who) || Misc.IsInvalidID(Message.Who))
            return Client.Send(Packet.SocialUnFollow, ID, { Result: 1 })

        Message.Who = MongoID(Message.Who)

        DB.collection('account').findOne({ _id: Message.Who }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialUnFollow, Error: Error })
                return Client.Send(Packet.SocialUnFollow, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialUnFollow, ID, { Result: 2 })

            DB.collection('follow').findOne({ $and: [ { Owner: Message.Who }, { Followed: MongoID(Client.__Owner) } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialUnFollow, Error: Error })
                    return Client.Send(Packet.SocialUnFollow, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result[0]))
                    return Client.Send(Packet.SocialUnFollow, ID, { Result: 3 })

                DB.collection('follow').deleteOne({ $and: [ { Owner: Message.Who }, { Followed: MongoID(Client.__Owner) } ] }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialUnFollow, Error: Error })
                        return Client.Send(Packet.SocialUnFollow, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialUnFollow, ID, { Result: 0 })
                    Misc.Analyze('Request', { ID: Packet.SocialUnFollow, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialFollowingList
     *
     * @Description Gereftane List e Following Haye Khod
     *
     * @Return Message: Array Object Az List Following Ha
     */
    Client.On(Packet.SocialFollowingList, RateLimit(120, 60), (ID) =>
    {
        DB.collection('follow').find({ Followed: MongoID(Client.__Owner) }).project({ _id: 0, Owner: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialFollowingList, Error: Error })
                return Client.Send(Packet.SocialFollowingList, ID, { Result: -1 })
            }

            Client.Send(Packet.SocialFollowingList, ID, { Result: 0, Message: Result })

            Misc.Analyze('Request', { ID: Packet.SocialFollowingList, IP: Client._Address })
        })
    })

    /**
     * @Packet SocialFollowersList
     *
     * @Description Gereftane List e Follower Haye Khod
     *
     * @Return Message: Array Object Az List Follower Ha
     */
    Client.On(Packet.SocialFollowerList, RateLimit(120, 60), (ID) =>
    {
        DB.collection('follow').find({ Owner: MongoID(Client.__Owner) }).project({ _id: 0, Followed: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialFollowerList, Error: Error })
                return Client.Send(Packet.SocialFollowerList, ID, { Result: -1 })
            }

            Client.Send(Packet.SocialFollowerList, ID, { Result: 0, Message: Result })

            Misc.Analyze('Request', { ID: Packet.SocialFollowerList, IP: Client._Address })
        })
    })

    /**
     * @Packet SocialPostList
     *
     * @Description Gereftane List e Post Haye Person
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     *
     * @Return Message: Array Object Az List Post Ha
     */
    Client.On(Packet.SocialPostList, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostList, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('account').findOne({ _id: Message.ID }).limit(1).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostList, Error: Error })
                return Client.Send(Packet.SocialPostList, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostList, ID, { Result: 2 })

            // FixMe Handle limit properly
            DB.collection('post').find({ $and: [ { Owner: Message.ID }, { Delete: { $exists: false } } ] }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostList, Error: Error })
                    return Client.Send(Packet.SocialPostList, ID, { Result: -1 })
                }

                Client.Send(Packet.SocialPostList, ID, { Result: 0, Message: Result })

                Misc.Analyze('Request', { ID: Packet.SocialPostList, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet SocialPostLike
     *
     * @Description Like Kardan Yek Post
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Post is already liked
     */
    Client.On(Packet.SocialPostLike, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostLike, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostLike, Error: Error })
                return Client.Send(Packet.SocialPostLike, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostLike, ID, { Result: 2 })

            DB.collection('post_like').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentLike, Error: Error })
                    return Client.Send(Packet.SocialPostCommentLike, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result[0]))
                    return Client.Send(Packet.SocialPostCommentLike, ID, { Result: 3 })

                // FixMe check if user is blocked
                DB.collection('post_like').insertOne({ ID: Message.ID, Owner: MongoID(Client.__Owner), Time: Misc.TimeMili() }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostLike, Error: Error })
                        return Client.Send(Packet.SocialPostLike, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostLike, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostLike, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialPostDisLike
     *
     * @Description DisLike Kardan Yek Post
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Post is not liked at all
     */
    Client.On(Packet.SocialPostDisLike, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostDisLike, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostDisLike, Error: Error })
                return Client.Send(Packet.SocialPostDisLike, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostDisLike, ID, { Result: 2 })

            DB.collection('post_like').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostDisLike, Error: Error })
                    return Client.Send(Packet.SocialPostDisLike, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result[0]))
                    return Client.Send(Packet.SocialPostDisLike, ID, { Result: 3 })

                DB.collection('post_like').deleteOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) } ] }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostDisLike, Error: Error })
                        return Client.Send(Packet.SocialPostDisLike, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostDisLike, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostDisLike, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialPostDelete
     *
     * @Description Delete Kardan Yek Post
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     */
    Client.On(Packet.SocialPostDelete, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostDelete, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostDelete, ID, { Result: 2 })

            // FixMe Do all the queries at once - Or Just check if Post.Delete is set in every single API?
            // FixMe Should we add a MovePostToArchive API as well?
            DB.collection('post').updateOne({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                    return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                }

                DB.collection('post_like').updateMany({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                        return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                    }

                    DB.collection('post_report').updateMany({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
                    {
                        if (Misc.IsDefined(Error))
                        {
                            Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                            return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                        }

                        DB.collection('post_view').updateMany({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
                        {
                            if (Misc.IsDefined(Error))
                            {
                                Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                                return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                            }

                            DB.collection('post_comment').updateMany({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
                            {
                                if (Misc.IsDefined(Error))
                                {
                                    Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                                    return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                                }

                                DB.collection('post_comment_reply').updateMany({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
                                {
                                    if (Misc.IsDefined(Error))
                                    {
                                        Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                                        return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                                    }

                                    DB.collection('post_comment_like').updateMany({ ID: Message.ID }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
                                    {
                                        if (Misc.IsDefined(Error))
                                        {
                                            Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                                            return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                                        }

                                        DB.collection('post_bookmark').deleteMany({ ID: Message.ID }, (Error) =>
                                        {
                                            if (Misc.IsDefined(Error))
                                            {
                                                Misc.Analyze('DBError', { Tag: Packet.SocialPostDelete, Error: Error })
                                                return Client.Send(Packet.SocialPostDelete, ID, { Result: -1 })
                                            }

                                            Client.Send(Packet.SocialPostDelete, ID, { Result: 0 })

                                            Misc.Analyze('Request', { ID: Packet.SocialPostDelete, IP: Client._Address })
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    })

    /**
     * @Packet SocialPostReport
     *
     * @Description Report Kardan Yek Post
     *
     * @Param {string} ID
     * @Param {string} Reason
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Reason ( Undefined, LT: 10 )
     * Result: 3 >> ID dosen't exists
     */
    Client.On(Packet.SocialPostReport, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostReport, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Reason) || Message.Reason.length <= 10)
            return Client.Send(Packet.SocialPostReport, ID, { Result: 2 })

        if (Message.Reason.length > 255)
            Message.Reason = Message.Reason.substring(0, 255)

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostReport, Error: Error })
                return Client.Send(Packet.SocialPostReport, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostReport, ID, { Result: 3 })

            DB.collection('post_report').insertOne({ ID: Message.ID, Owner: MongoID(Client.__Owner), Reason: Message.Reason, Time: Misc.TimeMili() }, (Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostReport, Error: Error })
                    return Client.Send(Packet.SocialPostReport, ID, { Result: -1 })
                }

                Client.Send(Packet.SocialPostReport, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.SocialPostReport, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet SocialPostView
     *
     * @Description View Kardan Yek Post
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Post is already viewed
     */
    Client.On(Packet.SocialPostView, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostView, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostView, Error: Error })
                return Client.Send(Packet.SocialPostView, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostView, ID, { Result: 2 })

            DB.collection('post_view').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostView, Error: Error })
                    return Client.Send(Packet.SocialPostView, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result[0]))
                    return Client.Send(Packet.SocialPostView, ID, { Result: 3 })

                DB.collection('post_view').insertOne({ ID: Message.ID, Owner: MongoID(Client.__Owner), Time: Misc.TimeMili() }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostView, Error: Error })
                        return Client.Send(Packet.SocialPostView, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostView, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostView, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialPostComment
     *
     * @Description Comment Gozashtan Dar Yek Post
     *
     * @Param {string} ID
     * @Param {string} Message
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message == Undefined
     * Result: 3 >> ID dosen't exists
     */
    Client.On(Packet.SocialPostComment, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostComment, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.SocialPostComment, ID, { Result: 2 })

        if (Message.Message.length > 255)
            Message.Message = Message.Message.substring(0, 255)

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostComment, Error: Error })
                return Client.Send(Packet.SocialPostComment, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostComment, ID, { Result: 2 })

            // FixMe check filtered words & is user blocked
            DB.collection('post_comment').insertOne({ ID: Message.ID, Message: Message.Message, Owner: MongoID(Client.__Owner), Time: Misc.TimeMili() }, (Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostComment, Error: Error })
                    return Client.Send(Packet.SocialPostComment, ID, { Result: -1 })
                }

                Client.Send(Packet.SocialPostComment, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.SocialPostComment, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet SocialPostCommentDelete
     *
     * @Description Delete Kardan Yek Comment
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     */
    Client.On(Packet.SocialPostCommentDelete, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostCommentDelete, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        // FixMe Should we allow PostSender to delete comments as well?
        DB.collection('post_comment').findOne({ $and: [ { _id: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentDelete, Error: Error })
                return Client.Send(Packet.SocialPostCommentDelete, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostCommentDelete, ID, { Result: 2 })

            DB.collection('post_comment').updateOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) } ] }, { $set: { Delete: Misc.TimeMili() } }, (Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentDelete, Error: Error })
                    return Client.Send(Packet.SocialPostCommentDelete, ID, { Result: -1 })
                }

                Client.Send(Packet.SocialPostCommentDelete, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.SocialPostCommentDelete, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet SocialPostCommentLike
     *
     * @Description Like Kardan Yek Comment
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Comment is Already liked
     */
    Client.On(Packet.SocialPostCommentLike, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostCommentLike, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post_comment').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentLike, Error: Error })
                return Client.Send(Packet.SocialPostCommentLike, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostCommentLike, ID, { Result: 2 })

            DB.collection('post_comment_like').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentLike, Error: Error })
                    return Client.Send(Packet.SocialPostCommentLike, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result[0]))
                    return Client.Send(Packet.SocialPostCommentLike, ID, { Result: 3 })

                DB.collection('post_comment_like').insertOne({ ID: Message.ID, Owner: MongoID(Client.__Owner), Time: Misc.TimeMili() }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentLike, Error: Error })
                        return Client.Send(Packet.SocialPostCommentLike, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostCommentLike, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostCommentLike, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialPostCommentDisLike
     *
     * @Description DisLike Kardan Yek Comment
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Comment is not liked at all
     */
    Client.On(Packet.SocialPostCommentDisLike, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post_comment').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentDisLike, Error: Error })
                return Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: 2 })

            DB.collection('post_comment_like').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentDisLike, Error: Error })
                    return Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result[0]))
                    return Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: 3 })

                DB.collection('post_comment_like').deleteOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) } ] }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentDisLike, Error: Error })
                        return Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostCommentDisLike, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostCommentDisLike, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialPostCommentReply
     *
     * @Description Reply Kardan Yek Comment Dar Post
     *
     * @Param {string} ID
     * @Param {string} Message
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> Message == Undefined
     * Result: 3 >> ID dosen't exists
     */
    Client.On(Packet.SocialPostCommentReply, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostCommentReply, ID, { Result: 1 })

        if (Misc.IsUndefined(Message.Message))
            return Client.Send(Packet.SocialPostCommentReply, ID, { Result: 2 })

        if (Message.Message.length > 255)
            Message.Message = Message.Message.substring(0, 255)

        Message.ID = MongoID(Message.ID)

        DB.collection('post_comment').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentReply, Error: Error })
                return Client.Send(Packet.SocialPostCommentReply, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostCommentReply, ID, { Result: 2 })

            // FixMe check filtered words & is user blocked
            DB.collection('post_comment_reply').insertOne({ ID: Message.ID, Message: Message.Message, Owner: MongoID(Client.__Owner), Time: Misc.TimeMili() }, (Error) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostCommentReply, Error: Error })
                    return Client.Send(Packet.SocialPostCommentReply, ID, { Result: -1 })
                }

                Client.Send(Packet.SocialPostCommentReply, ID, { Result: 0 })

                Misc.Analyze('Request', { ID: Packet.SocialPostCommentReply, IP: Client._Address })
            })
        })
    })

    /**
     * @Packet SocialPostBookmark
     *
     * @Description Like Kardan Yek Comment
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Comment is Already bookmarked
     */
    Client.On(Packet.SocialPostBookmark, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostBookmark, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostBookmark, Error: Error })
                return Client.Send(Packet.SocialPostBookmark, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostBookmark, ID, { Result: 2 })

            DB.collection('post_bookmark').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostBookmark, Error: Error })
                    return Client.Send(Packet.SocialPostBookmark, ID, { Result: -1 })
                }

                if (Misc.IsDefined(Result[0]))
                    return Client.Send(Packet.SocialPostBookmark, ID, { Result: 3 })

                DB.collection('post_bookmark').insertOne({ ID: Message.ID, Owner: MongoID(Client.__Owner), Time: Misc.TimeMili() }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostBookmark, Error: Error })
                        return Client.Send(Packet.SocialPostBookmark, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostBookmark, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostBookmark, IP: Client._Address })
                })
            })
        })
    })

    /**
     * @Packet SocialPostUnBookmark
     *
     * @Description DisLike Kardan Yek Comment
     *
     * @Param {string} ID
     *
     * Result: 1 >> ID ( Undefined, Invalid )
     * Result: 2 >> ID dosen't exists
     * Result: 3 >> Post is not bookmarked at all
     */
    Client.On(Packet.SocialPostUnBookmark, RateLimit(120, 60), (ID, Message) =>
    {
        if (Misc.IsUndefined(Message.ID) || Misc.IsInvalidID(Message.ID))
            return Client.Send(Packet.SocialPostUnBookmark, ID, { Result: 1 })

        Message.ID = MongoID(Message.ID)

        DB.collection('post').findOne({ $and: [ { _id: Message.ID }, { Delete: { $exists: false } } ] }).project({ _id: 1 }).toArray((Error, Result) =>
        {
            if (Misc.IsDefined(Error))
            {
                Misc.Analyze('DBError', { Tag: Packet.SocialPostUnBookmark, Error: Error })
                return Client.Send(Packet.SocialPostUnBookmark, ID, { Result: -1 })
            }

            if (Misc.IsUndefined(Result[0]))
                return Client.Send(Packet.SocialPostUnBookmark, ID, { Result: 2 })

            DB.collection('post_bookmark').findOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) } ] }).project({ _id: 1 }).toArray((Error, Result) =>
            {
                if (Misc.IsDefined(Error))
                {
                    Misc.Analyze('DBError', { Tag: Packet.SocialPostUnBookmark, Error: Error })
                    return Client.Send(Packet.SocialPostUnBookmark, ID, { Result: -1 })
                }

                if (Misc.IsUndefined(Result[0]))
                    return Client.Send(Packet.SocialPostUnBookmark, ID, { Result: 3 })

                DB.collection('post_bookmark').deleteOne({ $and: [ { ID: Message.ID }, { Owner: MongoID(Client.__Owner) } ] }, (Error) =>
                {
                    if (Misc.IsDefined(Error))
                    {
                        Misc.Analyze('DBError', { Tag: Packet.SocialPostUnBookmark, Error: Error })
                        return Client.Send(Packet.SocialPostUnBookmark, ID, { Result: -1 })
                    }

                    Client.Send(Packet.SocialPostUnBookmark, ID, { Result: 0 })

                    Misc.Analyze('Request', { ID: Packet.SocialPostUnBookmark, IP: Client._Address })
                })
            })
        })
    })
}
