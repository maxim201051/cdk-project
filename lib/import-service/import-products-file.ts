import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


const s3Client = new S3Client({ region: 'eu-west-2' });

export const main = async (event: any) => {
    try {
        const fileName = event.queryStringParameters?.name;

        if (!fileName) {
            return {
                error: "File name is required as a query parameter"
            };
        }

        const bucketName = 'importservicestack-importbucketbaf3a8e9-buey684prolv';
        const key = `uploaded/${fileName}`;

        const putObjectCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const signedUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 3600 }); 

        return signedUrl;
        } catch (error: any) {
        console.error("Error generating signed URL:", error);
        return {
            error: "Could not generate signed URL"
        };
    }
}
