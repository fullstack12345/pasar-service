const schedule = require('node-schedule');
let Web3 = require('web3');
let pasarDBService = require('./service/pasarDBService');
let stickerDBService = require('./service/stickerDBService');
let config = require('./config');
let pasarContractABI = require('./pasarABI');
let stickerContractABI = require('./stickerABI');
let sendMail = require('./send_mail');
const BigNumber = require("bignumber.js");

module.exports = {
    run: function() {
        logger.info("========= Pasar Assist Service start =============")

        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

        const burnAddress = '0x0000000000000000000000000000000000000000';

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

        let isGetForSaleOrderJobRun = false;
        let isGetTokenInfoJobRun = false;
        let isGetTokenInfoWithMemoJobRun = false;
        let now = Date.now();

        let recipients = [];
        recipients.push('lifayi2008@163.com');

        async function updateOrder(orderId, blockNumber) {
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

                        await pasarDBService.replaceDid({address: result.sellerAddr, didStr: pasarOrder.sellerDid.did, did: pasarOrder.sellerDid});
                    }
                }
                let res = await pasarDBService.updateOrInsert(pasarOrder);
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

        async function dealWithNewToken(blockNumber,tokenId) {
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
                logger.info(`[TokenInfo] Sync error at ${blockNumber} ${tokenId}`);
                logger.info(e);
            }
        }

        let orderForSaleJobId = schedule.scheduleJob(new Date(now + 60 * 1000), async () => {
            isGetForSaleOrderJobRun = true;
            let lastHeight = await pasarDBService.getLastPasarOrderSyncHeight('OrderForSale');

            logger.info(`[OrderForSale] Sync start from height: ${lastHeight}`);

            pasarContractWs.events.OrderForSale({
                fromBlock: lastHeight + 1
            }).on("error", function (error) {
                logger.info(error);
                logger.info("[OrderForSale] Sync Ending ...")
                isGetForSaleOrderJobRun = false
            }).on("data", async function (event) {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id}

                logger.info(`[OrderForSale] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                await pasarDBService.insertOrderEvent(orderEventDetail);
                await updateOrder(orderInfo._orderId, event.blockNumber);
            })
        });

        let orderPriceChangedJobId = schedule.scheduleJob(new Date(now + 2 * 60 * 1000), async () => {
            let lastHeight = await pasarDBService.getLastPasarOrderSyncHeight('OrderPriceChanged');

            logger.info(`[OrderPriceChanged] Sync start from height: ${lastHeight}`);

            pasarContractWs.events.OrderPriceChanged({
                fromBlock: lastHeight + 1
            }).on("error", function (error) {
                logger.info(error);
                logger.info("[OrderPriceChanged] Sync Ending ...");
            }).on("data", async function (event) {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id,
                    data: {oldPrice: orderInfo._oldPrice, newPrice: orderInfo._newPrice}}

                logger.info(`[OrderPriceChanged] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                await pasarDBService.insertOrderEvent(orderEventDetail);
                await updateOrder(orderInfo._orderId, event.blockNumber);
            })
        });

        let orderFilledJobId = schedule.scheduleJob(new Date(now + 3 * 60 * 1000), async () => {
            let lastHeight = await pasarDBService.getLastPasarOrderSyncHeight('OrderFilled');

            logger.info(`[OrderFilled] Sync start from height: ${lastHeight}`);

            pasarContractWs.events.OrderFilled({
                fromBlock: lastHeight + 1
            }).on("error", function (error) {
                logger.info(error);
                logger.info("[OrderFilled] Sync Ending ...");
            }).on("data", async function (event) {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id}

                logger.info(`[OrderFilled] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                await pasarDBService.insertOrderEvent(orderEventDetail);
                await updateOrder(orderInfo._orderId, event.blockNumber);
            })
        });

        let orderCanceledJobId = schedule.scheduleJob(new Date(now + 3 * 60 * 1000), async () => {
            let lastHeight = await pasarDBService.getLastPasarOrderSyncHeight('OrderCanceled');

            logger.info(`[OrderCanceled] Sync start from height: ${lastHeight}`);

            pasarContractWs.events.OrderCanceled({
                fromBlock: lastHeight + 1
            }).on("error", function (error) {
                logger.info(error);
                logger.info("[OrderCanceled] Sync Ending ...");
            }).on("data", async function (event) {
                let orderInfo = event.returnValues;
                let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                    tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                    logIndex: event.logIndex, removed: event.removed, id: event.id};

                logger.info(`[OrderCanceled] orderEventDetail: ${JSON.stringify(orderEventDetail)}`)
                await pasarDBService.insertOrderEvent(orderEventDetail);
                await updateOrder(orderInfo._orderId, event.blockNumber);
            })
        });

        let tokenInfoSyncJobId = schedule.scheduleJob(new Date(now + 60 * 1000), async () => {
            let lastHeight = await stickerDBService.getLastStickerSyncHeight();
            isGetTokenInfoJobRun = true;
            logger.info(`[TokenInfo] Sync Starting ... from block ${lastHeight + 1}`)

            stickerContractWs.events.TransferSingle({
                fromBlock: lastHeight + 1
            }).on("error", function (error) {
                logger.info(error);
                logger.info("[TokenInfo] Sync Ending ...");
                isGetTokenInfoJobRun = false
            }).on("data", async function (event) {
                let blockNumber = event.blockNumber;
                let from = event.returnValues._from;
                let to = event.returnValues._to;

                //After contract upgrade, this job just deal Mint and Burn event
                if(from !== burnAddress && to !== burnAddress && blockNumber > config.upgradeBlock) {
                    return;
                }

                let tokenId = event.returnValues._id;
                let value = event.returnValues._value;
                let timestamp = (await web3Rpc.eth.getBlock(blockNumber)).timestamp;

                let transferEvent = {tokenId, blockNumber, timestamp, from, to, value}
                logger.info(`[TokenInfo] tokenEvent: ${JSON.stringify(transferEvent)}`)
                await stickerDBService.replaceEvent(transferEvent);

                if(to === burnAddress) {
                    // await stickerDBService.burnToken(tokenId);
                } else if(from === burnAddress) {
                    await dealWithNewToken(blockNumber, tokenId)
                } else {
                    await stickerDBService.updateToken(tokenId, to, timestamp);
                }
            })
        });

        let tokenInfoWithMemoSyncJobId = schedule.scheduleJob(new Date(now + 60 * 1000), async () => {
            let lastHeight = await stickerDBService.getLastStickerSyncHeight();
            isGetTokenInfoWithMemoJobRun = true;
            logger.info(`[TokenInfoWithMemo] Sync Starting ... from block ${lastHeight + 1}`)

            stickerContractWs.events.TransferSingleWithMemo({
                fromBlock: lastHeight + 1
            }).on("error", function (error) {
                logger.info(error);
                logger.info("[TokenInfoWithMemo] Sync Ending ...");
                isGetTokenInfoWithMemoJobRun = false
            }).on("data", async function (event) {
                let from = event.returnValues._from;
                let to = event.returnValues._to;
                let tokenId = event.returnValues._id;
                let value = event.returnValues._value;
                let memo = event.returnValues._memo ? event.returnValues._memo : "";
                let blockNumber = event.blockNumber;
                let timestamp = (await web3Rpc.eth.getBlock(blockNumber)).timestamp;

                let transferEvent = {tokenId, blockNumber, timestamp, from, to, value, memo}
                logger.info(`[TokenInfoWithMemo] transferToken: ${JSON.stringify(transferEvent)}`)
                await stickerDBService.addEvent(transferEvent);
                await stickerDBService.updateToken(tokenId, to, timestamp);
            })
        });

        schedule.scheduleJob({start: new Date(now + 61 * 1000), rule: '0 */2 * * * *'}, () => {
            let now = Date.now();

            if(!isGetForSaleOrderJobRun) {
                orderForSaleJobId.reschedule(new Date(now + 60 * 1000));
                orderPriceChangedJobId.reschedule(new Date(now + 2 * 60 * 1000));
                orderFilledJobId.reschedule(new Date(now + 3 * 60 * 1000));
                orderCanceledJobId.reschedule(new Date(now + 3 * 60 * 1000));
            }

            if(!isGetTokenInfoJobRun) {
                tokenInfoSyncJobId.reschedule(new Date(now + 60 * 1000))
            }

            if(!isGetTokenInfoWithMemoJobRun) {
                tokenInfoWithMemoSyncJobId.reschedule(new Date(now + 60 * 1000))
            }
        });

        /**
         *  Pasar order volume sync check
         */
        schedule.scheduleJob({start: new Date(now + 60 * 1000), rule: '*/2 * * * *'}, async () => {
            let orderCount = await pasarDBService.pasarOrderCount();
            let orderCountContract = parseInt(await pasarContract.methods.getOrderCount().call());
            logger.info(`[Order Count Check] DbCount: ${orderCount}   ContractCount: ${orderCountContract}`)
            if(orderCountContract !== orderCount) {
                await sendMail(`Pasar Order Sync [${config.serviceName}]`,
                    `pasar assist sync service sync failed!\nDbCount: ${orderCount}   ContractCount: ${orderCountContract}`,
                    recipients.join());
            }
        });

        /**
         *  Sticker volume sync check
         */
        schedule.scheduleJob({start: new Date(now + 60 * 1000), rule: '*/2 * * * *'}, async () => {
            let stickerCount = await stickerDBService.stickerCount();
            let stickerCountContract = parseInt(await stickerContract.methods.totalSupply().call());
            logger.info(`[Token Count Check] DbCount: ${stickerCount}   ContractCount: ${stickerCountContract}`)
            if(stickerCountContract !== stickerCount) {
                await sendMail(`Sticker Sync [${config.serviceName}]`,
                    `pasar assist sync service sync failed!\nDbCount: ${stickerCount}   ContractCount: ${stickerCountContract}`,
                    recipients.join());
            }
        });

        /**
         *  Pasar order event volume check
         */
        let pasarOrderEventCheckBlockNumber = config.pasarContractDeploy;
        schedule.scheduleJob({start: new Date(now + 10* 60 * 1000), rule: '*/5 * * * *'}, async () => {
            let nowBlock = await web3Rpc.eth.getBlockNumber();
            let fromBlock = pasarOrderEventCheckBlockNumber;
            let tempBlock = pasarOrderEventCheckBlockNumber + 20000
            let toBlock =  tempBlock > nowBlock ? nowBlock : tempBlock;
            let orderCount = await pasarDBService.pasarOrderEventCount(fromBlock, toBlock);

            let orderForSaleEvent = await pasarContract.getPastEvents('OrderForSale', {fromBlock, toBlock});
            let orderFilledEvent = await pasarContract.getPastEvents('OrderFilled', {fromBlock, toBlock});
            let orderCanceled = await pasarContract.getPastEvents('OrderCanceled', {fromBlock, toBlock});
            let orderPriceChanged = await pasarContract.getPastEvents('OrderPriceChanged', {fromBlock, toBlock});
            let contractOrderCount = orderForSaleEvent.length + orderFilledEvent.length + orderCanceled.length + orderPriceChanged.length;

            if(orderCount !== contractOrderCount) {
                logger.info(`Order Event Count Check: StartBlock: ${fromBlock}    EndBlock: ${toBlock}`);
                logger.info(`Order Event Count Check: DBEventCount: ${orderCount}    ContractEventCount: ${contractOrderCount}`);
                await sendMail(`Pasar Order Sync [${config.serviceName}]`,
                    `pasar assist sync service sync failed!\nDbEventCount: ${orderCount}   ContractEventCount: ${contractOrderCount}`,
                    recipients.join());
            }

            pasarOrderEventCheckBlockNumber = toBlock + 1;
        });

        /**
         *  Sticker transfer event volume check
         */
        let stickerEventCheckBlockNumber = config.stickerContractDeploy;
        schedule.scheduleJob({start: new Date(now + 10* 60 * 1000), rule: '*/5 * * * *'}, async () => {
            let nowBlock = await web3Rpc.eth.getBlockNumber();
            let fromBlock = stickerEventCheckBlockNumber;
            let tempBlock = stickerEventCheckBlockNumber + 20000
            let toBlock =  tempBlock > nowBlock ? nowBlock : tempBlock;
            let stickerEventCountDB = await stickerDBService.stickerOrderEventCount(fromBlock, toBlock);

            let stickerEvent = await stickerContract.getPastEvents('TransferSingle', {fromBlock, toBlock});
            let stickerEventCount = stickerEvent.length;

            if(stickerEventCountDB !== stickerEventCount) {
                logger.info(`Sticker Event Count Check: StartBlock: ${fromBlock}    EndBlock: ${toBlock}`);
                logger.info(`Sticker Event Count Check: DBEventCount: ${stickerEventCountDB}    ContractEventCount: ${stickerEventCount}`);
                await sendMail(`Pasar Order Sync [${config.serviceName}]`,
                    `pasar assist sync service sync failed!\nDbEventCount: ${stickerEventCountDB}   ContractEventCount: ${stickerEventCount}`,
                    recipients.join());
            }

            stickerEventCheckBlockNumber = toBlock + 1;
        });
    }
}
