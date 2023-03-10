import AppError from '../utils/AppError.js';
import conn from '../services/db.js';

//BLOCKS
//api/swaps?table=EpiWalletsUnfiltered&contract=&wallet=
export const getAllSwaps = (req, res, next) => {
  const Tables = ["ContractSwaps", "MainSwaps"];
  if (!Tables.includes(req.query.table))  return next(new AppError("No form data found", 404));
  if (!req.query.contract && !req.query.wallet) {
    conn.query(`SELECT * FROM ${req.query.table} group by wallet`, function (err, data, fields) {
      if(err) return next(new AppError(err))
      res.status(200).json({
        status: "success",
        length: data?.length,
        data: data,
      });
    });
    return;
  }
};
export const createSwap = async (req, res, next) => {
  if (!req.body) return next(new AppError("No form data found", 404));
  let { body } = req;

  //const _body = Object.values(body)

  const _body = body.map(b=>{
    return Object.values(b)
  })

  //Table Descriptions
  //ContractSwaps is the one that is focused on Wallets.

  //AllSwaps is the one that posts new swaps every block.

  //EpiWalletSwaps is the one where if an Epi wallet is detected we post to that wallet as well.

  //if those query parameters aren't met exit
  const Tables = ["ContractSwaps", "MainSwaps"];
  if (!Tables.includes(req.query.table))  return next(new AppError("No table was provided", 404));

  const result = conn.query(
    `INSERT INTO ${req.query.table} (blockNumber,symbol,contract,pairAddress,usdVolume,usdPrice,isBuy,txHash,wallet,router,etherPrice, marketCap, dateTime) VALUES(?);`.repeat(_body.length),_body, (err,data)=>{
      if (err) res.status(500).json({status: "error", err})
      else {
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
      }
    }
  );
  //console.log(result)
  return;

}

//POST /wallets/:contractcon
export const getWalletBuys = (req,res,next) => {
  const values = req.body;
  console.log(req.params.blockNumber)
  conn.query(
    `SELECT count(txHash) as count from MainSwaps where wallet in (?) and contract = "${req.params.contract}"`,
    [values],
    function (err, data, fields) {
      if (err) return next(new AppError(err, 500));
      res.status(200).json({
        status: "success",
        length: data?.length,
        data: data,
      });
    }

  )
}








  //for contract, what do i want to do?


export const getBlock = (req, res, next) => {
  // if (!req.params.contract) {
  //     res.status(404).json({status: "failure", data, length: data?.length});
  // }
  if (req.query.min) {  
    conn.query(
      "SELECT min(blockNumber) as minBlockNumber from ContractDetailswaps",
      function (err, data, fields) {
        if(err) return next(new AppError(err))
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
    });
  }
  else if (req.query.sortBySymbol) {
    conn.query(
      "SELECT contract, sum(usdVolume) as volume, max(symbol) as symbol, max(marketCap) as marketCap, max(usdPrice) as price, sum(IF(isBuy=1,isBuy*usdVolume, 0)) as sumBuys, sum(IF(isBuy=-1, usdVolume, 0)) as sumSells, sum(IF(isBuy=1, isBuy,0)) as totalBuys, sum(IF(isBuy=-1, isBuy*-1, 0)) as totalSells FROM MainSwaps WHERE blockNumber between ? and (select max(blockNumber)) GROUP BY contract ORDER BY sum(usdVolume) desc;",
      [req.params.blockNumber],
      function (err, data, fields) {
        if (err) return next(new AppError(err, 500));
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
      }
    );
  } else if(req.query.max) {
    conn.query(
      "SELECT max(blockNumber) as maxBlockNumber from MainSwaps",
      function (err, data, fields) {
        if(err) return next(new AppError(err))
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
    });
  }
  else if (req.query.count) {
    conn.query(
      "SELECT count(id) as count from ContractDetailswaps",
      function (err, data, fields) {
        if(err) return next(new AppError(err))
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
    });
  } else {
    conn.query(
      `SELECT * from MainSwaps where blockNumber=${req.params.blockNumber}`,
      function (err, data, fields) {
        if(err) return next(new AppError(err))
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
    });
  }
  // if (req.query.max) {
  //   conn.query(
  //     "SELECT contract, max(blockNumber) as latestBlock, max(pairAddress) as pairAddress from ContractDetailswaps where contract = ?", [req.params.contract],
  //     function (err, data, fields) {
  //       if(err) return next(new AppError(err))
  //       res.status(200).json({
  //         status: "success",
  //         length: data?.length,
  //         data: data,
  //       });
  //   });
  // }
  if (!req.query) {
    console.log('missing query')
  }
};

//epiwallets
//api/epiwalletsunfiltered/
//api/swaps?table=EpiWalletsUnfiltered&contract=&wallet=
// export const getAllContracts = (req, res, next) => {
//   conn.query("SELECT * FROM EpiWallets", function (err, data, fields) {
//     if(err) return next(new AppError(err))
//     res.status(200).json({
//       status: "success",
//       length: data?.length,
//       data: data,
//     });
//   });
// };



//CONTRACTDETAILS

export const getAllContracts = (req, res, next) => {
    conn.query("SELECT * from ContractDetails", function (err, data, fields) {
      if(err) return next(new AppError(err))
      res.status(200).json({
        status: "success",
        length: data?.length,
        data: data,
      });
    });
};

export const createContractOrGetMatchingContracts = (req, res, next) => {
  if (!req.body) return next(new AppError("No form data found", 404));
  if (req.query.matching) {
    const values = req.body;
    conn.query(
      "SELECT * from ContractDetails where contract in (?)",
      [values],
      function (err, data, fields) {
        if (err) return next(new AppError(err, 500));
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
      }

    )
  } else {
    conn.query(
      "INSERT INTO ContractDetails (symbol, contract, liqAddBlock, liqAddTimestamp, liqlockBlock, renounceBlock) VALUES(?)",
      [Object.values(req.body)],
      function (err, data, fields) {
        if (err) return next(new AppError(err, 500));
        res.status(201).json({
          status: "success",
          message: `contract ${req.body.contract} added!`,
        });
      }
    );
    }
};

//You could have a job to update liqlockblock or renounceblock;
//or just have topics take care of that. but right now, i dont know about that.

export const createContracts = async(req, res, next) => {
  if (!req.query.table) return next(new AppError("No table provided", 404));
  conn.query(`INSERT INTO ${req.query.table} (contract,symbol,dateTime, blockNumber, marketCap,price,${req.query.volume},totalBuys,totalSells,${req.query.buyRatio},ageInMinutes) VALUES(?);`.repeat(req.body.length)
    ,req.body.map(b=>Object.values(b)), function (err, data, fields) { if (err) return next(new AppError(err, 500));
    res.status(201).json({
      status: "success",
      message: `contract ${req.body.contract} added!`,
    });
  })
  
}


export const getContractsByBlockNumber = async (req, res, next) => {

  const { table, blocks } = req.query;
  if (!table || !blocks ) return next(new AppError("Missing a query parameter", 404));
  let query;
  if (!req.query.max) {
    //if not max we are doing lookback for backtesting the alerts.
    query = `select * from ${table} where blockNumber between (select max(blockNumber) from ${table})-${blocks} and (select max (blockNumber) from ${table}) `
  } else {
    //fill in later
    query = `select * from ${table} where blockNumber between (select max(blockNumber) from ${table})-${blocks} and (select max (blockNumber) from ${table}) `
  }
  conn.query(query,function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
}
  //const query = `select * from ${table} where blockNumber between (select ma)`

export const getAlertsQuery = async (req,res,next) => {
  const { volume,blocks } = req.query;
  if (!volume || !blocks ) return next(new AppError("Missing a query parameter", 404));
  const query = `select  MainSwaps.contract, max(MainSwaps.symbol) as symbol, sum(MainSwaps.usdVolume) as sm, max(MainSwaps.marketCap) as mc,  sum(IF(MainSwaps.isBuy=1,MainSwaps.isBuy,0)) as totalBuys,  sum(IF(MainSwaps.isBuy=1,MainSwaps.usdVolume,0))/(sum(IF(MainSwaps.isBuy=-1,MainSwaps.usdVolume,0))+sum(IF(MainSwaps.isBuy=1,MainSwaps.usdVolume,0))) as buyRatio, max(MainSwaps.usdPrice)/min(MainSwaps.usdPrice) as priceRatio, (max(MainSwaps.blockNumber)-max(ContractDetails.liqAddBlock))/5 as ageInMinutes, max(MainSwaps.pairAddress) as pairAddress from MainSwaps INNER JOIN ContractDetails ON ContractDetails.contract = MainSwaps.contract where MainSwaps.blockNumber between (select max(MainSwaps.blockNumber) from MainSwaps)-${blocks}  and (select max(MainSwaps.blockNumber) from MainSwaps) group by MainSwaps.contract having sm>${volume} order by sm, ageInMinutes desc;`
  conn.query(query, function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
}


export const getLookBackQuery_AnyTimeFrame = async (req,res,next) => {
  const { blocks } = req.query;
  if ( !blocks ) return next(new AppError("Missing a query parameter", 404));
  const query = `select  MainSwaps.contract, (select max(blockNumber) from MainSwaps)-${req.query.startBlocks}-${req.query.lookBackBlocks}-${req.query.blocks} as minBlock, (select max(blockNumber) from MainSwaps)-${req.query.startBlocks}-${req.query.lookBackBlocks} as maxBlock, max(MainSwaps.symbol) as symbol, sum(MainSwaps.usdVolume) as sm, max(MainSwaps.marketCap) as mc,  sum(IF(MainSwaps.isBuy=1,MainSwaps.isBuy,0)) as totalBuys,  sum(IF(MainSwaps.isBuy=1,MainSwaps.usdVolume,0))/(sum(IF(MainSwaps.isBuy=-1,MainSwaps.usdVolume,0))+sum(IF(MainSwaps.isBuy=1,MainSwaps.usdVolume,0))) as buyRatio, max(MainSwaps.usdPrice)/min(MainSwaps.usdPrice) as priceRatio, max(MainSwaps.pairAddress) as pairAddress from MainSwaps where MainSwaps.blockNumber between (select max(blockNumber) from MainSwaps)-${req.query.startBlocks}-${req.query.lookBackBlocks}-${req.query.blocks} and (select max(blockNumber) from MainSwaps)-${req.query.startBlocks}-${req.query.lookBackBlocks} and MainSwaps.contract="0x6f3277ad0782a7da3eb676b85a8346a100bf9c1c" group by MainSwaps.contract order by sm;`
  conn.query(query, function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
}

export const getLookBackQuery = async (req,res,next) => {
  let { table, blocks } = req.query;
  let blockNumber = req.query.blockNumber;
  if (!req.query.marketCap) req.query.marketCap = 1000000;
  if (!table) return next(new AppError("Missing a query parameter", 404));
  if (req.query.limit && req.query.contract) {
    // if (blocks == 0) blocks = `(select max(blockNumber) from ${table})`
      if (req.query.blockNumber == '1') blockNumber = `(select max(blockNumber) from ${table})`;
      //const query = `select * from ${table} where blockNumber <= ( select max(blockNumber) from ${table} )-${blocks} and marketCap < ${marketCap} and contract=${req.query.contract} limit ${req.query.limit};`
      const query = `select * from ${table} where blockNumber <= ${blockNumber} and contract="${req.query.contract}" order by blockNumber desc limit ${req.query.limit}`;
      conn.query(query, function (err, data, fields) {
        if(err) return next(new AppError(err))
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
      });
  } else {
    const query = `select * from ${req.query.table} where blockNumber between (select max(blockNumber) from ${table})-${blocks} and (select max(blockNumber) from ${table}) and marketCap < ${req.query.marketCap};`
    conn.query(query, function (err, data, fields) {
      if(err) return next(new AppError(err))
      res.status(200).json({
        status: "success",
        length: data?.length,
        data: data,
      });
    });
  }
}

export const customSql = async (req,res,next) => {
  let {sqlText} = req.query;
  const forbiddenWords = ['drop', 'delete', 'alter', 'update' ]
  for (let i in forbiddenWords) {
    if (sqlText.search(forbiddenWords[i]) > 0) return next(new AppError(`Used forbidden word ${forbiddenWords[i]}`, 404));
  }
  sqlText = sqlText.replace(/"/g, "").replace("%2B", "+");
  // res.status(200).json({
  //   status: "success",
  //   data: [sqlText.replace(/"/g, "")],
  // });
  conn.query(sqlText, function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
}

export const Web_MainSwapsGroupQuery = (req,res,next) => {

  console.log('fdsadasfdsfa')
  if (!req.query.blocks) req.query.blocks=300;
  if (!req.query.marketCap) req.query.marketCap = 1000000000;
  if (!req.query.volume) req.query.volume = 0;
  if (!req.query.totalBuys) req.query.totalBuys = 0;
  if (!req.query.buyRatio) req.query.buyRatio = 0;
  console.log('fdsadasfdsfa')
  const ageQuery = req.query.ageInMinutes ? `and ageInMinutes<${req.query.ageInMinutes}` : ''
  const query = `select  MainSwaps.contract, max(MainSwaps.symbol) as symbol, sum(MainSwaps.usdVolume) as volume, max(MainSwaps.marketCap) as maxMarketCap,  sum(IF(MainSwaps.isBuy=1,MainSwaps.isBuy,0)) as totalBuys,  sum(IF(MainSwaps.isBuy=1,MainSwaps.usdVolume,0))/(sum(IF(MainSwaps.isBuy=-1,MainSwaps.usdVolume,0))+sum(IF(MainSwaps.isBuy=1,MainSwaps.usdVolume,0))) as buyRatio, max(MainSwaps.usdPrice)/min(MainSwaps.usdPrice) as priceRatio, (max(MainSwaps.blockNumber)-max(ContractDetails.liqAddBlock))/5 as ageInMinutes, max(MainSwaps.pairAddress) as pairAddress from MainSwaps INNER JOIN ContractDetails ON ContractDetails.contract = MainSwaps.contract where (select max(blockNumber) from MainSwaps)-${req.query.blocks} and (select max(blockNumber) from MainSwaps) having volume>${req.query.volume} and totalBuys>${req.query.totalBuys} and maxMarketCap<${req.query.marketCap} ${ageQuery} and buyRatio > ${req.query.buyRatio} group by MainSwaps.contract order by volume, ageInMinutes desc;`
  conn.query(query, function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
}
// export const updateContract = (req, res, next) => {
//   if (!req.body.contract) {
//     return next(new AppError("No block id found", 404));
//   }
//   const { contract } = req.body;
//   // get body keys, and  body values
//   let { body } = req;
//   delete body.id;
//   delete body.contract;
//   delete body.symbol;
//   const keys = Object.keys(body);
//   const values = Object.values(body);
//   const keysString = `${keys.reduce((i,j)=>{
//     return `${i} = ?,${j}`
//   })}=?`
//   conn.query(
//     `UPDATE Contracts SET ${keysString} WHERE contract=?`,
//     [...values, contract],
//     function (err, data, fields) {
//       if (err) return next(new AppError(err, 500));
//       res.status(200).json({
//         data: data,
//         status: "success"
//       });
//     }
//   );
// };
   

export const deleteContract = (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("No block id found", 404));
  }
  conn.query(
    "DELETE FROM Contract WHERE contract=?",
    [req.params.contract],
    function (err, fields) {
      if (err) return next(new AppError(err, 500));
      res.status(201).json({
        status: "success",
        message: "todo deleted!",
      });
    }
  );
}


// Pairs

// get by PairAddress /api/pairs/:pairAddress
export const getPairByPairAddress = async (req, res, next) => {
  if (!req.params) res.status(404).json({status: 404, data: "missing pair address"})
  conn.query("SELECT * FROM Pairs_Distinct WHERE pairAddress = ?",[req.params.pairAddress], function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
}
//post pair /api/pairs
export const createPair = async (req, res, next) => {
  if (!req.body) return next(new AppError("No form data found", 404));
  let { body } = req;
  if (!body.length) return;
  const _body = body.map(b=>{
    return Object.values(b)
  })
  console.log()
  const result = conn.query(
    "INSERT INTO Pairs_Distinct (pairAddress,token0,token1,token0Decimals,token1Decimals,token0Symbol,token1Symbol,token0TotalSupply,token1TotalSupply) VALUES(?);".repeat(_body.length),_body, (err,data)=>{
      if (err) res.status(500).json({status: "error", err})
      else {
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
      }
    }
  );
  //console.log(result)
  return;

}

// get all pairs : getting by pair address is too inefficient.
export const getAllPairs = async (req, res, next) => {
  if (req.query.contract) {
    conn.query(`SELECT * FROM Pairs_Distinct where token0="${req.query.contract}" or token1="${req.query.contract}"`, function (err, data, fields) {
      if(err) return next(new AppError(err))
      res.status(200).json({
        status: "success",
        length: data?.length,
        data: data,
      });
    });
  } else {
    conn.query("SELECT * FROM Pairs_Distinct", function (err, data, fields) {
      if(err) return next(new AppError(err))
      res.status(200).json({
        status: "success",
        length: data?.length,
        data: data,
      });
    });
  }
}

/*
CREATE TABLE Pairs(id int NOT NULL AUTO_INCREMENT,
  pairAddress varchar(50) NOT NULL,
  token0 varchar(50) NOT NULL,
  token1 varchar(50) NOT NULL,
  token0Decimals double,
  token1Decimals double,
  token0Symbol varchar(50),
  token1Symbol varchar(50),
  token0TotalSupply double,
  token1TotalSupply double,
  PRIMARY KEY(id)
  );
  CREATE TABLE Pairs_Distinct(id int NOT NULL AUTO_INCREMENT,
  pairAddress varchar(50) NOT NULL,
  token0 varchar(50) NOT NULL,
  token1 varchar(50) NOT NULL,
  token0Decimals double,
  token1Decimals double,
  token0Symbol varchar(50),
  token1Symbol varchar(50),
  token0TotalSupply double,
  token1TotalSupply double,
  PRIMARY KEY(id)
  );
  
  CREATE TABLE Transactions(id int NOT NULL AUTO_INCREMENT,
  transactionHash varchar(100) NOT NULL,
  transactionTo varchar(50) NOT NULL,
  transactionFrom varchar(50) NOT NULL,
  PRIMARY KEY(id)
  );    
  
  */
 /*
  CREATE TABLE ContractSwaps(id int NOT NULL AUTO_INCREMENT,
  blockNumber double,
  symbol varchar(50),
  contract varchar(50),
  usdVolume double,
  usdPrice double,
  isBuy int,
  txHash varchar(100),
  wallet varchar(50),
  router varchar(50),
  etherPrice double,
   marketCap double,
   pairAddress varchar(50),
  PRIMARY KEY(id)
  );
    CREATE TABLE MainSwaps(id int NOT NULL AUTO_INCREMENT,
  blockNumber double,
  symbol varchar(50),
  contract varchar(50),
  usdVolume double,
  usdPrice double,
  isBuy int,
  txHash varchar(100),
  wallet varchar(50),
  router varchar(50),
  etherPrice double,
   marketCap double,
      pairAddress varchar(50),
      dateTime varchar(50),
  PRIMARY KEY(id)
  );

CREATE TABLE FreshWalletSwaps(id int NOT NULL AUTO_INCREMENT,
  blockNumber double,
  symbol varchar(50),
  contract varchar(50),
  usdVolume double,
  usdPrice double,
  isBuy int,
  txHash varchar(100),
  wallet varchar(50),
  router varchar(50),
  etherPrice double,
   marketCap double,
      pairAddress varchar(50),
      dateTime varchar(50),
  PRIMARY KEY(id)
  );
    CREATE TABLE EpiWalletSwaps(id int NOT NULL AUTO_INCREMENT,
  blockNumber double,
  symbol varchar(50),
  contract varchar(50),
  usdVolume double,
  usdPrice double,
  isBuy int,
  txHash varchar(100),
  wallet varchar(50),
  router varchar(50),
  etherPrice double,
   marketCap double,
      pairAddress varchar(50),
  PRIMARY KEY(id)
  );
      CREATE TABLE EpiWalletSwapsUnfiltered(id int NOT NULL AUTO_INCREMENT,
  blockNumber double,
  symbol varchar(50),
  contract varchar(50),
  usdVolume double,
  usdPrice double,
  isBuy int,
  txHash varchar(100),
  wallet varchar(50),
  router varchar(50),
  etherPrice double,
   marketCap double,
      pairAddress varchar(50),
  PRIMARY KEY(id)
  );
      CREATE TABLE AllPumpSwaps(id int NOT NULL AUTO_INCREMENT,
  blockNumber double,
  symbol varchar(50),
  contract varchar(50),
  usdVolume double,
  usdPrice double,
  isBuy int,
  txHash varchar(100),
  wallet varchar(50),
  router varchar(50),
  etherPrice double,
   marketCap double,
      pairAddress varchar(50),
  PRIMARY KEY(id)
  );


  id          | int         | NO   | PRI | NULL    | auto_increment |
| symbol      | varchar(50) | NO   |     | NULL    |                |
| contract    | varchar(50) | NO   |     | NULL    |                |
| liqAddBlock | double      | NO   |     | NULL    |                |
| volume5m    | double      | NO   |     | NULL    |                |
| volume15m   | double      | NO   |     | NULL    |                |
| volume1h    | double      | NO   |     | NULL    |                |
| volume1d    | double  


CREATE TABLE ContractDetails(id int NOT NULL AUTO_INCREMENT,
  symbol varchar(50),
  contract varchar(50),
liqAddBlock double,
liqLockBlock double,
renounceBlock double, 
PRIMARY KEY(id)
  );

CREATE TABLE Contracts1m(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  volume1m double,
  buyRatio1m double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );


CREATE TABLE Contracts5m(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  volume5m double,
  buyRatio5m double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );

CREATE TABLE Contracts15m(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  volume15m double,
  buyRatio15m double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );


CREATE TABLE Contracts1h(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME, 
  blockNumber double,
  marketCap double,
  price double,
  volume1h double,
  buyRatio1h double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );

    CREATE TABLE Contracts4h(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME, 
  blockNumber double,
  marketCap double,
  price double,
  volume4h double,
  buyRatio4h double,
  totalBuys double,
  totalSells double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );


CREATE TABLE Contracts1d(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  volume1d double,
  buyRatio1d double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );


CREATE TABLE TotalBuys5m(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  volume5m double,
  totalBuys double,
  totalSells double,
  buyRatio1h double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );


CREATE TABLE TotalBuys15m(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  totalBuys double,
  totalSells double,
  volume15m double,
  buyRatio15m double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );


CREATE TABLE TotalBuys1h(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  totalBuys double,
  totalSells double,
  volume1h double,
  buyRatio1h double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );

CREATE TABLE TotalBuys1d(id int NOT NULL AUTO_INCREMENT,
  contract varchar(50),
  symbol varchar(50),
  dateTime DATETIME,
  blockNumber double, 
  marketCap double,
  price double,
  totalBuys double,
  totalSells double,
  volume1d double,
  buyRatio1d double,
  ageInMinutes double,
  PRIMARY KEY(id)
    );

    

datetime format : YYYY-MM-DD HH:MI:SS

CREATE TABLE Contracts(id int NOT NULL AUTO_INCREMENT,
contract varchar(50),
symbol varchar(50),
pairAddress varchar(50),
dateTime DATETIME, 
volume1m double,
volume5m double,
volume15m double,
volume1h double,
volume1d double,
buyRatio1M double,
buyRatio15M double,
buyRatio1D double,
ageInMinutes double,
PRIMARY KEY(id)
  );
------




   */




  