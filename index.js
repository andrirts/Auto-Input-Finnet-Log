const { google } = require('googleapis')
const sheets = google.sheets('v4');
const fs = require('fs');
const path = require('path');
const client = require('./db');
const moment = require('moment');
const cron = require('node-cron');

const credentialsPath = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const logMessage = `Script ran at ${moment().format()}\n`;

fs.appendFile(path.join(__dirname, 'FinnetAutoInput.log'), logMessage, (err) => {
    if (err) throw err;
});

async function authorize() {
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: SCOPES
    });
    return await auth.getClient();
}

// async function writeData() {
//     const auth = await authorize();
//     const spreadsheetId = '1PL7nUFmBjaFd_wx5E868Dpm1dUOATsSgWk5tfCMvtHc';
//     const range = 'Sheet1!A1';
//     const valueInputOption = 'RAW';
//     const resource = {
//         values: [
//             ['Hello', 'World'],
//             ['Foo', 'Bar']
//         ],
//     };

//     try {
//         const response = await sheets.spreadsheets.values.update({
//             spreadsheetId,
//             range,
//             valueInputOption,
//             resource,
//             auth,
//         });

//         console.log('Cells updated:', response.data.updatedCells);
//     } catch (err) {
//         console.error('The API returned an error: ' + err);
//     }
// }

async function getDataFromDatabase() {
    const db = await client();
    try {
        console.log('starting query');
        // const res = await db.query('SELECT * FROM adapter_log limit 10');
        // const query = 'select TANGGAL,NamaReseller,KodeProduk,Keterangan,STATUSTRANSAKSI FROM transaksi_his where TANGGAL between $1 and $2 order by TANGGAL asc';
        const query = 'SELECT * FROM transaksi_his WHERE TANGGAL = ? AND namaterminal = ? AND NamaReseller != ? ORDER BY idtransaksi ASC';
        // const values = [moment().subtract(1, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')];
        // const values = ['2024-09-12', '2024-09-22'];
        const values = [moment().subtract(1, 'days').format('YYYY-MM-DD'), 'FINNET', 'RTSBISA'];
        const [rows, fields] = await db.query(query, values);
        // const jsonData = JSON.parse(datas.rows[0].response);
        // console.log(jsonData.resultCode)
        const insertedDatas = [];
        for (let i = 0; i < rows.length; i++) {
            const data = rows[i];
            const rc = findStringBetween(data['Keterangan'], 'RESULTCODE:', ',RESULTDESC');
            let keterangan = findStringBetween(data['Keterangan'], 'RESULTDESC:', ',PRODUCTCODE');

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
            insertedDatas.push({
                'Tanggal': moment(data['TANGGAL']).format('D-MMM-YY'),
                'Response': resultCode,
                'Mitra': data['NamaReseller'],
                'Produk': product,
                'Keterangan': information,
                'Status': status,
            });
        }
        console.log('finished query');
        await db.end();
        return insertedDatas;
    } catch (err) {
        console.error('Error executing query:', err.stack);
    }
}

function findStringBetween(str, startDelimiter, endDelimiter) {
    // Create a regular expression to capture the string between the delimiters
    const regex = new RegExp(`${startDelimiter}(.*?)${endDelimiter}`);

    // Use the regex to find the match
    const match = str.match(regex);

    // If a match is found, return the captured group (substring between the delimiters)
    if (match && match[1]) {
        return match[1].trim();  // Trimming to remove any leading/trailing spaces
    } else {
        return null;  // Return null if no match is found
    }
}

async function insertLastRow() {
    const auth = await authorize();
    const spreadsheetId = '1qGdx4JyASfRu1HMk7DcUeW9xBmVd960sSoX5FivE2dw';
    const datas = await getDataFromDatabase();
    if (datas.length === 0) {
        console.log("NO DATA FOUND")
        return;
    }
    const values = datas.map(row => [
        row.Tanggal,
        row.Response,
        row.Mitra,
        row.Produk,
        row.Keterangan,
        row.Status
    ])
    try {
        const range = 'Data Finnet!A:F';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth,
        })

        const rows = response.data.values || [];

        const lastRow = rows[rows.length - 1];

        if (lastRow[0] === datas[0].Tanggal) {
            console.log("DATA ALREADY INSERTED")
            return;
        }

        const newRange = `Data Finnet!A${rows.length + 1}`;
        console.log('ADDING ROWS TO SPREADSHEET');
        await addMoreRows(spreadsheetId, 930916813);
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

async function addMoreRows(spreadsheetId, sheetId) {
    const auth = await authorize();
    const requests = [
        {
            "appendDimension": {
                "sheetId": sheetId,
                "dimension": "ROWS",
                "length": 1000
            }
        }
    ]

    try {
        const response = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests,
            },
            auth
        })
        console.log(`${response.data.replies.length} rows added successfully.`);
    } catch (error) {
        console.log(error)
    }
}

async function test() {
    const auth = await authorize();
    const spreadsheetId = '1PL7nUFmBjaFd_wx5E868Dpm1dUOATsSgWk5tfCMvtHc';
    const datas = await getDataFromDatabase();
    const values = datas.map(row => [
        row.Tanggal,
        row.Response,
        row.Mitra,
        row.Produk,
        row.Keterangan,
        row.Status
    ])
    try {
        const range = 'Sheet1!A:F';
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth
        })
        const rows = response.data.values || [];
        if (rows.length === 0) {
            console.log('No data found.');
            process.exit(0);
        }

        // Last row data
        const lastRow = rows[rows.length - 1];
        console.log('Last row data:', lastRow);
        if (lastRow[0] === datas[0].Tanggal) {
            console.log('Last row is the same as the first row. Exiting...');
            process.exit(0);
        }
    } catch (err) {
        console.log(err)
    }
}

// writeData();
(async () => {
    // test();
    await insertLastRow();
    // await getDataFromDatabase();
})()
