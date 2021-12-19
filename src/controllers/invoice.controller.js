const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { invoiceService } = require('../services');
const logger = require("../config/logger")

const addInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.addInvoice(req.body);
  res.status(httpStatus.CREATED).send(invoice);
});

const getInvoices = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await invoiceService.queryInvoices(filter, options);
  res.send(result);
});

const getInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.invoiceId);
  if (!invoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'invoice not found');
  }
  res.send(invoice);
});

const updateInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.updateInvoiceById(req.params.invoiceId, req.body);
  res.send(invoice);
});

const deleteInvoice = catchAsync(async (req, res) => {
  await invoiceService.deleteInvoiceById(req.params.invoiceId);
  res.status(httpStatus.NO_CONTENT).send();
});

const uploadInvoice = catchAsync(async (req, res) => {
  const listOfInvoices = await invoiceService.parseAndAddInvoices(req.files);
  res.send(listOfInvoices)
})

const getAllInvoices = catchAsync(async (req, res) => {
  const listOfInvoices = await invoiceService.getAllInvoices();
  res.send(listOfInvoices)
})

module.exports = {
  addInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  uploadInvoice,
  getAllInvoices
};
