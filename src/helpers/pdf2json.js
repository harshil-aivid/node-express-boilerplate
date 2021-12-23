const pdfjs = require("pdfjs-dist/es5/build/pdf");
const _ = require("lodash");
const { DEMO_RESPONSE, productInfoExtractionList, keyValuePairRegex, customFieldExtractionList } = require("../config/invoice")

async function getContent(src) {

  const doc = await pdfjs.getDocument(src).promise;
  const pagesTextContent = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i); // if doc has many pages use doc.numPages to iterate and pass index to doc.getPage
    const textContent = await page.getTextContent();
    pagesTextContent.push(textContent);
  }
  return pagesTextContent;

}

async function extractContent(src) {
  // Perform pre-processing
  const pagesTextContent = await getContent(src);
  return pagesTextContent.map((content) => {
    const listOfContentLines = content.items
      .filter((item) => item.str.trim().length)
      .map((item) => item.str);
    const jsonObj = extractJSONFromPdfTextArray(listOfContentLines);
    return jsonObj;
  })
}




const convertDateToUTC = (date) => { return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); }

const camelize = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}
const extractJson = (str, prevObj) => {
  let m;
  let obj = { ...prevObj };
  str = "  " + str;

  // ! Key Value Pairs Extraction 
  if ((m = keyValuePairRegex.exec(str)) !== null) {
    obj[camelize(m[1])] = m[3];
  }

  // Custom Fields Extraction 
  customFieldExtractionList.forEach(({ regexToMatch, fieldName }) => {
    if ((m = regexToMatch.exec(str)) !== null) {
      obj[fieldName] = m[1];
    }
  })



  // Product Info Extraction
  if (!obj["listOfPurchases"]) {
    obj["listOfPurchases"] = []
  }

  productInfoExtractionList.forEach((productData) => {
    const regexOfProduct = new RegExp(productData.textToMatch + "(s*(.*))+");
    if ((m = regexOfProduct.exec(str)) !== null) {
      const [quantity, price, total] = m[1]
        .replace(/\s+/g, " ")
        .trim()
        .split(" ");
      // obj[productData.fieldName] = { price, quantity, total };

      obj["listOfPurchases"].push({ gasTypeName: productData.fieldName, price, quantity, total, productCode: productData.productCode });
    }
  });

  return obj;
};

const extractJSONFromPdfTextArray = (textArray) => {
  const overallExtractedJSON = textArray.reduce((obj, cur) => {
    const curExtractedObj = extractJson(cur, obj);
    return { ...obj, ...curExtractedObj };
  }, {});
  return sanatizeObj(overallExtractedJSON);
}

const sanatizeObj = (obj) => {
  let sanatizedObj = {}

  for (const [key, value] of Object.entries(obj)) {

    const type = typeof value;


    // is Object ( Array || Object)
    if (type === "object") {
      // is Array 
      if (value instanceof Array) {
        sanatizedObj[key] = value.map((x) => sanatizeObj(x))
      }
      // is Object
      else {
        //recursive Call for object sanatize
        sanatizedObj[key] = sanatizeObj(value);

      }

    }
    // is string
    else if (type === "string") {

      //remove , from the string if any (12,399 -> 12399)
      const numericValue = Number(value.replace(/,/g, ''));

      //if it is a number then save it
      if (isFinite(numericValue)) {
        sanatizedObj[key] = numericValue;
      }
      // Nan means it is not convertable to number which meands it is a date (12/31/21 : MM/DD/YY)
      else {
        try {
          let [month, date, year] = value.split("/");
          if (year.length == 2) {
            year = "20" + year;
          }
          // not solved yet keep the date in UTC
          const dateObj = new Date(new Date(year, month - 1, date).toUTCString())
          if (dateObj instanceof Date && !isNaN(dateObj.valueOf())) {
            sanatizedObj[key + "Time"] = dateObj
            sanatizedObj[key + "Obj"] = { month: +month, date: +date, year: +year, timestamp: dateObj.getTime() }
          }
        }
        catch (e) {
          sanatizedObj[key] = value;

        }
      }
    }

    else {
      sanatizedObj[key] = value;
      // throw new Error("No data type matched !? who are you ?"+key)
    }

  }
  return sanatizedObj;
}




// DEMO_RESPONSE.forEach((text) => {
//   const demoJSON = extractJSONFromPdfTextArray(text)
//   console.log(demoJSON)
// });



module.exports = { extractContent };

// extractContent("./bank-statement.pdf").then(processItems).catch(handleErrors);
