// Script to create DynamoDB table for ResumeCraft
// Run: node server/scripts/create-dynamodb-table.js
"use strict";

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ResourceNotFoundException } = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "new-user-data-resumecraft";
const REGION = process.env.AWS_REGION || "us-east-1";

const clientConfig = {
  region: REGION,
};

if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new DynamoDBClient(clientConfig);

async function tableExists() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      return false;
    }
    throw err;
  }
}

async function createTable() {
  const exists = await tableExists();
  if (exists) {
    console.log(`Table "${TABLE_NAME}" already exists.`);
    return;
  }

  console.log(`Creating table "${TABLE_NAME}"...`);

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "N" }, // Partition key: Number
        { AttributeName: "email", AttributeType: "S" }, // For GSI
      ],
      KeySchema: [
        { AttributeName: "id", KeyType: "HASH" }, // Partition key
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "EmailIndex",
          KeySchema: [
            { AttributeName: "email", KeyType: "HASH" },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    })
  );

  console.log(`Table "${TABLE_NAME}" created successfully!`);

  // Wait for table to be active
  console.log("Waiting for table to become active...");
  let active = false;
  while (!active) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const result = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (result.Table.TableStatus === "ACTIVE") {
      active = true;
      console.log("Table is now ACTIVE!");
    } else {
      console.log(`Table status: ${result.Table.TableStatus}`);
    }
  }
}

createTable()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error creating table:", err);
    process.exit(1);
  });