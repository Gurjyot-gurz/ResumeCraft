// Check DynamoDB data
"use strict";

const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

require("dotenv").config({ path: "./server/.env" });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

async function checkData() {
  const result = await docClient.send(new ScanCommand({ TableName: "new-user-data-resumecraft" }));
  console.log("Items in DynamoDB:");
  console.log(JSON.stringify(result.Items, null, 2));
}

checkData().catch(console.error);