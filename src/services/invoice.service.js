const httpStatus = require('http-status');
const { extractContent } = require('../helpers/pdf2json');
const { Invoice } = require('../models');
const ApiError = require('../utils/ApiError');
const fs = require("fs");
const { filterOptionsList } = require('../config/invoice');

/**
 * Adding new  Invoice
 * @param {Object} invoiceBody
 * @returns {Promise<Invoice>}
 */
const addInvoice = async (invoiceBody) => {
  const prevEntry = await Invoice.findOne(({ invoiceNo: invoiceBody.invoiceNo }));
  if (prevEntry) {
    fs.unlinkSync(prevEntry.storedAt)
    return Invoice.findOneAndUpdate({ invoiceNo: invoiceBody.invoiceNo }, invoiceBody);
    // throw new ApiError(httpStatus.BAD_REQUEST, 'Invoice already added');
  }
  return Invoice.create(invoiceBody);
};

/**
 * Query for Invoice
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryInvoices = async (filter, options) => {
  const invoices = await Invoice.paginate(filter, options);
  return invoices;
};

/**
 * Get Invoice by id
 * @param {ObjectId} id
 * @returns {Promise<Invoice>}
 */
const getInvoiceById = async (id) => {
  return Invoice.findById(id);
};

/**
 * Get Invoice by Invoice Number
 * @param {string} invoiceNo
 * @returns {Promise<Invoice>}
 */
const getInvoiceByNumber = async (invoiceNo) => {
  return Invoice.findOne({ invoiceNo });
};

/**
 * Update invoice by invoiceNo
 * @param {ObjectId} invoiceNo
 * @param {Object} updateBody
 * @returns {Promise<Invoice>}
 */
const updateInvoiceById = async (invoiceNo, updateBody) => {
  const invoice = await getInvoiceByNumber(invoiceNo);
  if (!invoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
  }

  Object.assign(invoice, updateBody);
  await invoice.save();
  return invoice;
};

/**
 * Delete Invoice by id
 * @param {ObjectId} invoiceId
 * @returns {Promise<Invoice>}
 */
const deleteInvoiceById = async (invoiceId) => {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
  }
  await invoice.remove();
  return invoice;
};

/**
 * Upload Mulitple pdf Invoice and add into db
 * @param {Files} files
 * @returns {Promise<Invoice>}
 */
const parseAndAddInvoices = async (files) => {
  const result = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const invoicesList = await extractContent(files[i].path);
      for (let j = 0; j < invoicesList.length; j++) {
        const invoiceObj = invoicesList[j];
        await addInvoice({ ...invoiceObj, storedAt: files[i].path, fileOriginalName: files[i].originalname });
        result.push({ fileName: files[i].originalname, extractedJson: invoiceObj });
      }
    }
    catch (error) {
      result.push({ fileName: files[i].originalname, error: true, message: error.message, })
    }
  }
  return result
}


/**
 * Get All Invoices 
 */
const getAllInvoices = async () => {
  const result = await Invoice.find({});
  return result;
}

const getDistictValues = async ()=>{
  let result = {}
  for(let i=0;i<filterOptionsList.length;i++){
    result[filterOptionsList[i].optionsName]= await Invoice.distinct(filterOptionsList[i].key)
  }
  return result;
}

const aggregateChartData_old = async ()=>{
  // Date format %Y-%m-%d
  // Month format %m

  const result = await Invoice.aggregate(
    [
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateTime" } },
          totalAmount: {
            $sum: "$totalAmount"
          }
        }
      }
    ]
)
  return result;
}

const aggregateChartData_save = async ()=>{
  // Date format %Y-%m-%d
  // Month formate
  const result = await Invoice.aggregate(
    [
      {
        $group: {
          _id: { $dateToString: { format: "%m", date: "$dateTime" },to:"$to" },
          totalAmount: {
            $sum: "$totalAmount"
          }
        }
      },{
        $group: {
          _id: { age: "$_id.age" }, 
          children: { $addToSet: { gender: "$_id.gender", names:"$names" } } 
        } 
      }
    ]
)
  return result;
}

const aggregateChartData = async ()=>{
  // Date format %Y-%m-%d
  // Month formate
  const result = await Invoice.aggregate(
    [{
      $group: {
         _id: {
            month: { $dateToString: { format: "%Y", date: "$dateTime" } },
            to: "$to"
         },
         totalAmount: {
            "$sum": "$totalAmount"
         }
      }
   }, {
      $group: {
         _id: "$_id.month",
         to_GROUP: {
            $push: {
               to: "$_id.to",
               fullTotal: "$totalAmount"
            }
         }
      }
   }]
)
  return result;
}


module.exports = {
  addInvoice,
  queryInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  updateInvoiceById,
  deleteInvoiceById, parseAndAddInvoices,
  getAllInvoices,getDistictValues,aggregateChartData
};
