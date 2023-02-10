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
    `INSERT INTO ${req.query.table} (blockNumber,symbol,contract,pairAddress,usdVolume,usdPrice,isBuy,txHash,wallet,router,etherPrice, marketCap) VALUES(?);`.repeat(_body.length),_body, (err,data)=>{
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
  if (req.query.sortBySymbol) {
    conn.query(
      "SELECT contract, sum(usdVolume) as volume, max(symbol) as symbol, max(marketCap) as marketCap, max(usdPrice) as price FROM MainSwaps WHERE blockNumber between ? and (select max(blockNumber)) GROUP BY contract ORDER BY sum(usdVolume) desc;",
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
  } if(req.query.max) {
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
  if (req.query.count) {
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
      "INSERT INTO ContractDetails (symbol, contract, liqAddBlock, liqlockBlock, renounceBlock) VALUES(?)",
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

// export const createContracts = async(req, res, next) => {
//   return next(new AppError("No form data found", 404));
//   //first, use select query to filter out all the contracts that need to be updated, not created
//   //conn.query(`INSERT INTO Contracts (symbol,contract,age,volume5m,volume15m,volume1h,volume1d,avgBuy5,avgBuy15,avgBuyH,BuyRatio5,BuyRatio15,BuyRatioH) VALUES(?);`.repeat(req.body.length),req.body.map(b=>Object.values(b)))
//   // })
  
// }

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

// export const getMatchingContracts = ( req, res, next) => {
//   if (!req.body) return next(new AppError("No body with contracts", 404));
//   const values = req.body;
//   conn.query(
//     "SELECT * from ContractDetails where contract in (?)",
//     [values],
//     function (err, data, fields) {
//       if (err) return next(new AppError(err, 500));
//       res.status(200).json({
//         status: "success",
//         length: data?.length,
//         data: data,
//       });
//     }

//   )
// }

// Pairs

// get by PairAddress /api/pairs/:pairAddress
export const getPairByPairAddress = async (req, res, next) => {
  if (!req.params) res.status(404).json({status: 404, data: "missing pair address"})
  conn.query("SELECT * FROM Pairs WHERE pairAddress = ?",[req.params.pairAddress], function (err, data, fields) {
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
  const result = conn.query(
    "INSERT INTO Pairs (pairAddress,token0,token1,token0Decimals,token1Decimals,token0Symbol,token1Symbol,token0TotalSupply,token1TotalSupply) VALUES(?);".repeat(_body.length),_body, (err,data)=>{
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
  conn.query("SELECT * FROM Pairs", function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
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

      CREATE TABLE Contracts(id int NOT NULL AUTO_INCREMENT,
        contract varchar(50),
        symbol varchar(50),
        dateTime DATETIME, 
        marketCap double,
        price double,
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




  and have new topic watchers for liq lock and renounce. then we will find the contract and post to that contract if it exists.


  can do that from here as well.



Need a new schema for Contracts;

Contract --- Symbol --- PairAddress --- DateTime --- Volume1m --- Volume5m --- Volume15m -- Volume1H --- Volume1D --- BuyRatio1M -- BuyRatio15M -- BuyRatio1D -- Age = currentBlock minus earliest pair creation
            

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




  