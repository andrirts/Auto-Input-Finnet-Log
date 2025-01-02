const { google } = require('googleapis')
const sheets = google.sheets('v4');
const client = require('./db');
const moment = require('moment');
const cron = require('node-cron');
const { authorize, addMoreRows } = require('./helper');
const spreadsheetId = '192R9lXCFZsGM8sc3j80ulU_MkWJanfq96XlADjPuC40';
const gid = 2092114153;

async function getDataTransactionFromDatabase() {
    const db = await client();
    try {
        const productType = ['Prepaid', 'V-Fisik', 'Stok Unit', 'PPOB', 'V-Game', 'E-Commerce']
        console.log('starting query');
        const query = `SELECT th.TANGGAL, th.JAM, th.NamaReseller, p.NAMAPRODUK, th.namaterminal, th.Tujuan,th.HARGABELI, th.HARGAJUAL,th.STATUSTRANSAKSI, o.NAMAOPERATOR, p.jenisproduk 
        FROM transaksi_his as th
        JOIN produk as p ON th.IDPRODUK = p.idproduk
        JOIN operator as o ON p.IDOPERATOR = o.IDOPERATOR
        WHERE TANGGAL = ? 
        AND namaterminal not in (?,"")
        AND jenistransaksi != 5
        ORDER BY idtransaksi ASC`;
        // const query = `
        // SELECT th.TANGGAL, th.JAM, th.NamaReseller, p.NAMAPRODUK, th.namaterminal, th.Tujuan,th.HARGABELI, th.HARGAJUAL,th.STATUSTRANSAKSI, o.NAMAOPERATOR, p.jenisproduk 
        // FROM transaksi_his as th
        // JOIN produk as p ON th.IDPRODUK = p.idproduk
        // JOIN operator as o ON p.IDOPERATOR = o.IDOPERATOR
        // WHERE TANGGAL between '2024-12-31' and '2025-01-1'
        // AND namaterminal not in ("FINNET","")
        // AND jenistransaksi != 5
        // ORDER BY idtransaksi asc;
        // `
        // const values = ["2024-12-01", "2024-12-29", "FINNET"];
        const values = [moment().subtract(1, 'days').format('YYYY-MM-DD'), 'FINNET'];
        const [rows, fields] = await db.query(query, values);
        // console.log(rows[0]);
        const insertedDatas = [];
        for (const row of rows) {
            const dateTransaction = moment(row['TANGGAL']).format("MM/DD/YYYY")
            const insertData = {
                "Transaction Date": dateTransaction,
                "Transaction Time": row['JAM'],
                "Partner App Name": row['NamaReseller'].split(" (Bayar)")[0],
                "Product Name": row['NAMAPRODUK'],
                "Biller Name": row['namaterminal'],
                "Billing Number": row['Tujuan'],
                "Base Biller Price": row['HARGABELI'],
                "Sell Price": row['HARGAJUAL'],
                "Own Margin": row['HARGAJUAL'] - row['HARGABELI'],
                "Status": row['STATUSTRANSAKSI'] == 1 ? "SUKSES" : "GAGAL",
                "Product Provider": row['NAMAOPERATOR'].split(" ")[0],
                "Product Category": productType[row['jenisproduk']]
            }
            insertedDatas.push(insertData);
        }
        await db.end();
        return insertedDatas;
    } catch (error) {
        console.log(error)
    }
}

async function insertLastRow() {
    const auth = await authorize();
    const datas = await getDataTransactionFromDatabase();
    if (datas.length === 0) {
        console.log("NO DATA FOUND")
        return;
    }
    const values = datas.map(row => [
        row['Transaction Date'],
        row['Transaction Time'],
        row['Partner App Name'],
        row['Product Name'],
        row['Biller Name'],
        row['Billing Number'],
        row['Base Biller Price'],
        row['Sell Price'],
        row['Own Margin'],
        row['Status'],
        row['Product Provider'],
        row['Product Category']
    ])
    try {
        const range = 'Data PPOB!A:L';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth,
        })

        const rows = response.data.values || [];

        const lastRow = rows[rows.length - 1];
        if (moment(lastRow[0]).format('MM/DD/YYYY') === datas[0]['Transaction Date']) {
            console.log("DATA ALREADY INSERTED")
            return;
        }

        const newRange = `Data PPOB!A${rows.length + 1}`;
        console.log('ADDING ROWS TO SPREADSHEET');
        await addMoreRows(spreadsheetId, gid);
        console.log("INSERTING DATA")
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: newRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: values,
            },
            auth,
        });
        console.log("FINISHED INSERTING DATA")
    } catch (error) {
        console.error('The API returned an error: ' + error);
    }
}

// (async () => {
//     await insertLastRow();
// })()

cron.schedule("0 5 * * *", async () => {
    console.log("RUNNING CRON JOB EVERY SECOND");
    await insertLastRow();
});

console.log("FINISHED CRON JOB");