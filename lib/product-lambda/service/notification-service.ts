import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { Product } from "../entities/product";
import { constants } from "./../constants/constants";

const snsClient = new SNSClient({ region: constants.REGION });
const snsTopicArn = process.env.SNS_TOPIC_ARN!;

export const notificationService = {
    async sendProductsCreatedNotification(createdProducts: Product[]): Promise<void> {
        const message = `The following products were created: ${JSON.stringify(createdProducts)}`;
        try {
            await snsClient.send(
                new PublishCommand({
                TopicArn: snsTopicArn,
                Subject: 'New Products Created',
                Message: message,
                })
            );
            console.log('SNS notification sent.');
        } catch (error) {
            console.error('Error sending SNS notification:', error);
        }
    }
}