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
                return config.pasarContractDeploy - 1;
            }
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    updateOrInsert: async function (pasarOrder, blockNumber) {
        let {orderId, ...rest} = pasarOrder;
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');
            return await collection.updateOne({orderId, blockNumber: {$lt: blockNumber}}, {$set: rest}, {upsert: true});
        } catch (err) {
            logger.error(err);
            throw new Error();
        } finally {
            await mongoClient.close();
        }
    },

    replaceDid: async function({address, did}) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_address_did');
            await collection.updateOne({address}, {$set: {did}}, {upsert: true});
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

    listPasarOrder: async function(pageNum=1, pageSize=10, blockNumber, orderState, sort) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');

            let match = {}

            let pipeline = [
                { $match: match},
                { $lookup: {from: "pasar_token", localField: "tokenId", foreignField: "tokenId", as: "token"} },
                { $unwind: "$token"},
                { $project: {"_id": 0, orderId:1, orderType:1, orderState:1, tokenId: 1,blockNumber: 1, amount: 1,
                        price: 1, endTime: 1, sellerAddr: 1, buyerAddr: 1, bids: 1, lastBidder: 1, filled:1, royaltyFee: 1,
                        createTime: 1, updateTime: 1, lastBid: 1,sellerDid: 1, asset: "$token.asset", name: "$token.name",
                        description: "$token.description", kind: "$token.kind", type: "$token.type", size: "$token.size",
                        royalties: "$token.royalties",royaltyOwner: "$token.royaltyOwner", quantity: "$token.quantity",
                        tokenDid: "$token.did", thumbnail: "$token.thumbnail", tokenCreateTime: "$token.createTime",
                        tokenUpdateTime: "$token.updateTime", adult: "$token.adult"}},
                { $sort: {blockNumber: sort}},
                { $skip: (pageNum - 1) * pageSize },
                { $limit: pageSize }
            ];

            if(orderState) {
                match["orderState"] = orderState;
            }
            if(blockNumber !== undefined) {
                match["blockNumber"] = {"$gte": blockNumber };
            }

            let total = await collection.find(match).count();
            let result = await collection.aggregate(pipeline).toArray();

            //deal with the situation that token royaltyOwner's did may not exist
            // let addresses = [];
            // result.forEach(item => {
            //     if(!item.tokenDid) {
            //         addresses.push(item.royaltyOwner)
            //     }
            // })
            //
            // if(addresses.length !== 0) {
            //     let didList = await this.getDidListByAddresses(addresses);
            //     if(didList.length !== 0) {
            //         let didListMap = new Map();
            //         didList.forEach(item => {
            //             didListMap.set(item.address, item.did);
            //         })
            //
            //         result.forEach(item => {
            //             if(!item.tokenDid) {
            //                 item.tokenDid = didListMap.get(item.royaltyOwner)
            //             }
            //         })
            //     }
            // }

            return {code: 200, message: 'success', data: {total, result}};
        } catch (err) {
            logger.error(err);
            return {code: 500, message: 'server error'};
        } finally {
            await mongoClient.close();
        }
    },

    getDidListByAddresses: async function(addresses) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_address_did');
            return await collection.find({address: {$in: addresses}}).project({"_id": 0}).toArray();
        } catch (err) {
            logger.error(err);
        } finally {
            await mongoClient.close();
        }
    },

    getDidByAddress: async function(address) {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_address_did');
            let result =  await collection.findOne({address}, {"_id": 0, address: 1, did: 1});
            return {code: 200, message: 'success', data: result};
        } catch (err) {
            logger.error(err);
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
        } finally {
            await mongoClient.close();
        }
    },

    pasarOrderCount: async function() {
        let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
        try {
            await mongoClient.connect();
            const collection = mongoClient.db(config.dbName).collection('pasar_order');
            return await collection.find({}).count();
        } catch (err) {
            logger.error(err);
        } finally {
            await mongoClient.close();
        }
    }
}
