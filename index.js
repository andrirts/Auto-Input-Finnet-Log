const { google } = require('googleapis')
const sheets = google.sheets('v4');
const fs = require('fs');
const path = require('path');
const client = require('./db');
const moment = require('moment');

const credentialsPath = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function authorize() {
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: SCOPES
    });
    return await auth.getClient();
}

async function writeData() {
    const auth = await authorize();
    const spreadsheetId = '1PL7nUFmBjaFd_wx5E868Dpm1dUOATsSgWk5tfCMvtHc';
    const range = 'Sheet1!A1';
    const valueInputOption = 'RAW';
    const resource = {
        values: [
            ['Hello', 'World'],
            ['Foo', 'Bar']
        ],
    };

    try {
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption,
            resource,
            auth,
        });

        console.log('Cells updated:', response.data.updatedCells);
    } catch (err) {
        console.error('The API returned an error: ' + err);
    }
}

async function getDataFromDatabase() {
    const db = client;
    try {
        console.log('starting query');
        // const res = await db.query('SELECT * FROM adapter_log limit 10');
        const query = 'select request_date,response,mitra_id,product_code,status from adapter_log where request_date between $1 and $2 order by request_date asc';
        const values = [moment().subtract(1, 'days').format('YYYY-MM-DD'), moment().format('YYYY-MM-DD')];
        // const values = ['2024-08-09', '2024-08-12'];
        const datas = await db.query(query, values);
        // const jsonData = JSON.parse(datas.rows[0].response);
        // console.log(jsonData.resultCode)
        const insertedDatas = [];
        for (let i = 0; i < datas.rows.length; i++) {
            const data = datas.rows[i];
            const jsonData = JSON.parse(data.response);
            let information = jsonData != null ? jsonData.resultDesc.split('.')[0].replace(/\d+/g, '').replace('Maaf, ', '').trim() : 'No Respon From Finnet';
            if (information === 'Approve') {
                information = 'Success'
            }
            let resultCode = jsonData != null ? `resultCode:${jsonData.resultCode}` : 'NULL';
            const status = !jsonData ? 'Failed' : jsonData.resultCode === '68' ? 'Suspect' : jsonData.resultCode !== '00' ? 'Failed' : 'Success';
            insertedDatas.push({
                'Tanggal': moment(data.request_date).format('D-MMM-YY'),
                'Response': resultCode,
                'Mitra': data.mitra_id,
                'Produk': data.product_code,
                'Keterangan': information,
                'Status': status,
            });
        }
        console.log('finished query');
        client.end();
        return insertedDatas;
    } catch (err) {
        console.error('Error executing query:', err.stack);
    }
}

async function insertLastRow() {
    const auth = await authorize();
    const spreadsheetId = '1qGdx4JyASfRu1HMk7DcUeW9xBmVd960sSoX5FivE2dw';
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
            process.exit(0);
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
