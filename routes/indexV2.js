let express = require('express');
let router = express.Router();
let dbService = require('../service/indexDBService');

router.post('/register', function(req, res) {
    let feedsSource = req.body;
    if(!feedsSource.did || !feedsSource.url || !feedsSource.name || !feedsSource.feedsUrlHash) {
        res.json({code: 400, message: 'required parameter absence'})
        return;
    }

    dbService.registerV2(feedsSource).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/get', function(req, res) {
    let feedsUrlHash = req.query.feedsUrlHash;
    if(!feedsUrlHash) {
        res.json({code: 400, message: 'parameter absence'})
        return;
    }

    dbService.getV2(feedsUrlHash).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

router.post('/update', function(req, res) {
    let feedsSource = req.body;
    if(!feedsSource.feedsUrlHash) {
        res.json({code: 400, message: 'required parameter absence'})
        return;
    }

    dbService.updateV2(feedsSource).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/remove', function(req, res) {
    let feedsUrlHash = req.query.feedsUrlHash;
    if(!feedsUrlHash) {
        res.json({code: 400, message: 'bad request'})
        return;
    }

    dbService.removeV2(feedsUrlHash).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/listAll', function(req, res) {
    dbService.listAllV2().then(result => {
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

    dbService.listPageV2(start, pageSize).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

module.exports = router;
