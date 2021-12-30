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

const getDistictValues = async () => {
  let result = {}
  for (let i = 0; i < filterOptionsList.length; i++) {
    result[filterOptionsList[i].optionsName] = await Invoice.distinct(filterOptionsList[i].key)
  }
  return result;
}

const aggregateChartData_old = async () => {
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

const aggregateChartData_save = async () => {
  // Date format %Y-%m-%d
  // Month formate
  const result = await Invoice.aggregate(
    [
      {
        $group: {
          _id: { $dateToString: { format: "%m", date: "$dateTime" }, to: "$to" },
          totalAmount: {
            $sum: "$totalAmount"
          }
        }
      }, {
        $group: {
          _id: { age: "$_id.age" },
          children: { $addToSet: { gender: "$_id.gender", names: "$names" } }
        }
      }
    ]
  )
  return result;
}

const getTimeWiseChartData = async (timeFormat = "%Y-%m-%d", entityField = "to") => {
  // Date format %Y-%m-%d
  // Month formate
  // const result = await Invoice.aggregate(
  //   [
  //     {
  //       '$project': {
  //         'invoiceQuantity': {
  //           '$sum': '$listOfPurchases.quantity',
  //         },
  //         'invoiceTotalAmount': {
  //           '$sum': '$totalAmount'
  //         },
  //         formattedDate: { $dateToString: { format: timeFormat, date: "$dateTime" } }
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: {
  //           aggsTime: '$formattedDate',
  //           entity: "$to",

  //         },
  //         'invoiceQuantity': {
  //           '$sum': '$listOfPurchases.quantity',
  //         },
  //         'invoiceTotalAmount': {
  //           '$sum': '$totalAmount'
  //         },

  //       }
  //     }, {
  //       $group: {
  //         _id: "$_id.aggsTime",
  //         to_GROUP: {
  //           $push: {
  //             entity: "$_id.entity",
  //             sumOfTotalAmount: "$_id.invoiceTotalAmount",
  //             sumOfQuantity: "$_id.invoiceQuantity"
  //           }
  //         }
  //       }
  //     }]
  // )if (entityField.includes("listOfPurchases")) {


  const result = await Invoice.aggregate([
    {
      "$unwind": { path: "$listOfPurchases" }
    },
    {
      '$project': {
        'entity': `$${entityField}`,
        'invoiceQuantity': {
          '$sum': '$listOfPurchases.quantity'
        },
        'invoiceTotalAmount': {
          '$sum': entityField.includes("listOfPurchases") ? '$listOfPurchases.total' : '$totalAmount'
        },
        'formattedDate': {
          '$dateToString': {
            'format': timeFormat,
            'date': '$dateTime'
          }
        }
      }
    }, {
      '$group': {
        '_id': {
          'aggsTime': '$formattedDate',
          'entity': '$entity'
        },
        'sumOfQuantity': {
          '$sum': '$invoiceQuantity'
        },
        'sumOfTotalAmount': {
          '$sum': '$invoiceTotalAmount'
        }
      }
    }
  ])

  return result
}


const getStats = async () => {
  // Date format %Y-%m-%d
  // Month formate
  const [result] = await Invoice.aggregate(
    [
      {
        '$project': {
          'invoiceQuantity': {
            '$sum': '$listOfPurchases.quantity'
          },
          'invoiceTotalAmount': {
            '$sum': '$totalAmount'
          }
        }
      }, {
        '$group': {
          '_id': null,
          'sumOfQuantity': {
            '$sum': '$invoiceQuantity'
          },
          'sumOfTotalAmount': {
            '$sum': '$invoiceTotalAmount'
          }
        }
      }
    ]
  )
  const days = (await Invoice.distinct('dateTime')).length;
  const { sumOfQuantity, sumOfTotalAmount } = result;
  return { sumOfQuantity, sumOfTotalAmount, days };
}

const getEntityWiseChartData = async (entityField = "to") => {
  console.log(entityField)
  let entityByAggsPipeline = [
    {
      '$project': {
        'invoiceQuantity': {
          '$sum': '$listOfPurchases.quantity',
        },
        'invoiceTotalAmount': {
          '$sum': '$totalAmount'
        },
        [entityField]: `$${entityField}`
      }
    }, {
      '$group': {
        '_id': `$${entityField}`,
        'sumOfQuantity': {
          '$sum': '$invoiceQuantity'
        },
        'sumOfTotalAmount': {
          '$sum': '$invoiceTotalAmount'
        }
      }
    }
  ]
  if (entityField.includes("listOfPurchases")) {
    entityByAggsPipeline = [
      {
        '$unwind': {
          'path': '$listOfPurchases'
        }
      }, {
        '$group': {
          '_id': '$listOfPurchases.gasTypeName',
          'sumOfQuantity': {
            '$sum': '$listOfPurchases.quantity'
          },
          'sumOfTotalAmount': {
            '$sum': '$listOfPurchases.total'
          }
        }
      }
    ]
  }
  const result = await Invoice.aggregate(
    entityByAggsPipeline
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
  getAllInvoices, getDistictValues, getStats, getEntityWiseChartData,
  getTimeWiseChartData
};
