const {MongoClient} = require("mongodb");
const config = require("../config");

async function checkOrderPrice() {
    let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    try {
        await mongoClient.connect();
        const collection = mongoClient.db(config.dbName).collection('pasar_order');
        return await collection.find({}).sort({blockNumber: -1}).project({"_id": 0, orderId: 1, price: 1}).toArray();
    } catch (err) {
        logger.error(err);
    } finally {
        await mongoClient.close();
    }
}

checkOrderPrice().then(async result => {
    let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    await client.connect();
    let collection = client.db(config.dbName).collection('pasar_order_event');

    let result2 = await collection.aggregate([
        { $sort: {blockNumber: -1}},
        { $match: {event: {$in: ["OrderPriceChanged"]}}},
        { $group: {_id: "$orderId", doc: {$first: "$$ROOT"}}},
        { $replaceRoot: { newRoot: "$doc"}},
    ]).toArray();

    let a2 = new Map();
    result2.forEach(item => {
        let price = item.data.newPrice
        a2.set(item.orderId, price);
    })

    let i = 0;
    result.forEach(item => {
        let price = a2.get(item.orderId);
        if(price === undefined) {
            return
        }
        if(item.price !== price) {
            console.log(`${item.orderId}  pasar_order price: ${item.price} ==> pasar_event_order price: ${price}`)
            i++
        }
    })

    console.log(`there are ${i} orders price incorrect`)
})

