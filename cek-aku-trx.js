const { Pool } = require('pg');
const moment = require('moment');
const { getRowIndexColumn, updateCell, insertRow, getCellValue } = require('./spreadsheet.service');
const spreadsheetId = '1vLtiqotmrJZYqAh_OvBeiSLKojKqXalZ7wHTPG0XSqQ';
const sheetName = 'WABA CekAku';
const masterSheetName = 'Kode';
require('dotenv').config();

const pool = new Pool({
    host: process.env.PADI_DB_HOST,
    port: process.env.PADI_DB_PORT,
    user: process.env.PADI_DB_USER,
    password: process.env.PADI_DB_PASS,
    database: process.env.PADI_DB_NAME,
    max: 1,
    idleTimeoutMillis: 30000
})

async function getDataFromCekAku() {
    const client = await pool.connect();
    try {
        // const currentDay = moment().format('YYYY-MM-DD')
        const res = await client.query(`SELECT 
            id,product_sku, sell_price, status, payment_method, created_at, payment_status, customer_email, message,transaction_date
            from transactions 
            where created_at >= now() - INTERVAL '1 hour 30 minutes'
            and status != 0
            order by created_at asc;`);
        client.release(); // Always release the connection
        console.log('Client closed')
        // await pool.end();
        return res.rows;
    } catch (err) {
        console.error(err)
    }
}

async function getRangeHour(time) {
    if (time >= 0 && time <= 2) {
        return "00:00 - 02:59"
    } else if (time >= 3 && time <= 5) {
        return "03:00 - 05:59"
    } else if (time >= 6 && time <= 8) {
        return "06:00 - 08:59"
    } else if (time >= 9 && time <= 11) {
        return "09:00 - 11:59"
    } else if (time >= 12 && time <= 14) {
        return "12:00 - 14:59"
    } else if (time >= 15 && time <= 17) {
        return "15:00 - 17:59"
    } else if (time >= 18 && time <= 20) {
        return "18:00 - 20:59"
    } else {
        return "21:00 - 23:59"
    }
}

async function insertLastRow() {
    const datas = await getDataFromCekAku();
    if (datas.length === 0) {
        console.log("NO DATA FOUND")
        return;
    }
    const startTime = moment();
    const promises = datas.map(async (data) => {
        const [indexTransaction, findCode, findPaymentMethod] = await Promise.all([
            await getRowIndexColumn(spreadsheetId, sheetName, 'B', data.id),
            await getRowIndexColumn(spreadsheetId, masterSheetName, 'D', data.product_sku),
            await getRowIndexColumn(spreadsheetId, masterSheetName, 'I', data.payment_method)
        ]);
        if (indexTransaction) {
            return Promise.all([
                updateCell(spreadsheetId, sheetName, `E${indexTransaction}`, data.status),
                updateCell(spreadsheetId, sheetName, `R${indexTransaction}`, data.payment_status)
            ]);
        } else {
            let name, operator, productType, mappingPaymentMethod;
            if (findCode || findPaymentMethod) {
                [name, operator, productType, mappingPaymentMethod] = await Promise.all([
                    await getCellValue(spreadsheetId, masterSheetName, `C${findCode}`),
                    await getCellValue(spreadsheetId, masterSheetName, `B${findCode}`),
                    await getCellValue(spreadsheetId, masterSheetName, `A${findCode}`),
                    await getCellValue(spreadsheetId, masterSheetName, `J${findPaymentMethod}`),
                ]);
            }
            const id = data.id;
            const productSku = data.product_sku;
            const sellPrice = data.sell_price;
            const status = data.status;
            const paymentMethod = data.payment_method;
            const paymentStatus = data.payment_status;
            const userNumber = data.customer_email;
            const message = data.message;
            const createdAt = moment(data.created_at).format("YYYY-MM-DDTHH:mm:ss.SSSSSSZ");
            const transactionStatus = paymentStatus === 'FAILED' ? "" : (paymentStatus === 'SUCCESS' && status === 2) ? "SUKSES" : "GAGAL";
            const transactionDate = moment(data.transaction_date).format("YYYY-MM-DD");
            const transactionTime = moment(data.created_at).format("HH:mm:ss");
            const hour = moment(data.created_at).format("HH");
            const rangeHour = await getRangeHour(hour);
            const trxTsel512 = productType === "Paket Data 512" ? 1 : "";
            const srmNumber = "62" + userNumber.slice(1);
            const validateTransactionExpired = transactionStatus === "" ? "" : transactionStatus === "SUKSES" ? "1" : 0;
            const validateIsPayment = paymentStatus === "SUCCESS" ? "1" : "";
            const value = [name, id, productSku, sellPrice, status, paymentMethod, createdAt, productType, operator, transactionStatus, transactionDate, `'${transactionTime}`, rangeHour, hour, trxTsel512, '', paymentStatus, userNumber, srmNumber, '', '', '', '', '', mappingPaymentMethod, '', '', '', '', '', validateTransactionExpired, validateIsPayment, message];
            return insertRow(spreadsheetId, sheetName, value);
        }
    });
    await Promise.all(promises);
    const endTime = moment();
    console.log(endTime.diff(startTime, 'seconds'))
}

// (async () => {
//     const data = await insertLastRow();
//     // console.log(data);
// })()

async function executePeriodically() {
    await insertLastRow();
    setTimeout(executePeriodically, 60000);
}

executePeriodically();