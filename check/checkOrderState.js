const {MongoClient} = require("mongodb");
const config = require("../config");

async function checkOrderState() {
    let mongoClient = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    try {
        await mongoClient.connect();
        const collection = mongoClient.db(config.dbName).collection('pasar_order');
        return await collection.find({}).sort({blockNumber: -1}).project({"_id": 0, orderId: 1, orderState: 1}).toArray();
    } catch (err) {
        logger.error(err);
    } finally {
        await mongoClient.close();
    }
}

checkOrderState().then(async result => {
    let client = new MongoClient(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true});
    await client.connect();
    let collection = client.db(config.dbName).collection('pasar_order_event');

    let result2 = await collection.aggregate([
        { $sort: {blockNumber: -1}},
        { $match: {event: {$in: ["OrderCanceled", "OrderFilled", "OrderForSale"]}}},
        { $group: {_id: "$orderId", doc: {$first: "$$ROOT"}}},
        { $replaceRoot: { newRoot: "$doc"}},
    ]).toArray();

    let a2 = new Map();
    result2.forEach(item => {
        let state = item.event === "OrderForSale" ? "1" : item.event === "OrderFilled" ? "2" : item.event === "OrderCanceled" ? "3" : "0"
        a2.set(item.orderId, state);
    })

    let i = 0;
    result.forEach(item => {
        if(item.orderState !== a2.get(item.orderId)) {
            console.log(`${item.orderId}  pasar_order state: ${item.orderState} ==> pasar_event_order state: ${a2.get(item.orderId)}`)
            i++
        }
    })

    console.log(`there are ${i} orders state incorrect`)
})

