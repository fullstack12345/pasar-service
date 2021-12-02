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


module.exports = router;
