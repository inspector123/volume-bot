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

   export const getBlock = (req, res, next) => {
    if (!req.params.id) {
      return next(new AppError("No block found", 404));
    }
    conn.query(
      "SELECT * FROM BlockEvents WHERE blockNumber = ?",
      [req.params.id],
      function (err, data, fields) {
        if (err) return next(new AppError(err, 500));
        res.status(200).json({
          status: "success",
          length: data?.length,
          data: data,
        });
      }
    );
   };

         // function (err, data, fields) {
      //   if (err) return;
      //   res.status(201).json({
      //     status: "success",
      //     message: "block created!",
      //   });
      // }
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

  //  export const createContract = (req, res, next) => {
  //   if (!req.body) return next(new AppError("No form data found", 404));
  //   const values = [req.body.name, "pending"];
  //   conn.query(
  //     "INSERT INTO Contracts (symbol, decimals, contract, amount, age,Volume5m,volume15m,volume1h,volume1d ) VALUES(?)",
  //     [values],
  //     function (err, data, fields) {
  //       if (err) return next(new AppError(err, 500));
  //       res.status(201).json({
  //         status: "success",
  //         message: "block created!",
  //       });
  //     }
  //   );
  //  };

  export const createContracts = async(req, res, next) => {
    if (!req.body) return next(new AppError("No form data found", 404));
    //first, use select query to filter out all the contracts that need to be updated, not created
    conn.query(`INSERT INTO Contracts (symbol,contract,age,volume5m,volume15m,volume1h,volume1d,avgBuy5,avgBuy15,avgBuyH,BuyRatio5,BuyRatio15,BuyRatioH) VALUES(?);`.repeat(req.body.length),req.body.map(b=>Object.values(b)))
    // })
    
  }

  export const update5m =  async (req, res) => {
    if (!req.body) return next(new AppError("No form data found", 404));
    let update = conn.query(`UPDATE Contracts set volume5m=?, `) 
  }


   export const updateContract = (req, res, next) => {
    if (!req.params.id) {
      return next(new AppError("No block id found", 404));
    }
    conn.query(
      "UPDATE Contracts SET Volume5m = ? , Volume15m = ? , Volume1H = ? , WHERE contract=?",
      [req.body.Volume5m, req.body.Volume15m, req.body.Volume1H, req.body.contract
    ],
      function (err, data, fields) {
        if (err) return next(new AppError(err, 500));
        res.status(201).json({
          status: "success",
          message: "todo updated!",
        });
      }
    );
   };

//    export const updateTodo = (req, res, next) => {
//     if (!req.params.id) {
//       return next(new AppError("No block id found", 404));
//     }
//     conn.query(
//       "UPDATE block SET status='completed' WHERE id=?",
//       [req.params.id],
//       function (err, data, fields) {
//         if (err) return next(new AppError(err, 500));
//         res.status(201).json({
//           status: "success",
//           message: "todo updated!",
//         });
//       }
//     );
//    };
   

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
/*
CREATE TABLE Contracts(id int NOT NULL AUTO_INCREMENT,
symbol varchar(50) NOT NULL,
decimals varchar(50) NOT NULL,
contractAddress varchar(50) NOT NULL,
amount varchar(50) NOT NULL,
age varchar(50) NOT NULL,
Volume5m varchar(50) NOT NULL,
volume15m varchar(50) NOT NULL,
volume1h varchar(50) NOT NULL,
volume1d varchar(50) NOT NULL,
PRIMARY KEY (id)
);*/