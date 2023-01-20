import AppError from '../utils/AppError.js';
import conn from '../services/db.js';

//BLOCKS
export const getAllBlocks = (req, res, next) => {
  conn.query("SELECT * FROM BlockEvents", function (err, data, fields) {
    if(err) return next(new AppError(err))
    res.status(200).json({
      status: "success",
      length: data?.length,
      data: data,
    });
  });
};
export const createBlock = async (req, res, next) => {
  if (!req.body) return next(new AppError("No form data found", 404));
  let { body } = req;

  const _body = Object.values(body)
  const result = conn.query(
    "INSERT INTO BlockEvents (blockNumber,symbol,contract,usdVolume,usdPrice,isBuy,txHash,wallet,router,etherPrice, marketCap) VALUES(?);",[_body], (err,data)=>{
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
  if (!req.params.blockNumber) {
      res.status(404).json({status: "failure", data, length: data?.length});
  }
  if (req.query.min) {  
    conn.query(
      "SELECT min(blockNumber) as minBlockNumber from BlockEvents",
      function (err, data, fields) {
        if(err) return next(new AppError(err))
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
    });}
    if (req.query.sortBySymbol) {
      conn.query(
        "SELECT contract, sum(usdVolume) as volume, max(symbol) as symbol FROM BlockEvents WHERE blockNumber between ? and (select max(blockNumber)) GROUP BY contract ORDER BY sum(usdVolume) desc;",
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
    } if (!req.query) {
      console.log('missing query')
    }
};

//CONTRACTS

export const getAllContracts = (req, res, next) => {
    conn.query("SELECT * FROM Contracts", function (err, data, fields) {
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
      "SELECT * FROM Contracts where contract in (?)",
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
      "INSERT INTO Contracts (symbol, contract, liqAddBlock ,volume5m,volume15m,volume1h,volume1d) VALUES(?)",
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

export const createContracts = async(req, res, next) => {
  return next(new AppError("No form data found", 404));
  //first, use select query to filter out all the contracts that need to be updated, not created
  //conn.query(`INSERT INTO Contracts (symbol,contract,age,volume5m,volume15m,volume1h,volume1d,avgBuy5,avgBuy15,avgBuyH,BuyRatio5,BuyRatio15,BuyRatioH) VALUES(?);`.repeat(req.body.length),req.body.map(b=>Object.values(b)))
  // })
  
}

export const updateContract = (req, res, next) => {
  if (!req.params.contract) {
    return next(new AppError("No block id found", 404));
  }
  conn.query(
    "UPDATE Contracts SET Volume5m = ? WHERE contract=?",
    [req.query.volume5m, req.params.contract],
    function (err, data, fields) {
      if (err) return next(new AppError(err, 500));
      res.status(201).json({
        status: "success",
        message: `contract ${req.params.contract} updated`,
      });
    }
  );
};
   

export const deleteContract = (req, res, next) => {
  if (!req.params.id) {
    return next(new AppError("No block id found", 404));
  }
  conn.query(
    "DELETE FROM Contract WHERE address=?",
    [req.params.address],
    function (err, fields) {
      if (err) return next(new AppError(err, 500));
      res.status(201).json({
        status: "success",
        message: "todo deleted!",
      });
    }
  );
}

export const getMatchingContracts = ( req, res, next) => {
  if (!req.body) return next(new AppError("No body with contracts", 404));
  const values = req.body;
  conn.query(
    "SELECT * FROM Contracts where contract in (?)",
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
  
  const _body = Object.values(body)
  const result = conn.query(
    "INSERT INTO Pairs (pairAddress,token0,token1,token0Decimals,token1Decimals,token0Symbol,token1Symbol,token0TotalSupply,token1TotalSupply) VALUES(?);",[_body], (err,data)=>{
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
  CREATE TABLE BlockEvents(id int NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY(id)
  );

   */