const schedule = require('node-schedule');
let Web3 = require('web3');
let pasarDBService = require('./service/pasarDBService');
let config = require('./config');
let pasarContractABI = require('./pasarABI');
let stickerContractABI = require('./stickerABI');
const BigNumber = require("bignumber.js");

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let web3WsProvider = new Web3.providers.WebsocketProvider(config.escWsUrl, {
    reconnect: {
        auto: true,
        delay: 5000,
        maxAttempts: 5,
        onTimeout: false,
    },
})
let web3Ws = new Web3(web3WsProvider);
let pasarContractWs = new web3Ws.eth.Contract(pasarContractABI, config.pasarContract);
let stickerContractWs = new web3Ws.eth.Contract(stickerContractABI, config.stickerContract);


let web3Rpc = new Web3(config.escRpcUrl);
let pasarContract = new web3Rpc.eth.Contract(pasarContractABI, config.pasarContract);
let stickerContract = new web3Rpc.eth.Contract(stickerContractABI, config.stickerContract);

let now = Date.now();

let updateOrder = function (orderId, blockNumber) {
    pasarContract.methods.getOrderById(orderId).call().then(result => {
        let pasarOrder = {orderId: result.orderId, orderType: result.orderType, orderState: result.orderState,
            tokenId: result.tokenId, amount: result.amount, price: result.price, endTime: result.endTime,
            sellerAddr: result.sellerAddr, buyerAddr: result.buyerAddr, bids: result.bids, lastBidder: result.lastBidder,
            lastBid: result.lastBid, filled: result.filled, royaltyOwner: result.royaltyOwner, royaltyFee: result.royaltyFee,
            createTime: result.createTime, updateTime: result.updateTime, blockNumber}

        pasarDBService.updateOrInsert(pasarOrder);
    }).catch(error => {
        console.log(error);
        console.log(`[OrderForSale] Sync - getOrderById(${orderId}) call error`);
    })
}

let orderForSaleJobCurrent = 7801378,
    orderFilledJobCurrent = 7801378,
    orderCanceledJobCurrent = 7801378,
    orderPriceChangedJobCurrent = 7801378,
    tokenInfoSyncJobCurrent = 7744408;

schedule.scheduleJob({start: new Date(now + 60 * 1000), rule: '0 * * * * *'}, async () => {
    console.log(`[OrderForSale] Sync ${orderForSaleJobCurrent} ~ ${orderForSaleJobCurrent + 1000} ...`)

    pasarContractWs.getPastEvents('OrderForSale', {
        fromBlock: orderForSaleJobCurrent, toBlock: orderForSaleJobCurrent + 1000
    }).then(events => {
        events.forEach(event => {
            let orderInfo = event.returnValues;
            let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                logIndex: event.logIndex, removed: event.removed, id: event.id}

            pasarDBService.insertOrderEvent(orderEventDetail);
            updateOrder(orderInfo._orderId, event.blockNumber);
        })
        orderForSaleJobCurrent += 1001;
    }).catch(error => {
        console.log(error);
        console.log("[OrderForSale] Sync Ending ...")
    })
});

schedule.scheduleJob({start: new Date(now + 5 * 60 * 1000), rule: '10 * * * * *'}, async () => {
    console.log(`[OrderFilled] Sync ${orderFilledJobCurrent} ~ ${orderFilledJobCurrent + 1000} ...`)

    pasarContractWs.getPastEvents('OrderFilled', {
        fromBlock: orderFilledJobCurrent, toBlock: orderFilledJobCurrent + 1000
    }).then(events => {
        events.forEach(event => {
            let orderInfo = event.returnValues;
            let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                logIndex: event.logIndex, removed: event.removed, id: event.id}

            pasarDBService.insertOrderEvent(orderEventDetail);
            updateOrder(orderInfo._orderId, event.blockNumber);
        })
        orderFilledJobCurrent += 1001;
    }).catch( error => {
        console.log(error);
        console.log("[OrderFilled] Sync Ending ...");
    })
});

schedule.scheduleJob({start: new Date(now + 5 * 60 * 1000), rule: '20 * * * * *'}, async () => {
    console.log(`[OrderCanceled] Sync ${orderCanceledJobCurrent} ~ ${orderCanceledJobCurrent + 1000} ...`)

    pasarContractWs.getPastEvents('OrderCanceled', {
        fromBlock: orderCanceledJobCurrent, toBlock: orderCanceledJobCurrent + 1000
    }).then(events => {
        events.forEach(event => {
            let orderInfo = event.returnValues;
            let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                logIndex: event.logIndex, removed: event.removed, id: event.id};

            pasarDBService.insertOrderEvent(orderEventDetail);
            updateOrder(orderInfo._orderId, event.blockNumber);
        })
        orderCanceledJobCurrent += 1001;
    }).catch( error => {
        console.log(error);
        console.log("[OrderCanceled] Sync Ending ...");
    })
});


schedule.scheduleJob({start: new Date(now + 5 * 60 * 1000), rule: '30 * * * * *'}, async () => {
    console.log(`[OrderPriceChanged] Sync ${orderPriceChangedJobCurrent} ~ ${orderPriceChangedJobCurrent + 1000} ...`)

    pasarContractWs.getPastEvents('OrderPriceChanged', {
        fromBlock: orderPriceChangedJobCurrent, toBlock: orderPriceChangedJobCurrent + 1000
    }).then(events => {
        events.forEach(event => {
            let orderInfo = event.returnValues;
            let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                logIndex: event.logIndex, removed: event.removed, id: event.id}

            pasarDBService.insertOrderEvent(orderEventDetail);
            updateOrder(orderInfo._orderId, event.blockNumber);
        })

        orderPriceChangedJobCurrent += 1001;
    }).catch( error => {
        console.log(error);
        console.log("[OrderPriceChanged] Sync Ending ...");
    })
});

schedule.scheduleJob({start: new Date(now + 2 * 60 * 1000), rule: '40 * * * * *'}, async () => {
    const burnAddress = '0x0000000000000000000000000000000000000000';

    console.log(`[TokenInfo] Sync ${tokenInfoSyncJobCurrent} ~ ${tokenInfoSyncJobCurrent + 1000} ...`)

    stickerContractWs.getPastEvents('TransferSingle', {
        fromBlock: tokenInfoSyncJobCurrent, toBlock: tokenInfoSyncJobCurrent + 1000
    }).then(events => {
        events.forEach(async event => {
            let from = event.returnValues._from;
            let to = event.returnValues._to;
            let tokenId = event.returnValues._id;

            console.log(`[TokenInfo] Sync processing ... ${event.blockNumber} ${tokenId}`)

            if (to === burnAddress) {
                await pasarDBService.burnToken(tokenId);
                return;
            }

            if (from === burnAddress) {
                try {
                    let result = await stickerContract.methods.tokenInfo(tokenId).call();
                    let token = {
                        blockNumber: event.blockNumber, tokenIndex: result.tokenIndex, tokenId,
                        quantity: result.tokenSupply, royalties: result.royaltyFee, royaltyOwner: result.royaltyOwner,
                        holder: result.royaltyOwner, createTime: result.createTime, updateTime: result.updateTime
                    }

                    token.tokenIdHex = '0x' + new BigNumber(tokenId).toString(16);

                    let tokenCID = result.tokenUri.split(":")[2];

                    let response = await fetch(config.ipfsNodeUrl + tokenCID);
                    let data = await response.json();
                    token.kind = data.kind;
                    token.type = data.type;
                    token.asset = data.image;
                    token.name = data.name;
                    token.description = data.description;
                    token.thumbnail = data.thumbnail;

                    await pasarDBService.replaceToken(token);
                } catch (e) {
                    console.log(`[TokenInfo] Sync error at ${event.blockNumber} ${tokenId}`);
                    console.log(e);
                }
                return;
            }
            await pasarDBService.updateToken(tokenId, to);
        })

        tokenInfoSyncJobCurrent += 1001;
    }).catch(error => {
        console.log(error);
        console.log("[TokenInfo] Sync Ending ...");
    })
})
