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