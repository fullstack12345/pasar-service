let config = require('../config');
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
                return 7801377;
            }
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    getSynchronizedTokenIndex: async function () {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_token');
            let doc = await collection.findOne({}, {sort:{tokenIndex: -1}});
            if(doc) {
                return doc.tokenIndex
            } else {
                return -1;
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

    listPasarOrder: async function(pageNum=1, pageSize=10) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');
            let total = await collection.find({"event": "OrderForSale"}).count();

            let pipeline = [
                { $match:{"event": "OrderForSale"}},
                { $lookup: {from: "pasar_token", localField: "tokenId", foreignField: "tokenId", as: "token"} },
                { $unwind: "$token"},
                { $project: {"_id":0,orderId:1, tokenId:1, seller:1, price: 1, asset: "$token.asset", name: "$token.name", description: "$token.description",
                        kind: "$token.kind", type: "$token.type", royalties: "$token.royalties", quantity: "$token.quantity", thumbnail: "$token.thumbnail",
                        createTime: "$token.createTime", updateTime: "$token.updateTime"}},
                { $sort: {updateTime: -1}},
                { $skip: (pageNum - 1) * pageSize },
                { $limit: pageSize }
            ];

            let result = await collection.aggregate(pipeline).toArray();
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await mongoClient.close();
        }
    },

    listStickers: async function(pageNum, pageSize) {
        let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await client.connect();
            const collection = client.db(config.dbName).collection('pasar_token');
            let total = await collection.find().count();
            let result = await collection.find().sort({tokenIndex: -1}).project({"_id": 0}).limit(pageSize).skip((pageNum-1)*pageSize).toArray();
            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await client.close();
        }
    },
}
