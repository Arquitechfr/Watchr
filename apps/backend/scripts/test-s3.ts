import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, buildPublicUrl } from "../src/lib/s3.js";
import { env } from "../src/config/env.js";

async function testS3() {
  const bucket = env.MINIO_S3_BUCKET;
  const testKey = "test/test-s3-connection.txt";
  const testContent = `Hello from Watchr S3 test! ${new Date().toISOString()}`;

  console.log("=== S3 Connection Test ===");
  console.log("Endpoint:", env.MINIO_S3_ENDPOINT);
  console.log("Bucket:", bucket);
  console.log("Region:", env.MINIO_S3_REGION);
  console.log("ForcePathStyle:", env.S3_FORCE_PATH_STYLE);
  console.log();

  // Step 1: Upload
  console.log("1. Uploading test file...");
  try {
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: "text/plain",
    });
    await s3Client.send(putCommand);
    console.log("   ✓ Upload successful");
  } catch (err) {
    console.error("   ✗ Upload failed:", err);
    process.exit(1);
  }

  // Step 2: Build public URL
  const publicUrl = buildPublicUrl(testKey);
  console.log();
  console.log("2. Public URL:");
  console.log("   ", publicUrl);

  // Step 3: Retrieve via S3 API
  console.log();
  console.log("3. Retrieving file via S3 API...");
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: testKey,
    });
    const response = await s3Client.send(getCommand);
    const body = await response.Body!.transformToString();
    console.log("   ✓ Retrieved content:", body);

    if (body === testContent) {
      console.log("   ✓ Content matches original");
    } else {
      console.log("   ✗ Content mismatch!");
    }
  } catch (err) {
    console.error("   ✗ Retrieve failed:", err);
    process.exit(1);
  }

  // Step 4: Test public URL access (HTTP GET)
  console.log();
  console.log("4. Testing public URL via HTTP...");
  try {
    const res = await fetch(publicUrl);
    if (res.ok) {
      const text = await res.text();
      console.log("   ✓ HTTP status:", res.status);
      console.log("   ✓ Content:", text);
      if (text === testContent) {
        console.log("   ✓ Public URL content matches");
      } else {
        console.log("   ✗ Public URL content mismatch!");
      }
    } else {
      console.log("   ✗ HTTP status:", res.status, res.statusText);
    }
  } catch (err) {
    console.error("   ✗ Public URL fetch failed:", err);
  }

  // Step 5: Test image upload (binary)
  console.log();
  console.log("5. Uploading a fake image (1x1 PNG)...");
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const imageKey = "test/test-avatar.png";
  try {
    const putImage = new PutObjectCommand({
      Bucket: bucket,
      Key: imageKey,
      Body: pngBuffer,
      ContentType: "image/png",
    });
    await s3Client.send(putImage);
    const imageUrl = buildPublicUrl(imageKey);
    console.log("   ✓ Image upload successful");
    console.log("   ✓ Image URL:", imageUrl);

    // Verify image is accessible
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const contentType = imgRes.headers.get("content-type");
      console.log("   ✓ Image HTTP status:", imgRes.status);
      console.log("   ✓ Image content-type:", contentType);
    } else {
      console.log("   ✗ Image HTTP status:", imgRes.status);
    }
  } catch (err) {
    console.error("   ✗ Image upload failed:", err);
  }

  console.log();
  console.log("=== Test Complete ===");
}

testS3().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
