const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const gasTypeSchema = mongoose.Schema({
    gasTypeName: {
        type: String,
        required: true,
        trim: true,
    },
    productCode: {
        type: Number,
    },
    quantity: {
        type: Number,
        required: true,
        trim: true,
        default: 0,
    },
    price: {
        type: Number,
        required: true,
        trim: true,
        default: 0,
    },

    total: {
        type: Number,
        required: true,
        trim: true,
        default: 0,
    },


});


const invoiceSchema = new mongoose.Schema({
    invoiceNo: {
        type: Number,
        required: true,
        trim: true,

    },
    invoiceDateTime: {
        type: Date,
        required: true,
        trim: true
    },
    invoiceDateObj: {
        type: Object,
        trim: true
    },
    dateTime: {
        type: Date,
        trim: true
    },

    dateObj: {
        type: Object,
        trim: true
    },
    profitCenter: {
        type: Number,


    },
    soldTo: {
        type: String,
        required: true,
        trim: true
    },
    shipVia: {
        type: String,

        trim: true
    },
    to: {
        type: String,

        trim: true
    },
    totalAmount: {
        type: Number,
        required: true,
        trim: true
    },
    accountNo: {
        type: Number,
        required: true,
        trim: true
    },
    billNo: {
        type: Number,
        required: true,
        trim: true
    },

    listOfPurchases: [gasTypeSchema],
    rawText: {
        type: String,
    },
    storedAt: {
        type: String
    },
    fileOriginalName: {
        type: String
    }

}, {
    timestamps: true
})



// add plugin that converts mongoose to json
invoiceSchema.plugin(toJSON);
invoiceSchema.plugin(paginate);

invoiceSchema.statics.isInvoiceAlreadyPresent = async function (invoiceNo, excludeUserId) {
    const invoice = await this.findOne({ invoiceNo, _id: { $ne: excludeUserId } });
    return !!invoice;
};


/**
 * @typedef Invoice
 */
const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
