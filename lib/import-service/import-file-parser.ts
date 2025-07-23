import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import csv from "csv-parser";
import { Readable } from "stream";
import { constants } from "./constants/constants";

const catalogItemsQueueUrl = process.env.CATALOG_ITEMS_QUEUE_URL!;
const s3Client = new S3Client({ region: constants.REGION });
const sqsClient = new SQSClient({ region: constants.REGION });

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

      const sendMessagePromises: any[] = [];

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csv({ separator: "|" }))
          .on("data", (data: any) => {
            const message = {
              id: data.id,
              title: data.title,
              description: data.description,
              price: parseFloat(data.price),
              count: parseInt(data.count, 10),
            };
            sendMessagePromises.push(
              sqsClient.send(
                new SendMessageCommand({
                  QueueUrl: catalogItemsQueueUrl,
                  MessageBody: JSON.stringify(message),
                })
              )
            );
          })
          .on("end", async () => {
            try {
              await Promise.all(sendMessagePromises);
              console.log("All messages sent to SQS.");
              resolve();
            } catch (error) {
              console.error("Error sending messages to SQS:", error);
              reject(error);
            }
            
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