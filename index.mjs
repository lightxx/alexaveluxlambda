import AWS from 'aws-sdk';

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const tableName = "alexaveluxdb";

async function createDynamoDBContext() {
    const STS = new AWS.STS({ apiVersion: "2011-06-15" });
    const credentials = await STS.assumeRole(
      {
        RoleArn: "arn:aws:iam::329599638967:role/HostedAlexaRole",
        RoleSessionName: "AlexaVeluxSession",
      },
      (err, res) => {
        if (err) {
          console.log("AssumeRole FAILED: ", err);
          throw new Error("Error while assuming role");
        }
        return res;
      }
    ).promise();
  
    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      apiVersion: "2012-08-10",
      accessKeyId: credentials.Credentials.AccessKeyId,
      secretAccessKey: credentials.Credentials.SecretAccessKey,
      sessionToken: credentials.Credentials.SessionToken,
    });
  
    return dynamoDB;
}

export const handler = async (event) => {
    try {
        const { code, username, password } = JSON.parse(event.body);

        const getParams = {
            TableName: tableName,
            Key: { id: code },
        };
        
        const context = await createDynamoDBContext();
        const data = await context.get(getParams).promise();

        if (!data.Item) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid code.' })
            };
        }

        const userId = data.Item.userId;
        const idstr = "config-" + userId;

        const putParams = {
            TableName: tableName,
            Item: {
                id: idstr,
                username,
                password 
            }
        };

        await context.put(putParams).promise();

        // Optionally delete the code after it's used
        await context.delete(getParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Account linked successfully.' })
        };
    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error.' })
        };
    }
};
