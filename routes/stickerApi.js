let express = require('express');
let router = express.Router();
let stickerDBService = require('../service/stickerDBService');
const BigNumber = require('bignumber.js');

router.get('/listStickers', function(req, res) {
    let pageNumStr = req.query.pageNum;
    let pageSizeStr = req.query.pageSize;

    let pageNum, pageSize;

    try {
        pageNum = pageNumStr ? parseInt(pageNumStr) : 1;
        pageSize = pageSizeStr ? parseInt(pageSizeStr) : 10;

        if(pageNum < 1 || pageSize < 1) {
            res.json({code: 400, message: 'bad request'})
            return;
        }
    }catch (e) {
        console.log(e);
        res.json({code: 400, message: 'bad request'});
        return;
    }

    stickerDBService.listStickers(pageNum, pageSize).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/search', function(req, res) {
    let keyword = req.query.key;

    if(!keyword) {
        res.json({code: 400, message: 'bad request'})
        return;
    }

    if(keyword.startsWith('0x') && keyword.length > 42) {
        keyword = new BigNumber(keyword).toFormat({prefix:""});
    }

    stickerDBService.query(keyword).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

module.exports = router;
