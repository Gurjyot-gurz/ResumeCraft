// ResumeCraft - DynamoDB service
//
// Stores user records in DynamoDB table with partition key 'id' (number).
// Table name: new-user-data-resumecraft
"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "new-user-data-resumecraft";

let _docClient = null;

function getDocClient() {
  if (_docClient) return _docClient;

  const clientConfig = {
    region: process.env.AWS_REGION || "us-east-1",
  };

  // Allow local DynamoDB endpoint for testing (e.g., DynamoDB Local)
  if (process.env.DYNAMODB_ENDPOINT) {
    clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  // Only add credentials if explicitly provided (uses default credential chain otherwise)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const client = new DynamoDBClient(clientConfig);
  _docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  });

  return _docClient;
}

// Generate a numeric ID for DynamoDB (partition key is number)
function generateNumericId() {
  // Use a smaller numeric ID: timestamp in seconds + random (fits within MAX_SAFE_INTEGER)
  const timestampSeconds = Math.floor(Date.now() / 1000); // ~10 digits
  const random = Math.floor(Math.random() * 100000); // 5 digits
  // Result: ~15 digits, well within MAX_SAFE_INTEGER (9007199254740991)
  return parseInt(`${timestampSeconds}${random.toString().padStart(5, '0')}`, 10);
}

async function storeUser(userData) {
  const docClient = getDocClient();
  const id = generateNumericId();

  const item = {
    id, // Partition key (number)
    firstName: userData.firstName,
    middleName: userData.middleName || null,
    lastName: userData.lastName,
    email: userData.email.toLowerCase(),
    phone: userData.phone,
    passwordHash: userData.passwordHash,
    candidateLevel: userData.candidateLevel,
    candidateLevelLabel: userData.candidateLevelLabel,
    role: userData.role || "candidate",
    resume: userData.resume || null,
    createdAt: userData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)", // Ensure unique ID
    })
  );

  return { ...item, id };
}

async function findUserByEmail(email) {
  const docClient = getDocClient();

  if (!email) return null;

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email.trim().toLowerCase(),
      },
    })
  );

  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

async function findUserById(id) {
  const docClient = getDocClient();

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: parseInt(id, 10) },
    })
  );

  return result.Item || null;
}

async function getAllUsers() {
  const docClient = getDocClient();

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );

  return result.Items || [];
}

module.exports = {
  storeUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  TABLE_NAME,
};