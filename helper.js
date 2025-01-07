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

async function findStringBetween(str, startDelimiter, endDelimiter) {
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

module.exports = {
    authorize,
    addMoreRows,
    findStringBetween
}