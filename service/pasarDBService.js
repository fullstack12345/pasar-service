let config = require('../config');
const e = require("express");
let MongoClient = require('mongodb').MongoClient;

module.exports = {
    getLastPasarOrderSyncHeight: async function (event) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order_event');
            let doc = await collection.findOne({event}, {sort:{blockNumber:-1}})
            if(doc) {
                return doc.blockNumber
            } else {
                //Pasar contract deploy at 7801378
                return config.pasarContractDeploy - 1;
            }
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    getLastStickerSyncHeight: async function () {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_token');
            let doc = await collection.findOne({}, {sort:{blockNumber: -1}});
            if(doc) {
                return doc.blockNumber
            } else {
                return config.stickerContractDeploy - 1;
            }
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    insertOrder: async function (pasarOrder) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');
            await collection.insertOne(pasarOrder);
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    insertOrderEvent: async function (orderEventDetail) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order_event');
            await collection.insertOne(orderEventDetail);
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
           await mongoClient.close();
        }
    },

    replaceToken: async function (token) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_token');
            await collection.replaceOne({tokenId: token.tokenId}, token, {upsert: true});
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    burnToken: async function (tokenId) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_token');
            await collection.updateOne({tokenId}, {$set: {royaltyOwner: '0x0000000000000000000000000000000000000000'}});
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    updateToken: async function (tokenId, holder) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_token');
            await collection.updateOne({tokenId}, {$set: {holder}});
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    updateOrder: async function (pasarOrder) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        let {orderId, ...rest} = pasarOrder
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');
            return await collection.updateOne({orderId, event: 'OrderForSale'}, { $set: rest});
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    listPasarOrder: async function(pageNum=1, pageSize=10, blockNumber, event, sort) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');

            let match = {}

            let pipeline = [
                { $match: match},
                { $lookup: {from: "pasar_token", localField: "tokenId", foreignField: "tokenId", as: "token"} },
                { $unwind: "$token"},
                { $project: {"_id":0,orderId:1, tokenId:1, seller:1, price: 1,blockNumber: 1,event: 1,
                        asset: "$token.asset", name: "$token.name", description: "$token.description", kind: "$token.kind",
                        type: "$token.type", royalties: "$token.royalties",royaltyOwner: "$token.royaltyOwner", quantity: "$token.quantity",
                        thumbnail: "$token.thumbnail", createTime: "$token.createTime", updateTime: "$token.updateTime"}},
                { $sort: {blockNumber: sort}},
                { $skip: (pageNum - 1) * pageSize },
                { $limit: pageSize }
            ];

            if(event) {
                match["event"] = event;
            }
            if(blockNumber !== undefined) {
                match["blockNumber"] = {"$gte": blockNumber };
            }

            let total = await collection.find(match).count();

            let result = await collection.aggregate(pipeline).toArray();
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await mongoClient.close();
        }
    },

    getWhitelist: async function(address) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_whitelist');
            let result =  await collection.find(address ? {address}: {}).project({"_id": 0}).toArray();
            return {code: 200, message: 'success', data: result};
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    }
}
