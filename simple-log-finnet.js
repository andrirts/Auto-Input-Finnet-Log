const { google } = require('googleapis')
const sheets = google.sheets('v4');
const client = require('./db');
const moment = require('moment');
const cron = require('node-cron');
const { authorize, addMoreRows, findStringBetween } = require('./helper');
const spreadsheetId = '11771gIToMxPtPq9jpKHGVR6UI_osg8E2B2gDzPKMNyw';
const gid = 0;

async function getDataFinnet() {
    const db = await client();
    try {
        console.log('starting query');
        const query = 'SELECT * FROM transaksi_his WHERE TANGGAL = ? AND namaterminal = ? AND NamaReseller != ? ORDER BY idtransaksi ASC';
        // const values = [moment().subtract(1, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')];
        // const values = ['2025-01-12', 'FINNET', 'RTSBISA'];
        const values = [moment().subtract(1, 'days').format('YYYY-MM-DD'), 'FINNET', 'RTSBISA'];
        const [rows, fields] = await db.query(query, values);
        // const jsonData = JSON.parse(datas.rows[0].response);
        // console.log(jsonData.resultCode)
        const insertedDatas = [];
        for (let i = 0; i < rows.length; i++) {
            const data = rows[i];
            const rc = await findStringBetween(data['keterangan'], 'RESULTCODE:', ',RESULTDESC');
            let keterangan = await findStringBetween(data['keterangan'], 'RESULTDESC:', ',PRODUCTCODE');
            let information = keterangan != null ? keterangan.split('.')[0].replace(/\d+/g, '').replace('MAAF, ', '').trim() : 'No Respon From Finnet';
            information = information.charAt(0).toUpperCase() + information.slice(1).toLowerCase();
            information = information === 'Approve' ? 'Success' : information;
            let resultCode = rc != null ? `resultCode:${rc}` : 'NULL';
            const status = !rc ? 'Failed' : rc === '68' ? 'Suspect' : rc !== '00' ? 'Failed' : 'Success';
            const mappingProductCode = {
                'TDF500': '500 Mb',
                'TDF1': '1 Gb',
                'TDF2': '2 Gb',
            }
            const product = mappingProductCode[data['KodeProduk']] || 'Unknown';
            const sellPrice = data['HARGAJUAL'] ? data['HARGAJUAL'] : 0;
            let sourceOfAlerts = '';
            if (rc === '17') {
                sourceOfAlerts = 'RTS'
            } else if (rc === '00' || rc === '14') {
                sourceOfAlerts = 'Partner'
            } else {
                sourceOfAlerts = 'Finnet'
            }
            const dateTransaction = moment(data['TANGGAL']).format('DD-MMM-YYYY')

            const findIfExists = insertedDatas.findIndex(item => {
                return item['Tanggal'] === dateTransaction
                    && item['Mitra'] === data['NamaReseller']
                    && item['Response'] === resultCode
                    && item['Produk'] === product
            })
            if (findIfExists !== -1) {
                insertedDatas[findIfExists]['Total Price'] += sellPrice;
                insertedDatas[findIfExists]['Count Response'] += 1;
                continue;
            }
            insertedDatas.push({
                'Tanggal': dateTransaction,
                'Mitra': data['NamaReseller'],
                'Response': resultCode,
                'Keterangan': information,
                'Status': status,
                'Produk': product,
                'Price': sellPrice,
                'Source of Alerts': sourceOfAlerts,
                'Count Response': 1,
                'Total Price': sellPrice,
            });
        }
        console.log('finished query');
        await db.end();
        return insertedDatas;
    } catch (err) {
        console.error('Error executing query:', err.stack);
    }
}

async function insertLastRow() {
    const auth = await authorize();
    const datas = await getDataFinnet();
    if (datas.length === 0) {
        console.log("NO DATA FOUND")
        return;
    }
    const values = datas.map(row => [
        row['Tanggal'],
        row['Mitra'],
        row['Response'],
        row['Keterangan'],
        row['Status'],
        row['Produk'],
        row['Price'],
        row['Source of Alerts'],
        row['Count Response'],
        row['Total Price'],
    ])
    try {
        const range = 'Data!A:J';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth,
        })

        const rows = response.data.values || [];

        const lastRow = rows[rows.length - 1];
        if (lastRow[0] === datas[0]['Tanggal']) {
            console.log("DATA ALREADY INSERTED")
            return;
        }

        const newRange = `Data!A${rows.length + 1}`;
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
//     try {
//         await insertLastRow();
//     } catch (error) {
//         console.log(error);
//     }
// })()

cron.schedule("0 5 * * *", async () => {
    console.log(`Running at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    await insertLastRow();
});

console.log("FINISHED CRON JOB");