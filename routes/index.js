let express = require('express');
let router = express.Router();
let dbService = require('../service/indexDBService');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/* Used for service check. */
router.get('/check', function(req, res) {
    res.json({code: 200, message: 'success'});
});

/* Get feeds service github latest info */
router.get('/github', function (req, res) {
    fetch('https://api.github.com/repos/elastos-trinity/feeds-service/releases/latest',
        {
            method: 'GET',
            headers: {
                'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36'
            },
        }
    ).then(result => {
        return result.json();
    }).then(result => {
        res.json(result);
    })
})

router.get('/ip', function (req, res) {
    let ip = req.headers['x-forwarded-for']
    res.json({code: 200, message: 'success', data: {ip}});
})

router.post('/register', function(req, res) {
    let feedsSource = req.body;
    if(!feedsSource.did || !feedsSource.url || !feedsSource.name) {
        res.json({code: 400, message: 'required parameter absence'})
        return;
    }

    dbService.register(feedsSource).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/get', function(req, res) {
    let did = req.query.did;
    if(!did) {
        res.json({code: 400, message: 'parameter absence'})
        return;
    }

    dbService.get(did).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
})

router.post('/update', function(req, res) {
    let feedsSource = req.body;
    if(!feedsSource.did) {
        res.json({code: 400, message: 'required parameter absence'})
        return;
    }

    dbService.update(feedsSource).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/remove', function(req, res) {
    let did = req.query.did;
    if(!did) {
        res.json({code: 400, message: 'bad request'})
        return;
    }

    dbService.remove(did).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

router.get('/listAll', function(req, res) {
    dbService.listAll().then(result => {
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

    dbService.listPage(start, pageSize).then(result => {
        res.json(result);
    }).catch(error => {
        console.log(error);
        res.json({code: 500, message: 'server error'});
    })
});

module.exports = router;
