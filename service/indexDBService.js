let MongoClient = require('mongodb').MongoClient;
let config = require('../config');

module.exports = {
    register: async function(feedsSource) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds_sources');
            const docs = await collection.find({did: feedsSource.did}).limit(1).toArray();
            if(docs.length === 0) {
                await collection.insertOne(feedsSource);
                return {code: 200, message: 'success'};
            } else {
                return {code: 400, message: 'DID exists'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    registerV2: async function(feedsSource) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            const docs = await collection.find({feedsUrlHash: feedsSource.feedsUrlHash}).limit(1).toArray();
            if(docs.length === 0) {
                await collection.insertOne(feedsSource);
                return {code: 200, message: 'success'};
            } else {
                return {code: 400, message: 'feedsUrlHash exists'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    get: async function(did) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds_sources');
            const docs = await collection.find({did}).limit(1).toArray();
            return docs.length === 1 ? {code: 200, message: 'success', data: docs[0]} : {code: 200, message: 'success'};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    getV2: async function(feedsUrlHash) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            const docs = await collection.find({feedsUrlHash}).limit(1).toArray();
            return docs.length === 1 ? {code: 200, message: 'success', data: docs[0]} : {code: 200, message: 'success'};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    getV3: async function(feedsUrlHash) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            const docs = await collection.find({feedsUrlHash}).project({"_id": 0, feedsAvatar: 0}).limit(1).toArray();
            return docs.length === 1 ? {code: 200, message: 'success', data: docs[0]} : {code: 200, message: 'success'};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    getAvatarV3: async function(feedsUrlHash) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            const docs = await collection.find({feedsUrlHash}).project({"_id": 0,feedsAvatar: 1}).limit(1).toArray();
            return docs.length === 1 ? {code: 200, message: 'success', data: docs[0]} : {code: 200, message: 'success'};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    getAvatarListV3: async function(feedsUrlHashList) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            const docs = await collection.find({feedsUrlHash:{ $in: feedsUrlHashList}}).project({"_id": 0,feedsAvatar: 1}).toArray();
            return {code: 200, message: 'success', data: docs};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    update: async function(feedsSource) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds_sources');

            let updateObject = {};
            if(feedsSource.name) {updateObject.name = feedsSource.name;}
            if(feedsSource.description) {updateObject.description = feedsSource.description;}

            let result = await collection.updateOne({did: feedsSource.did}, { $set: updateObject});
            if(result.modifiedCount === 1) {
                return {code: 200, message: 'success'};
            } else {
                return {code: 200, message: 'DID not exists or not update anything'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    updateV2: async function(feedsSource) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');

            let updateObject = {};
            if(feedsSource.name) {updateObject.name = feedsSource.name;}
            if(feedsSource.description) {updateObject.description = feedsSource.description;}
            if(feedsSource.feedsAvatar) {updateObject.feedsAvatar = feedsSource.feedsAvatar;}
            if(feedsSource.follower) {updateObject.follower = feedsSource.follower;}
            if(feedsSource.ownerName) {updateObject.ownerName = feedsSource.ownerName;}

            let result = await collection.updateOne({feedsUrlHash: feedsSource.feedsUrlHash}, { $set: updateObject});
            if(result.modifiedCount === 1) {
                return {code: 200, message: 'success'};
            } else {
                return {code: 200, message: 'DID not exists or not update anything'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    remove: async function(did) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds_sources');
            let result = await collection.deleteOne({did});
            if(result.deletedCount === 1) {
                return {code: 200, message: 'success'};
            } else {
                return {code: 400, message: 'DID not exists'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    removeV2: async function(feedsUrlHash) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            let result = await collection.deleteOne({feedsUrlHash});
            if(result.deletedCount === 1) {
                return {code: 200, message: 'success'};
            } else {
                return {code: 400, message: 'feedsUrlHash not exists'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listAll: async function() {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds_sources');
            let data = await collection.find({}, {did: 1, name: 1, description: 1, url: 1}).toArray();
            return {code: 200, message: 'success', data};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listAllV2: async function() {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            let data = await collection.find({}, {did: 1, name: 1, description: 1, url: 1, feedsUrlHash: 1,
                feedsAvatar: 1, followers:1, ownerName: 1}).toArray();
            return {code: 200, message: 'success', data};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listAllV3: async function() {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            let data = await collection.find().project({"_id": 0, feedsAvatar: 0}).toArray();
            return {code: 200, message: 'success', data};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listPage: async function(start, num) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds_sources');
            let total = await collection.find().count();
            let result = await collection.find({}, {did: 1, name: 1, description: 1, url: 1}).limit(num).skip(start).toArray();
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listPageV2: async function(start, num) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            let total = await collection.find().count();
            let result = await collection.find({}, {did: 1, name: 1, description: 1, url: 1, feedsUrlHash: 1,
                feedsAvatar: 1, followers:1, ownerName: 1}).limit(num).skip(start).toArray();
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listPageV3: async function(start, num) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('feeds');
            let total = await collection.find().count();
            let result = await collection.find().project({"_id": 0, feedsAvatar: 0}).limit(num).skip(start).toArray();
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    registerNFT: async function(token) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('ntf_token');
            const docs = await collection.find({tokenId: token.tokenId}).limit(1).toArray();
            if(docs.length === 0) {
                await collection.insertOne(token);
                return {code: 200, message: 'success'};
            } else {
                return {code: 400, message: 'TokenId exists'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    getNFT: async function(tokenId) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('ntf_token');
            const docs = await collection.find({tokenId}).limit(1).toArray();
            return docs.length === 1 ? {code: 200, message: 'success', data: docs[0]} : {code: 200, message: 'success'};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    removeNFT: async function(tokenId) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('ntf_token');
            let result = await collection.deleteOne({tokenId});
            if(result.deletedCount === 1) {
                return {code: 200, message: 'success'};
            } else {
                return {code: 400, message: 'TokenId not exists'}
            }
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },

    listNFT: async function(pageNum, pageSize) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('ntf_token');
            let total = await collection.find().count();
            let result;
            if(pageNum) {
                result = await collection.find({}, {tokenId: 1, name: 1, description: 1, author: 1, created: 1,
                    updated: 1, price:1, currency: 1, likes: 1,thumnail: 1}).limit(pageSize).skip((pageNum-1)*pageSize).toArray();
            } else {
                result = await collection.find({}, {tokenId: 1, name: 1, description: 1, author: 1, created: 1,
                    updated: 1, price:1, currency: 1, likes: 1, thumnail: 1}).toArray();
            }
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },
}
