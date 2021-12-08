# Pasar-Assist-Service
The assist service keep synchrozing all collectibles from Pasar contract on bockchain to deployable server as an intermediate service for 3rd applications to browse all collectible data.

## 部署

### 安装nodejs mongodb pm2

```bash
$ sudo apt-get update

$ curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
$ sudo apt-get install -y nodejs

$ sudo apt-get install mongodb

$ sudo npm install -g pm2
$ sudo pm2 install pm2-intercom
```
> 本例假设用户使用 `Ubuntu 18.04` 其他安装方式参考官方文档

### 创建数据库

```bash
$ mongo
> use feeds_sources;
> db.pasar_order.createIndex({orderId: 1}, {unique: true});
> db.pasar_token.createIndex({tokenId: 1}, {unique: true});
```

### 运行服务

```bash
git clone https://github.com/elastos-trinity/pasar-assist-service.git
cd pasar-assist-service
npm install
pm2 start bin/www
```

## API

### Pasar API

调用URL: `https://example.com/pasar/api/v1`

1. 注册

```
url:          /register
method:       POST
content-type: application/json
parameter:    tokenId (必填)
              name (必填)
              description (选填)
              author (选填)
              created (选填)
              updated (选填)
              price (选填)
              currency (选填)
              likes(选填)
              thumnail(选填)
              
response:     {"code": 200, "message": "success"}  成功  
              {"code": 400, "message": <descripton>}  参数错误  
              {"code": 500, "message": <descripton>}  服务器错误  
```

2. 根据 `tokenId` 获取

```
url:          /get  
method:       GET
parameter:    tokenId (必填)

response:     {"code": 200, "message": "success"}  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

3. 删除

```
url:          /remove  
method:       GET
parameter:    tokenId (必填)

response:     {"code": 200, "message": "success", data: {...}}  数据存在
              {"code": 200, "message": "success"}  数据不存在
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

4. (分页)列表

```
url:          /list
method:       GET
parameter:    pageNum (页码 从1开始 选填)
              pageSize (每页条目 大于0 选填)
              
response:     {"code": 200, "message": "success", data: {total: 100, result: [{}, ...]}}  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

5. (分页)获取 `NFT Order`

```
url:          /listPasarOrder
method:       GET
parameter:    pageNum (页码 从1开始 选填 默认1)
              pageSize (每页条目 大于0 选填 默认10)
              blockNumber (返回本高度之后的数据 选填)
              orderState (订单状态： 1(OrderForSale), 2(OrderCanceled), 3(OrderFilled))
              sort (排序方式: 默认按BlockNumber降序， 传 asc表示按BlockNumber升序)
              
response:     {"code": 200, "message": "success", data: {total: 100, result: [{}, ...]}}  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

6. 获取 `Whitelist`

```
url:          /whitelist
method:       GET
parameter:    address (地址 选填 未传地址返回全部 whitelist)
              
response:     {"code": 200, "message": "success", data: [{}, ...]}  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

### Sticker API

调用URL: `https://example.com/sticker/api/v1`

1. (分页)获取 `stickers`

```
url:          /listStickers
method:       GET
parameter:    pageNum (页码 从1开始 选填 默认1)
              pageSize (每页条目 大于0 选填 默认10)
              
response:     {"code": 200, "message": "success", data: {total: 100, result: [{}, ...]}}  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

2. 搜索 `stickers`

```
url:          /search
method:       GET
parameter:    key (搜索关键字 必填 可以根据 tokenId royaltyOwner 字段进行精确匹配，或者根据 name description 进行模糊搜索)
              
response:     {"code": 200, "message": "success", data: [{}, ...]  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

3. 查询 `stickers`

```
url:          /query
method:       GET
parameter:    creator ( token 创建者 和 owner 参数必选其一)
              owner ( token 拥有者 和 creator 参数必选其一)
              
response:     {"code": 200, "message": "success", data: [{}, ...]  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

4. 查询 `stickers` 交易历史

```
url:          /tokenTrans
method:       GET
parameter:    tokenId ( tokenID 必选)
              
response:     {"code": 200, "message": "success", data: [{}, ...]  成功
              {"code": 400, "message": <descripton>}  参数错误
              {"code": 500, "message": <descripton>}  服务器错误
```

## API V2

1. Query collectible by tokenId

```
GET /collectible/tokenId/{tokenId}
```

2. Query collectibles by creator

```
GET /collectibles/creator/{creator}
```

3. Query collectibles by owner

```
GET /collectibles/owner/{owner}
```

4. Query collectibles by name & description

```
GET /collectibles/keyword/{keyword}
```

5. List all collectibles

```
GET /collectibles/all
```

6. List all creators

```
GET /creators/all
```

7. Query filled orders by tokenId

```
GET /orders/filled/tokenId/{tokenId}
```

8. Query filled orders by seller

```
GET /orders/filled/seller/{seller}
```

9. Query filled orders by buyer

```
GET /orders/filled/buyer/{buyer}
```

10. Query filled orders by collectible name & description

```
GET /orders/filled/keyword/{keyword}
```

10. List all filled orders

```
GET /orders/filled/all
```

11. Query canceled orders by tokenId

```
GET /orders/canceled/tokenId/{tokenId}
```

12. Query canceled orders by seller

```
GET /orders/canceled/seller/{seller}
```

13. Query price changed orders by tokenId

```
GET /orders/priceChanged/tokenId/{tokenId}
```

14. Query price changed orders by seller

```
GET /orders/priceChanged/seller/{seller}
```

15. Query on-sale orders by tokenId

```
GET /orders/sale/tokenId/{tokenId}
```

16. Query on-sale orders by seller address

```
GET /orders/sale/seller/{seller}
```

17. Query on-sale orders by royalty owner

```
GET /orders/sale/owner/{owner}
```

18. Query giveaways by tokenId

```
GET /transfers/tokenId/{tokenId}
```

19. Query giveaways by sending address

```
GET /transfers/sender/{sender}
```

20. Query giveaways by receiver address

```
GET /transfers/receiver/{receiver}
```

21.Query giveaways by royalty owner

```
GET /transfers/owner/{owner}
```

22. Query giveaways by collectible name & description

```
GET /transfers/owner/{owner}
```

23. Query transaction volume in total to the specific collectible token

```
GET /transVolume/tokenId/{tokenId}
```

24. Query transaction volume in total to specific creator address

```
GET /transVolume/creator/{creator}
```

25. Query transaction volume in total to specific seller address

```
GET /transVolume/seller/{seller}
```

26. Query transaction volume in total to specific receiver address

```
GET /transVolume/receiver/{seller}
```
