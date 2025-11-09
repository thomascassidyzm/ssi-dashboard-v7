require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const bucket = process.env.S3_BUCKET || 'popty-bach-lfs';

// CORS configuration to allow browser access
const corsConfig = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'HEAD'],
      AllowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://*.vercel.app',
        'https://ssi-dashboard-v7-git-feature-cloud-native-vfs-zenjin.vercel.app'
      ],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3000
    }
  ]
};

// Bucket policy to allow public read access to courses/ prefix only
const bucketPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucket}/courses/*`]
    }
  ]
};

async function configureBucket() {
  console.log('🔧 Configuring S3 Bucket for Public Course Access\n');
  console.log(`Bucket: ${bucket}`);
  console.log(`Region: ${process.env.AWS_REGION || 'eu-west-1'}\n`);

  try {
    // Step 1: Set CORS configuration
    console.log('1️⃣  Setting CORS configuration...');
    await s3.putBucketCors({
      Bucket: bucket,
      CORSConfiguration: corsConfig
    }).promise();
    console.log('   ✅ CORS configured successfully');
    console.log('   📋 Allowed origins:', corsConfig.CORSRules[0].AllowedOrigins.join(', '));
    console.log();

    // Step 2: Disable "Block Public Access" for the bucket (only if needed)
    console.log('2️⃣  Checking public access block settings...');
    try {
      const blockConfig = await s3.getPublicAccessBlock({ Bucket: bucket }).promise();
      console.log('   📊 Current settings:', blockConfig.PublicAccessBlockConfiguration);

      // You may need to manually disable this in AWS Console if it's blocked
      // Or uncomment the following to do it programmatically:
      /*
      await s3.putPublicAccessBlock({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false
        }
      }).promise();
      console.log('   ✅ Public access block settings updated');
      */
      console.log('   ⚠️  If Block Public Access is enabled, you need to disable it in AWS Console');
    } catch (err) {
      console.log('   ℹ️  No public access block configured (this is fine)');
    }
    console.log();

    // Step 3: Set bucket policy for public read
    console.log('3️⃣  Setting bucket policy for public read access to courses/*...');
    await s3.putBucketPolicy({
      Bucket: bucket,
      Policy: JSON.stringify(bucketPolicy, null, 2)
    }).promise();
    console.log('   ✅ Bucket policy set successfully');
    console.log('   📋 Public read access enabled for: courses/*');
    console.log();

    // Step 4: Test public access
    console.log('4️⃣  Testing public access...');
    const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/courses/test_for_eng_5seeds/seed_pairs.json`;
    console.log(`   🔗 Test URL: ${publicUrl}`);
    console.log(`   💡 Try accessing this URL in your browser (should work without credentials)`);
    console.log();

    console.log('✅ S3 bucket configured for public course access!');
    console.log('\n📝 Next steps:');
    console.log('   1. Frontend can now fetch courses directly from S3');
    console.log('   2. Update api.js to use S3 public URLs as fallback');
    console.log('   3. Test on Vercel deployment');

  } catch (error) {
    console.error('\n❌ Configuration failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Insufficient IAM permissions (need s3:PutBucketCors, s3:PutBucketPolicy)');
    console.error('  2. Bucket public access is blocked (check AWS Console)');
    console.error('  3. AWS credentials are invalid');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

configureBucket();
