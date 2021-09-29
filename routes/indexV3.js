let express = require('express');
let router = express.Router();
let dbService = require('../service/indexDBService');

router.get('/get', function(req, res) {
    let feedsUrlHash = req.query.feedsUrlHash;
    if(!feedsUrlHash) {
        res.json({code: 400, message: 'parameter absence'})
        return;
    }

    dbService.getV3(feedsUrlHash).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

router.get('/getAvatar', function (req, res) {
    let feedsUrlHash = req.query.feedsUrlHash;
    if(!feedsUrlHash) {
        res.json({code: 400, message: 'parameter absence'})
        return;
    }
    dbService.getAvatarV3(feedsUrlHash).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

router.post('/getAvatar', function (req, res) {
    let feedsUrlHashList = req.body;
    if(!feedsUrlHashList || typeof feedsUrlHashList !== 'object'
        || !feedsUrlHashList.length || feedsUrlHashList.length === 0) {
        res.json({code: 400, message: 'required parameter absence'})
        return;
    }
    dbService.getAvatarListV3(feedsUrlHashList).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})


router.get('/listAll', function(req, res) {
    dbService.listAllV3().then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/listPage', function(req, res) {
    let pageNum = parseInt(req.query.pageNum);
    let pageSize = parseInt(req.query.pageSize);
    if(isNaN(pageNum) || pageNum < 1 || isNaN(pageSize) || pageSize < 1) {
        res.json({code: 400, message: 'bad request'})
        return;
    }

    let start = (pageNum - 1) * pageSize;

    dbService.listPageV3(start, pageSize).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

module.exports = router;
