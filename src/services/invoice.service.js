const httpStatus = require('http-status');
const { Invoice } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Adding new  Invoice
 * @param {Object} invoiceBody
 * @returns {Promise<Invoice>}
 */
const addInvoice = async (invoiceBody) => {
  if (await Invoice.isInvoiceAlreadyPresent(invoiceBody.invoiceNo)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invoice already added');
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

module.exports = {
  addInvoice,
  queryInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  updateInvoiceById,
  deleteInvoiceById,
};