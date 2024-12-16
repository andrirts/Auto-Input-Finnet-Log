const { google } = require('googleapis')
const sheets = google.sheets('v4');
const client = require('./db');
const moment = require('moment');
const cron = require('node-cron');
const { authorize, addMoreRows } = require('./helper');
const spreadsheetId = '1Ur_sU_Q4lQLRlDRURFMvenwdUz1JSMigiCVixcj-Nz8';


async function getDataTokopediaFromDatabase() {
    const db = await client();
    try {
        console.log('starting query');
        const query = `
        SELECT NamaReseller, sum(HARGAJUAL) as total_revenue, KodeProduk, count(idtransaksi) as jumlah_transaksi
        FROM avr.transaksi_his
        where TANGGAL = ?
        and STATUSTRANSAKSI = 1
        and (NamaReseller = 'PT SATRIA ABADI TERPADU - RIU' or NamaReseller = 'PT SATRIA ABADI TERPADU - CTI')
        group by NamaReseller, KodeProduk 
        order by KodeProduk DESC;
        `;
        const yesterday = moment().subtract(1, 'days').format('DD MMM YY');
        const values = [moment().subtract(1, 'days').format('YYYY-MM-DD')];
        const [rows, fields] = await db.query(query, values);
        console.log(rows);
        const insertedDatas = [
            {
                Date: yesterday,
                Product: "500 MB",
                TransactionVolumeCTI: 0,
                RevenueCTI: 0,
                TransactionVolumeRIU: 0,
                RevenueRIU: 0,
                TotalTransaction: 0,
                TotalRevenue: 0,
                ProductCode: "TDF500"
            },
            {
                Date: yesterday,
                Product: "1 GB",
                TransactionVolumeCTI: 0,
                RevenueCTI: 0,
                TransactionVolumeRIU: 0,
                RevenueRIU: 0,
                TotalTransaction: 0,
                TotalRevenue: 0,
                ProductCode: "TDF1"
            },
            {
                Date: yesterday,
                Product: "2 GB",
                TransactionVolumeCTI: 0,
                RevenueCTI: 0,
                TransactionVolumeRIU: 0,
                RevenueRIU: 0,
                TotalTransaction: 0,
                TotalRevenue: 0,
                ProductCode: "TDF2"
            }
        ];

        for (const data of insertedDatas) {
            data['TransactionVolumeCTI'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - CTI' && row['KodeProduk'] === data['ProductCode'])?.['jumlah_transaksi'] || 0;
            data['RevenueCTI'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - CTI' && row['KodeProduk'] === data['ProductCode'])?.['total_revenue'] || 0;
            data['TransactionVolumeRIU'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - RIU' && row['KodeProduk'] === data['ProductCode'])?.['jumlah_transaksi'] || 0;
            data['RevenueRIU'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - RIU' && row['KodeProduk'] === data['ProductCode'])?.['total_revenue'] || 0;
            data['TotalTransaction'] = data['TransactionVolumeCTI'] + data['TransactionVolumeRIU'];
            data['TotalRevenue'] = data['RevenueCTI'] + data['RevenueRIU'];
        }
        console.log(insertedDatas);
        console.log('finished query');
        await db.end();
        return insertedDatas;
    } catch (err) {
        console.error('Error executing query:', err.stack);
    }
}

async function insertLastRowTokopedia() {
    const auth = await authorize();
    const datas = await getDataTokopediaFromDatabase();
    if (datas.length === 0) {
        console.log("NO DATA FOUND")
        return;
    }
    const values = datas.map(row => [
        row.Date,
        row.Product,
        row.TransactionVolumeCTI,
        row.RevenueCTI,
        row.TransactionVolumeRIU,
        row.RevenueRIU,
        row.TotalTransaction,
        row.TotalRevenue,
    ])
    try {
        const range = 'Sheet1!A:H';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth,
        })

        const rows = response.data.values || [];

        const lastRow = rows[rows.length - 1];

        if (lastRow[0] === datas[0].Date) {
            console.log("DATA ALREADY INSERTED")
            return;
        }

        const newRange = `Sheet1!A${rows.length + 1}`;
        console.log('ADDING ROWS TO SPREADSHEET');
        await addMoreRows(spreadsheetId, 0);
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

async function getCurrentDataTokopediaFromDatabase() {
    const db = await client();
    try {
        console.log('starting query');
        const query = `
        SELECT NamaReseller, sum(HARGAJUAL) as total_revenue, KodeProduk, count(idtransaksi) as jumlah_transaksi
        FROM avr.transaksi
        where TANGGAL = ?
        and STATUSTRANSAKSI = 1
        and (NamaReseller = 'PT SATRIA ABADI TERPADU - RIU' or NamaReseller = 'PT SATRIA ABADI TERPADU - CTI')
        group by NamaReseller, KodeProduk ;
        `;
        const yesterday = moment().format('DD MMM YY');
        const values = [moment().format('YYYY-MM-DD')];
        const [rows, fields] = await db.query(query, values);
        const insertedDatas = [
            {
                Date: yesterday,
                Product: "500 MB",
                TransactionVolumeCTI: 0,
                RevenueCTI: 0,
                TransactionVolumeRIU: 0,
                RevenueRIU: 0,
                TotalTransaction: 0,
                TotalRevenue: 0,
                ProductCode: "TDF500"
            },
            {
                Date: yesterday,
                Product: "1 GB",
                TransactionVolumeCTI: 0,
                RevenueCTI: 0,
                TransactionVolumeRIU: 0,
                RevenueRIU: 0,
                TotalTransaction: 0,
                TotalRevenue: 0,
                ProductCode: "TDF1"
            },
            {
                Date: yesterday,
                Product: "2 GB",
                TransactionVolumeCTI: 0,
                RevenueCTI: 0,
                TransactionVolumeRIU: 0,
                RevenueRIU: 0,
                TotalTransaction: 0,
                TotalRevenue: 0,
                ProductCode: "TDF2"
            }
        ];

        for (const data of insertedDatas) {
            data['TransactionVolumeCTI'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - CTI' && row['KodeProduk'] === data['ProductCode'])?.['jumlah_transaksi'] || 0;
            data['RevenueCTI'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - CTI' && row['KodeProduk'] === data['ProductCode'])?.['total_revenue'] || 0;
            data['TransactionVolumeRIU'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - RIU' && row['KodeProduk'] === data['ProductCode'])?.['jumlah_transaksi'] || 0;
            data['RevenueRIU'] = rows.find(row => row['NamaReseller'] === 'PT SATRIA ABADI TERPADU - RIU' && row['KodeProduk'] === data['ProductCode'])?.['total_revenue'] || 0;
            data['TotalTransaction'] = data['TransactionVolumeCTI'] + data['TransactionVolumeRIU'];
            data['TotalRevenue'] = data['RevenueCTI'] + data['RevenueRIU'];
        }

        console.log('finished query');
        await db.end();
        return insertedDatas;
    } catch (err) {
        console.error('Error executing query:', err.stack);
    }
}

async function updateRowsTokopedia() {
    const auth = await authorize();
    const datas = await getCurrentDataTokopediaFromDatabase();
    if (datas.length === 0) {
        console.log("NO DATA FOUND")
        return;
    }
    const values = datas.map(row => [
        row.Date,
        row.Product,
        row.TransactionVolumeCTI,
        row.RevenueCTI,
        row.TransactionVolumeRIU,
        row.RevenueRIU,
        row.TotalTransaction,
        row.TotalRevenue,
    ])
    try {
        const range = 'Sheet1!A:H';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth,
        });
        const rows = response.data.values || [];
        if (rows.length === 0) {
            console.log("NO DATA FOUND")
            return;
        }

        const rowsToUpdate = [];
        const rowsToAppend = [];
        // const lastRow = rows[rows.length - 1];
        for (const value of values) {
            const rowIndex = rows.findIndex(row => {
                const column1Value = row[0]; // Assuming column 1 is at index 0
                const column2Value = row[1]; // Assuming column 2 is at index 1
                return column1Value === value[0] && column2Value === value[1];
            })
            if (rowIndex === -1) {
                rowsToAppend.push(value);
                continue;
            }
            rowsToUpdate.push({
                range: `Sheet1!A${rowIndex + 1}:H${rowIndex + 1}`,
                values: [value],
            })

        }

        if (rowsToAppend.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sheet1!A:H',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: rowsToAppend
                },
                auth,
            });

            addMoreRows(spreadsheetId, 0);
        }

        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: rowsToUpdate
            },
            auth,
        });
        console.log("Berhasil Update")
    } catch (error) {
        console.error(error);
    }
}

cron.schedule("*/10 * * * * *", async () => {
    console.log("RUNNING CRON JOB EVERY SECOND");
    await updateRowsTokopedia();
});

console.log("FINISHED CRON JOB");
