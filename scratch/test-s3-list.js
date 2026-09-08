require('dotenv').config();
const { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } = require('@aws-sdk/client-cognito-identity');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

async function testUnauthS3() {
  const REGION = process.env.COGNITO_REGION || 'ap-northeast-1';
  const IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID;
  const BUCKET = process.env.AWS_S3_BUCKET_NAME;

  const identityClient = new CognitoIdentityClient({ region: REGION });

  try {
    console.log('Trying unauthenticated identity...');
    const getIdRes = await identityClient.send(new GetIdCommand({
      IdentityPoolId: IDENTITY_POOL_ID,
    }));
    console.log('Got Identity ID:', getIdRes.IdentityId);

    const credRes = await identityClient.send(new GetCredentialsForIdentityCommand({
      IdentityId: getIdRes.IdentityId,
    }));
    console.log('Got Credentials:', credRes.Credentials ? 'Yes' : 'No');

    const s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: credRes.Credentials.AccessKeyId,
        secretAccessKey: credRes.Credentials.SecretKey,
        sessionToken: credRes.Credentials.SessionToken,
      }
    });

    const listRes = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 10,
    }));

    console.log('ListObjects success! Count:', listRes.KeyCount);
    if (listRes.Contents) {
      listRes.Contents.forEach(c => console.log(' -', c.Key, c.Size));
    }
  } catch (e) {
    console.error('Error with unauth:', e.message);
  }
}

testUnauthS3();
