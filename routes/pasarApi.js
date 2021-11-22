let express = require('express');
let router = express.Router();
let indexDBService = require('../service/indexDBService');
let pasarDBService = require('../service/pasarDBService');

router.post('/register', function(req, res) {
    let nftToken = req.body;
    if(!nftToken.tokenId || !nftToken.name ) {
        res.json({code: 400, message: 'required parameter absence'})
        return;
    }

    indexDBService.registerNFT(nftToken).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/get', function(req, res) {
    let tokenId = req.query.tokenId;
    if(!tokenId) {
        res.json({code: 400, message: 'parameter absence'})
        return;
    }

    indexDBService.getNFT(tokenId).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

router.get('/remove', function(req, res) {
    let tokenId = req.query.tokenId;
    if(!tokenId) {
        res.json({code: 400, message: 'bad request'})
        return;
    }

    indexDBService.removeNFT(tokenId).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/list', function(req, res) {
    let pageNumStr = req.query.pageNum;
    let pageSizeStr = req.query.pageSize;

    let pageNum, pageSize;

    try {
        if(pageNumStr) {
            pageNum = parseInt(pageNumStr);
            if(!pageSizeStr) {
                pageSize = 20;
            } else {
                pageSize = parseInt(pageSizeStr);
            }
        }

        if(pageNum < 1 || pageSize < 1) {
            res.json({code: 400, message: 'bad request'})
            return;
        }
    }catch (e) {
        console.log(e);
        res.json({code: 400, message: 'bad request'});
        return;
    }

    indexDBService.listNFT(pageNum, pageSize).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/listPasarOrder', function(req, res) {
    let pageNumStr = req.query.pageNum;
    let pageSizeStr = req.query.pageSize;
    let blockNumberStr = req.query.blockNumber;
    let orderState = req.query.orderState;
    let sort = req.query.sort === "asc" ? 1 : -1;

    let pageNum, pageSize, blockNumber;

    try {
        if(pageNumStr) {
            pageNum = parseInt(pageNumStr);
            if(!pageSizeStr) {
                pageSize = 20;
            } else {
                pageSize = parseInt(pageSizeStr);
            }
        }

        if(blockNumberStr) {
            blockNumber = parseInt(blockNumberStr);
        }

        if(pageNum < 1 || pageSize < 1) {
            res.json({code: 400, message: 'bad request'})
            return;
        }
    }catch (e) {
        console.log(e);
        res.json({code: 400, message: 'bad request'});
        return;
    }

    pasarDBService.listPasarOrder(pageNum, pageSize, blockNumber, orderState, sort).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/whitelist', function(req, res) {
    let address = req.query.address;

    pasarDBService.getWhitelist(address).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

router.get('/getDidByAddress', function(req, res) {
    let address = req.query.address;

    pasarDBService.getDidByAddress(address).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

module.exports = router;
