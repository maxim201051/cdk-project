import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import csv from "csv-parser";
import { Readable } from "stream";

const s3Client = new S3Client({ region: "eu-west-2" });

export const main = async (event: any) => {
  try {
    console.log("S3 Event:", JSON.stringify(event, null, 2));

    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const objectKey = record.s3.object.key;

      console.log(`Processing file: ${objectKey} from bucket: ${bucketName}`);

      if (!objectKey.startsWith("uploaded/")) {
        console.warn(`Skipping file: ${objectKey}, not in the "uploaded/" folder.`);
        continue;
      }

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await s3Client.send(getObjectCommand);
      const stream = response.Body as Readable;

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv({ separator: "|" }))
          .on("data", (data: any) => {
            console.log("Parsed record:", data);
          })
          .on("end", async () => {
            console.log(`Finished processing file: ${objectKey}`);

            const processedKey = objectKey.replace("uploaded/", "processed/");
            console.log(`Moving file to: ${processedKey}`);

            try {
              const copyObjectCommand = new CopyObjectCommand({
                Bucket: bucketName,
                CopySource: `${bucketName}/${objectKey}`,
                Key: processedKey,
              });
              await s3Client.send(copyObjectCommand);

              const deleteObjectCommand = new DeleteObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
              });
              await s3Client.send(deleteObjectCommand);

              console.log(`File moved to "processed/" folder and deleted from "uploaded/" folder.`);
              resolve(); 
            } catch (error) {
              console.error("Error during copy or delete:", error);
              reject(error); 
            }
          })
          .on("error", (error) => {
            console.error("Error processing stream:", error);
            reject(error); 
          });
      });
    }

    return {
      message: "Files processed and moved successfully",
    };
  } catch (error) {
    console.error("Error processing file:", error);
    return {
      error: "Could not process files",
    };
  }
};