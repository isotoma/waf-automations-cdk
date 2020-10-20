import {
    CloudFormationCustomResourceCreateEvent,
    CloudFormationCustomResourceDeleteEvent,
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceResponse,
    CloudFormationCustomResourceUpdateEvent,
} from 'aws-lambda';
import * as AWS from 'aws-sdk';

const TemplateURL = 'https://s3.amazonaws.com/solutions-reference/aws-waf-security-automations/latest/aws-waf-security-automations.template';

export const onCreate = async (event: CloudFormationCustomResourceCreateEvent): Promise<any> => {
    const accessLogBucketName = event.ResourceProperties.AccessLogBucketName;
    const StackName = event.ResourceProperties.StackName;
    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    try {
        const response = await cfn
            .createStack({
                StackName,
                ClientRequestToken: event.RequestId,
                TemplateURL,
                Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
                Parameters: [
                    {
                        ParameterKey: 'AppAccessLogBucket',
                        ParameterValue: accessLogBucketName,
                    },
                ],
            })
            .promise();
        return {
            PhysicalResourceId: StackName,
        };
    } catch (err) {
        return {
            Status: 'FAILED',
            Reason: `${err}`,
            PhysicalResourceId: StackName,
        };
    }
};

export const onDelete = async (event: CloudFormationCustomResourceDeleteEvent): Promise<any> => {
    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    try {
        const response = await cfn
            .deleteStack({
                StackName: event.PhysicalResourceId,
                ClientRequestToken: event.RequestId,
            })
            .promise();
        return {
            PhysicalResourceId: event.PhysicalResourceId,
        };
    } catch (err) {
        return {
            Status: 'FAILED',
            Reason: `${err}`,
            PhysicalResourceId: event.PhysicalResourceId,
        };
    }
};

export const onEvent = (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> => {
    console.log(JSON.stringify(event));
    try {
        switch (event.RequestType) {
            case 'Create':
            case 'Update':
                return onCreate(event as CloudFormationCustomResourceCreateEvent);
            case 'Delete':
                return onDelete(event as CloudFormationCustomResourceDeleteEvent);
            default:
                return Promise.reject(`Unknown event type in event ${event}`);
        }
    } catch (err) {
        console.error(err);
        return Promise.reject('Failed');
    }
};

export const isComplete = async (event: CloudFormationCustomResourceEvent): Promise<any> => {
    console.log(JSON.stringify(event));
    const StackName = event.ResourceProperties.StackName;
    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    const response = await cfn
        .describeStacks({
            StackName,
        })
        .promise();
    if (response.Stacks && response.Stacks[0].StackStatus.endsWith('COMPLETE')) {
        return { IsComplete: true };
    } else {
        return { IsComplete: false };
    }
};
