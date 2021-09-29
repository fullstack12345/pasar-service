const schedule = require('node-schedule');
let Web3 = require('web3');
let pasarDbService = require('./service/pasarOrderDBService');
let config = require('./config');
let pasarContractABI = require('./pasarABI');
let stickerContractABI = require('./stickerABI');

module.exports = {
    run: function() {

        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

        let web3 = new Web3(config.escWsUrl);
        let pasarContract = new web3.eth.Contract(pasarContractABI, config.pasarContract);

        let web3Sticker = new Web3(config.escRpcUrl);
        let stickerContract = new web3Sticker.eth.Contract(stickerContractABI, config.stickerContract);

        let isGetForSaleOrderJobRun = false;
        let now = Date.now();

        let orderForSaleJobId = schedule.scheduleJob(new Date(now + 60 * 1000), async () => {
            logger.info("[OrderForSale] Sync Starting ...")
            isGetForSaleOrderJobRun = true;
            let lastHeight = await pasarDbService.getLastPasarOrderSyncHeight('OrderForSale');
            logger.info("[OrderForSale] Sync last height: " + lastHeight)
            pasarContract.events.OrderForSale({fromBlock: lastHeight + 1}, function (error, event) {
                if(error) {
                    logger.info("[OrderForSale] Sync Ending ...")
                    isGetForSaleOrderJobRun = false
                } else {
                    let orderInfo = event.returnValues;
                    let pasarOrder = {orderId: orderInfo._orderId, event: event.event, seller: orderInfo._seller,
                        tokenId: orderInfo._tokenId, amount: orderInfo._amount, price: orderInfo._price, isTokenInfoSynced: false}

                    let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                        tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                        logIndex: event.logIndex, removed: event.removed, id: event.id}

                    pasarDbService.insertOrderEvent(orderEventDetail);
                    pasarDbService.insertOrder(pasarOrder);
                }
            })
        });

        let orderFilledJobId = schedule.scheduleJob(new Date(now + 2*60*1000), async () => {
            logger.info("[OrderFilled] Sync Starting ...")
            let lastHeight = await pasarDbService.getLastPasarOrderSyncHeight('OrderFilled');
            pasarContract.events.OrderFilled({fromBlock: lastHeight + 1}, function (error, event) {
                if(error) {
                    logger.info("[OrderFilled] Sync Ending ...")
                } else {
                    let orderInfo = event.returnValues;
                    let pasarOrder = {orderId: orderInfo._orderId, event: event.event, seller: orderInfo._seller,
                        buyer: orderInfo._buyer, copyrightOwner: orderInfo._copyrightOwner, price: orderInfo._price,
                        royalty: orderInfo._royalty}

                    let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                        tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                        logIndex: event.logIndex, removed: event.removed, id: event.id}

                    pasarDbService.insertOrderEvent(orderEventDetail);
                    pasarDbService.updateOrder(pasarOrder);
                }
            })
        });

        let orderCanceledJobId = schedule.scheduleJob(new Date(now + 2*60*1000), async () => {
            logger.info("[OrderCanceled] Sync Starting ...")
            let lastHeight = await pasarDbService.getLastPasarOrderSyncHeight('OrderCanceled');
            pasarContract.events.OrderCanceled({fromBlock: lastHeight + 1}, function (error, event) {
                if(error) {
                    logger.info("[OrderCanceled] Sync Ending ...")
                } else {
                    let orderInfo = event.returnValues;
                    let pasarOrder = {orderId: orderInfo._orderId, event: event.event, seller: orderInfo._seller}

                    let orderEventDetail = {orderId: orderInfo._orderId, event: event.event, blockNumber: event.blockNumber,
                        tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                        logIndex: event.logIndex, removed: event.removed, id: event.id}

                    pasarDbService.insertOrderEvent(orderEventDetail);
                    pasarDbService.updateOrder(pasarOrder);
                }
            })
        });

        let orderPriceChangedJobId = schedule.scheduleJob(new Date(now + 3*60*1000), async () => {
            logger.info("[OrderPriceChanged] Sync Starting ...")
            let lastHeight = await pasarDbService.getLastPasarOrderSyncHeight('OrderPriceChanged');
            pasarContract.events.OrderPriceChanged({fromBlock: lastHeight + 1}, function (error, event) {
                if(error) {
                    logger.info("[OrderPriceChanged] Sync Ending ...")
                } else {
                    let orderInfo = event.returnValues;
                    let pasarOrder = {orderId: orderInfo[1], price: orderInfo[3]}

                    let orderEventDetail = {orderId: orderInfo[1], event: event.event, blockNumber: event.blockNumber,
                        tHash: event.transactionHash, tIndex: event.transactionIndex, blockHash: event.blockHash,
                        logIndex: event.logIndex, removed: event.removed, id: event.id}

                    pasarDbService.insertOrderEvent(orderEventDetail);
                    pasarDbService.updateOrder(pasarOrder);
                }
            })
        });

        schedule.scheduleJob({start: new Date(now + 60 * 5 * 1000), rule: '0 */2 * * * *'}, () => {
            logger.info("[TokenInfo] Sync Starting ...")
            pasarDbService.getSynchronizedToken().then(result => {
                result.forEach(item => {
                    let tokenId = item.tokenId;
                    stickerContract.methods.tokenInfo(tokenId).call().then(async result => {
                        let tokenCID = result.tokenUri.split(":")[2];
                        let token = {tokenId, quantity: result.tokenSupply, royalties:result.royaltyFee,
                            royaltyOwner: result.royaltyOwner, createTime: result.createTime, updateTime: result.updateTime}

                        let response = await fetch(config.ipfsNodeUrl + tokenCID);
                        let data = await response.json();
                        token.kind = data.kind;
                        token.type = data.type;
                        token.asset = data.image;
                        token.name = data.name;
                        token.description = data.description;
                        token.thumbnail = data.thumbnail;

                        await pasarDbService.replaceToken(token);
                        await pasarDbService.updateOrderTokenSync(item.orderId);
                    });
                })
            })
        });

        schedule.scheduleJob({start: new Date(now + 61 * 1000), rule: '0 */2 * * * *'}, () => {
            if(!isGetForSaleOrderJobRun) {
                let now = Date.now();
                orderForSaleJobId.reschedule(new Date(now + 60 * 1000));
                orderFilledJobId.reschedule(new Date(now + 2 * 60 * 1000));
                orderCanceledJobId.reschedule(new Date(now + 2 * 60 * 1000));
                orderPriceChangedJobId.reschedule(new Date(now + 3 * 60 * 1000));
            }
        });
    }
}
