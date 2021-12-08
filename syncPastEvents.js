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
const burnAddress = '0x0000000000000000000000000000000000000000';

let updateOrder = async function(orderId, blockNumber, eventType) {
    try {
        let result = await pasarContract.methods.getOrderById(orderId).call();
        let pasarOrder = {orderId: result.orderId, orderType: result.orderType, orderState: result.orderState,
            tokenId: result.tokenId, amount: result.amount, price: result.price, endTime: result.endTime,
            sellerAddr: result.sellerAddr, buyerAddr: result.buyerAddr, bids: result.bids, lastBidder: result.lastBidder,
            lastBid: result.lastBid, filled: result.filled, royaltyOwner: result.royaltyOwner, royaltyFee: result.royaltyFee,
            createTime: result.createTime, updateTime: result.updateTime, blockNumber}

        if(result.orderState === "1" && blockNumber > config.upgradeBlock) {
            let extraInfo = await pasarContract.methods.getOrderExtraById(orderId).call();
            if(extraInfo.sellerUri !== '') {
                pasarOrder.platformAddr = extraInfo.platformAddr;
                pasarOrder.platformFee = extraInfo.platformFee;
                pasarOrder.sellerUri = extraInfo.sellerUri;

                let tokenCID = extraInfo.sellerUri.split(":")[2];
                let response = await fetch(config.ipfsNodeUrl + tokenCID);
                pasarOrder.sellerDid = await response.json();

                await pasarDBService.replaceDid({address: result.sellerAddr, did: pasarOrder.sellerDid});
            }
        }
        let res = await pasarDBService.updateOrInsert(pasarOrder, blockNumber);
        if(res.modifiedCount !== 1 && res.upsertedCount !== 1) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
            console.log(`${eventType}]  update or insert order info error : ${JSON.stringify(pasarOrder)}`)
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
        }
    } catch(error) {
        console.log(error);
        console.log(`[OrderForSale] Sync - getOrderById(${orderId}) at ${blockNumber} call error`);
    }
}

let orderForSaleJobCurrent = config.pasarContractDeploy,
    orderFilledJobCurrent = config.pasarContractDeploy,
    orderCanceledJobCurrent = config.pasarContractDeploy,
    orderPriceChangedJobCurrent = config.pasarContractDeploy,
    tokenInfoSyncJobCurrent = config.stickerContractDeploy,
    tokenInfoMemoSyncJobCurrent = config.stickerContractDeploy;

const step = 20000;
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
            events.forEach(async event => {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id}

                console.log(`[OrderForSale] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                await pasarDBService.insertOrderEvent(orderEventDetail);
                await updateOrder(orderInfo._orderId, event.blockNumber, 'OrderForSale');
            })
            orderForSaleJobCurrent = toBlock + 1;
        }).catch(error => {
            console.log(error);
            console.log("[OrderForSale] Sync Ending ...")
        })
    });


    schedule.scheduleJob({start: new Date(now + 2 * 60 * 1000), rule: '10 * * * * *'}, async () => {
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
                    logIndex: event.logIndex, removed: event.removed, id: event.id,
                    data: {oldPrice: orderInfo._oldPrice, newPrice: orderInfo._newPrice}}

                console.log(`[OrderPriceChanged] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber, 'OrderPriceChanged');
            })

            orderPriceChangedJobCurrent = toBlock + 1;
        }).catch( error => {
            console.log(error);
            console.log("[OrderPriceChanged] Sync Ending ...");
        })
    });

    schedule.scheduleJob({start: new Date(now + 3 * 60 * 1000), rule: '20 * * * * *'}, async () => {
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

                console.log(`[OrderFilled] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber, 'OrderFilled');
            })
            orderFilledJobCurrent = toBlock + 1;
        }).catch( error => {
            console.log(error);
            console.log("[OrderFilled] Sync Ending ...");
        })
    });

    schedule.scheduleJob({start: new Date(now + 4 * 60 * 1000), rule: '30 * * * * *'}, async () => {
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

                console.log(`[OrderCanceled] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                pasarDBService.insertOrderEvent(orderEventDetail);
                updateOrder(orderInfo._orderId, event.blockNumber, 'OrderCanceled');
            })
            orderCanceledJobCurrent = toBlock + 1;
        }).catch( error => {
            console.log(error);
            console.log("[OrderCanceled] Sync Ending ...");
        })
    });

    /**
     * transferSingle event
     */
    schedule.scheduleJob({start: new Date(now + 2 * 60 * 1000), rule: '40 * * * * *'}, async () => {
        if(tokenInfoSyncJobCurrent > currentHeight) {
            console.log(`[TokenInfo] Sync ${tokenInfoSyncJobCurrent} finished`)
            return;
        }

        const tempBlockNumber = tokenInfoSyncJobCurrent + step
        const toBlock = Math.min(tempBlockNumber, currentHeight);

        console.log(`[TokenInfo] Sync ${tokenInfoSyncJobCurrent} ~ ${toBlock} ...`)

        stickerContractWs.getPastEvents('TransferSingle', {
            fromBlock: tokenInfoSyncJobCurrent, toBlock
        }).then(events => {
            events.forEach(async event => {
                let blockNumber = event.blockNumber;
                let from = event.returnValues._from;
                let to = event.returnValues._to;

                if(from !== burnAddress && to !== burnAddress && blockNumber > config.upgradeBlock) {
                    return;
                }

                let tokenId = event.returnValues._id;
                let value = event.returnValues._value;
                let timestamp = (await web3Rpc.eth.getBlock(blockNumber)).timestamp;

                let transferEvent = {tokenId, blockNumber, timestamp, from, to, value};
                await stickerDBService.addEvent(transferEvent);

                if(to === burnAddress) {
                    await stickerDBService.burnToken(tokenId);
                } else if(from === burnAddress) {
                    try {
                        let result = await stickerContract.methods.tokenInfo(tokenId).call();
                        let token = {blockNumber, tokenIndex: result.tokenIndex, tokenId, quantity: result.tokenSupply,
                            royalties:result.royaltyFee, royaltyOwner: result.royaltyOwner, holder: result.royaltyOwner,
                            createTime: result.createTime, updateTime: result.updateTime}

                        token.tokenIdHex = '0x' + new BigNumber(tokenId).toString(16);

                        let tokenCID = result.tokenUri.split(":")[2];
                        let response = await fetch(config.ipfsNodeUrl + tokenCID);
                        let data = await response.json();
                        token.tokenJsonVersion = data.version;
                        token.type = data.type;
                        token.name = data.name;
                        token.description = data.description;

                        if(blockNumber > config.upgradeBlock) {
                            let extraInfo = await stickerContract.methods.tokenExtraInfo(tokenId).call();
                            if(extraInfo.didUri !== '') {
                                token.didUri = extraInfo.didUri;

                                let creatorCID = extraInfo.didUri.split(":")[2];
                                let response = await fetch(config.ipfsNodeUrl + creatorCID);
                                token.did = await response.json();

                                logger.info(`[TokenInfo] New token info: ${JSON.stringify(token)}`)
                                await pasarDBService.replaceDid({address: result.royaltyOwner,didStr: token.did.did, did: token.did});
                            }
                        }

                        if(token.type === 'feeds-channel') {
                            token.tippingAddress = data.tippingAddress;
                            token.entry = data.entry;
                            token.avatar = data.avatar;
                            await stickerDBService.replaceGalleriaToken(token);
                        } else {
                            token.thumbnail = data.thumbnail;
                            token.asset = data.image;
                            token.kind = data.kind;
                            token.size = data.size;
                            token.adult = data.adult ? data.adult : false;
                            await stickerDBService.replaceToken(token);
                        }
                    } catch (e) {
                        console.log(`[TokenInfo] Sync error at ${event.blockNumber} ${tokenId}`);
                        console.log(e);
                    }
                } else {
                    await stickerDBService.updateToken(tokenId, to, timestamp);
                }
            })
            tokenInfoSyncJobCurrent = toBlock + 1;
        }).catch(error => {
            console.log(error);
            console.log("[TokenInfo] Sync Ending ...");
        })
    });

    /**
     * transferSingleWithMemo event
     */
    schedule.scheduleJob({start: new Date(now + 3 * 60 * 1000), rule: '50 * * * * *'}, async () => {
        if(tokenInfoMemoSyncJobCurrent <= config.upgradeBlock && tokenInfoMemoSyncJobCurrent <= currentHeight) {
            const tempBlockNumber = tokenInfoMemoSyncJobCurrent + step
            const toBlock = Math.min(tempBlockNumber, currentHeight, config.upgradeBlock);
            console.log(`[TokenInfoMemo] ${tokenInfoMemoSyncJobCurrent} ~ ${toBlock} Sync have not start yet!`)
            tokenInfoMemoSyncJobCurrent = toBlock + 1;
            return;
        }

        if(tokenInfoMemoSyncJobCurrent > currentHeight) {
            console.log(`[TokenInfoMemo] Sync ${tokenInfoMemoSyncJobCurrent} finished`)
            return;
        }

        const tempBlockNumber = tokenInfoMemoSyncJobCurrent + step
        const toBlock = Math.min(tempBlockNumber, currentHeight);

        console.log(`[TokenInfoMemo] Sync ${tokenInfoMemoSyncJobCurrent} ~ ${toBlock} ...`)

        stickerContractWs.getPastEvents('TransferSingleWithMemo', {
            fromBlock: tokenInfoMemoSyncJobCurrent, toBlock
        }).then(events => {
            events.forEach(async event => {
                let from = event.returnValues._from;
                let to = event.returnValues._to;
                let tokenId = event.returnValues._id;
                let value = event.returnValues._value;
                let memo = event.returnValues._memo ? event.returnValues._memo : "";
                let blockNumber = event.blockNumber;
                let timestamp = (await web3Rpc.eth.getBlock(blockNumber)).timestamp;

                let transferEvent = {tokenId, blockNumber, timestamp, from, to, value, memo};
                await stickerDBService.addEvent(transferEvent);
                await stickerDBService.updateToken(tokenId, to, timestamp);
            })
            tokenInfoMemoSyncJobCurrent = toBlock + 1;
        }).catch(error => {
            console.log(error);
            console.log("[TokenInfo] Sync Ending ...");
        })
    })
})
