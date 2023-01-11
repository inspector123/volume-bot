import AppError from '../utils/AppError.js';
import conn from '../services/db.js';

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
      "INSERT INTO BlockEvents (blockNumber,symbol,contract,usdVolume,usdPrice,isBuy,txHash,wallet,router,etherPrice, marketCap, pairAddress,token0,token1,token0Decimals,token1Decimals,token0Symbol,token1Symbol) VALUES(?);",[_body], (err,data)=>{
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
  console.log(req.params)
  if (!req.params.blockNumber) {
      res.status(404).json({status: "failure", data, length: data?.length});
  }
  if (!req.query.sortBySymbol) {
    conn.query(
      "SELECT symbol, contract, txHash, usdVolume, usdPrice, isBuy, marketCap FROM BlockEvents WHERE blockNumber between ? and (select max(blockNumber));",
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
  }
  else {
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
  }
};


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

  // export const update5m =  async (req, res) => {
  //   if (!req.body) return next(new AppError("No form data found", 404));
  //   let update = conn.query(`UPDATE Contracts set volume5m=?, `) 
  // }


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
/*
   
  //for contract, what do i want to do?



  //
 /*
  checkIfContractsExist

  find ones that do and ones that dont 

  post ones that dont and update ones that do

  perhaps for naive implementation, we simply getAllContracts and then...


  what if you feed it contracts, have it select * from contracts, and then return the ones that don't match?


  feed it an array of contracts, select * from contracts, filter by contracts in that list, then post the ones that didnt exist and put the ones that did?

  ...
 */