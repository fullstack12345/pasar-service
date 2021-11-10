const schedule = require('node-schedule');
let Web3 = require('web3');
let pasarDBService = require('./service/pasarDBService');
let stickerDBService = require('./service/stickerDBService');
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

const step = 5000;
web3Rpc.eth.getBlockNumber().then(currentHeight => {
    schedule.scheduleJob({start: new Date(now + 60 * 1000), rule: '0 * * * * *'}, async () => {
        if(orderForSaleJobCurrent > currentHeight) {
            console.log(`[OrderForSale] Sync ${orderForSaleJobCurrent} finished`)
            return;
        }
        const tempBlockNumber = orderForSaleJobCurrent + step
        const toBlock = tempBlockNumber > currentHeight ? currentHeight : tempBlockNumber;

        console.log(`[OrderForSale] Sync ${orderForSaleJobCurrent} ~ ${toBlock} ...`)

        pasarContractWs.getPastEvents('OrderForSale', {
            fromBlock: orderForSaleJobCurrent, toBlock
        }).then(events => {
            events.forEach(event => {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id}

                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber);
            })
            orderForSaleJobCurrent = tempBlockNumber + 1;
        }).catch(error => {
            console.log(error);
            console.log("[OrderForSale] Sync Ending ...")
        })
    });

    schedule.scheduleJob({start: new Date(now + 5 * 60 * 1000), rule: '10 * * * * *'}, async () => {
        if(orderFilledJobCurrent > currentHeight) {
            console.log(`[OrderFilled] Sync ${orderFilledJobCurrent} finished`)
            return;
        }

        const tempBlockNumber = orderFilledJobCurrent + step
        const toBlock = tempBlockNumber > currentHeight ? currentHeight : tempBlockNumber;

        console.log(`[OrderFilled] Sync ${orderFilledJobCurrent} ~ ${toBlock} ...`)

        pasarContractWs.getPastEvents('OrderFilled', {
            fromBlock: orderFilledJobCurrent, toBlock
        }).then(events => {
            events.forEach(event => {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id}

                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber);
            })
            orderFilledJobCurrent = tempBlockNumber + 1;
        }).catch( error => {
            console.log(error);
            console.log("[OrderFilled] Sync Ending ...");
        })
    });

    schedule.scheduleJob({start: new Date(now + 5 * 60 * 1000), rule: '20 * * * * *'}, async () => {
        if(orderCanceledJobCurrent > currentHeight) {
            console.log(`[OrderCanceled] Sync ${orderCanceledJobCurrent} finished`)
            return;
        }

        const tempBlockNumber = orderCanceledJobCurrent + step
        const toBlock = tempBlockNumber > currentHeight ? currentHeight : tempBlockNumber;

        console.log(`[OrderCanceled] Sync ${orderCanceledJobCurrent} ~ ${toBlock} ...`)

        pasarContractWs.getPastEvents('OrderCanceled', {
            fromBlock: orderCanceledJobCurrent, toBlock
        }).then(events => {
            events.forEach(event => {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id};

                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber);
            })
            orderCanceledJobCurrent = tempBlockNumber + 1;
        }).catch( error => {
            console.log(error);
            console.log("[OrderCanceled] Sync Ending ...");
        })
    });


    schedule.scheduleJob({start: new Date(now + 5 * 60 * 1000), rule: '30 * * * * *'}, async () => {
        if(orderPriceChangedJobCurrent > currentHeight) {
            console.log(`[OrderPriceChanged] Sync ${orderPriceChangedJobCurrent} finished`)
            return;
        }

        const tempBlockNumber = orderPriceChangedJobCurrent + step
        const toBlock = tempBlockNumber > currentHeight ? currentHeight : tempBlockNumber;

        console.log(`[OrderPriceChanged] Sync ${orderPriceChangedJobCurrent} ~ ${toBlock} ...`)

        pasarContractWs.getPastEvents('OrderPriceChanged', {
            fromBlock: orderPriceChangedJobCurrent, toBlock
        }).then(events => {
            events.forEach(event => {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id}

                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber);
            })

            orderPriceChangedJobCurrent = tempBlockNumber + 1;
        }).catch( error => {
            console.log(error);
            console.log("[OrderPriceChanged] Sync Ending ...");
        })
    });

    schedule.scheduleJob({start: new Date(now + 2 * 60 * 1000), rule: '40 * * * * *'}, async () => {
        if(tokenInfoSyncJobCurrent > currentHeight) {
            console.log(`[TokenInfo] Sync ${tokenInfoSyncJobCurrent} finished`)
            return;
        }

        const burnAddress = '0x0000000000000000000000000000000000000000';

        const tempBlockNumber = tokenInfoSyncJobCurrent + step
        const toBlock = tempBlockNumber > currentHeight ? currentHeight : tempBlockNumber;

        console.log(`[TokenInfo] Sync ${tokenInfoSyncJobCurrent} ~ ${toBlock} ...`)

        stickerContractWs.getPastEvents('TransferSingle', {
            fromBlock: tokenInfoSyncJobCurrent, toBlock
        }).then(events => {
            events.forEach(async event => {
                let from = event.returnValues._from;
                let to = event.returnValues._to;
                let tokenId = event.returnValues._id;
                let value = event.returnValues._value;
                let blockNumber = event.blockNumber;
                let timestamp = (await web3Rpc.eth.getBlock(blockNumber)).timestamp;

                let transferEvent = {tokenId, blockNumber, timestamp, from, to, value, memo: ""}
                await stickerDBService.addEvent(transferEvent);

                if(to === burnAddress) {
                    await stickerDBService.burnToken(tokenId);
                    return;
                }

                if(from === burnAddress) {
                    try {
                        let result = await stickerContract.methods.tokenInfo(tokenId).call();
                        let token = {blockNumber, tokenIndex: result.tokenIndex, tokenId, quantity: result.tokenSupply,
                            royalties:result.royaltyFee, royaltyOwner: result.royaltyOwner, createTime: result.createTime}

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

                        await stickerDBService.replaceToken(token);
                    } catch (e) {
                        logger.info(`[TokenInfo] Sync error at ${event.blockNumber} ${tokenId}`);
                        logger.info(e);
                    }
                }
            })
            tokenInfoSyncJobCurrent = tempBlockNumber + 1;
        }).catch(error => {
            console.log(error);
            console.log("[TokenInfo] Sync Ending ...");
        })
    })
})
