const {MongoClient} = require("mongodb");
const config = require("../config");

async function checkTokenHolder() {
    let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    try {
        await mongoClient.connect();
        const collection = mongoClient.db(config.dbName).collection('pasar_token');
        return await collection.find({}).sort({blockNumber: -1}).project({"_id": 0, tokenId: 1, holder: 1}).toArray();
    } catch (err) {
        logger.error(err);
    } finally {
        await mongoClient.close();
    }
}

checkTokenHolder().then(async result => {

    console.log(`pasar_token: ${result.length}`)
    let a1 = new Map();
    result.forEach(item => {
        a1.set(item.tokenId, item.holder);
    })

    let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    await client.connect();
    let collection = client.db(config.dbName).collection('pasar_token_event');

    let result2 = await collection.aggregate([
        { $sort: {blockNumber: -1}},
        { $group: {_id: "$tokenId", doc: {$first: "$$ROOT"}}},
        { $replaceRoot: { newRoot: "$doc"}},
        { $project: {"_id": 0, tokenId:1,  holder: "$to"}}
    ]).toArray();

    console.log(`pasar_token_event: ${result2.length}`)
    let a2 = new Map();
    result2.forEach(item => {
        a2.set(item.tokenId, item.holder);
    })

    let i = 0;
    a2.forEach((value, key) => {
        if(a1.get(key) === undefined) {
            console.log(`${key} not in pasar_token`)

        }
        // else {
        //     if(value !== a1.get(key)) {
        //         i++;
        //         console.log(`${key}:  ${value} == ${a1.get(key)}`)
        //     }
        // }
    })

    // console.log(i)
})

