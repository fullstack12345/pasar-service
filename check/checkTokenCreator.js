const {MongoClient} = require("mongodb");
const config = require("../config");

let burnAddress = '0x0000000000000000000000000000000000000000';

async function checkTokenHolder() {
    let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    try {
        await mongoClient.connect();
        let collection = mongoClient.db(config.dbName).collection('pasar_token');
        let result = await collection.find({}).sort({blockNumber: -1}).project({"_id": 0, tokenId: 1, royaltyOwner: 1}).toArray();

        let a1 = new Map();
        result.forEach(item => {
            a1.set(item.tokenId, item.royaltyOwner);
        })

        collection = mongoClient.db(config.dbName).collection('pasar_token_event');

        let result2 = await collection.find({ $or: [{from: burnAddress}, {to: burnAddress}]})
            .project({"_id": 0,tokenId:1, from: 1, to: 1, blockNumber: 1}).sort({blockNumber: 1}).toArray();

        let a2 = new Map();
        result2.forEach(item => {
            if(!a2.has(item.tokenId)) {
                a2.set(item.tokenId, item.to);
            }
        })

        console.log(`Pasar token: ${a1.size}   Pasar token event: ${a2.size}`);
        a2.forEach((value, key) => {
            if(value !== a1.get(key)) {
                console.log(`${key}:  ${value} <==> ${a1.get(key)}`)
            }
        })
    } catch (err) {
        console.log(err);
    } finally {
        await mongoClient.close();
    }
}

checkTokenHolder().then(console.log)
