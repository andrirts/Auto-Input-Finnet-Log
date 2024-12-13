const { google } = require('googleapis')
const sheets = google.sheets('v4');
const fs = require('fs');
const path = require('path');
const client = require('./db');
const moment = require('moment');
const cron = require('node-cron');

const credentialsPath = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function authorize() {
    const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: SCOPES
    });
    return await auth.getClient();
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

module.exports = {
    authorize,
    addMoreRows
}