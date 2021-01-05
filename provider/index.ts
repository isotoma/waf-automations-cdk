import {
    CloudFormationCustomResourceCreateEvent,
    CloudFormationCustomResourceDeleteEvent,
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceResponse,
    CloudFormationCustomResourceUpdateEvent,
} from 'aws-lambda';
import * as AWS from 'aws-sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (item: Record<string, any>): void => {
    console.log(JSON.stringify(item));
};

const getTemplateUrl = (version: string): string => {
    return `https://s3.amazonaws.com/solutions-reference/aws-waf-security-automations/${version}/aws-waf-security-automations.template`;
};

const sdkArgsForCreateOrUpdate = (
    event: CloudFormationCustomResourceCreateEvent | CloudFormationCustomResourceUpdateEvent,
): AWS.CloudFormation.Types.CreateStackInput & AWS.CloudFormation.Types.UpdateStackInput => {
    const accessLogBucketName = event.ResourceProperties.AccessLogBucketName;
    const stackName = event.ResourceProperties.StackName;
    const templateUrl = getTemplateUrl(event.ResourceProperties.TemplateVersion ?? 'latest');

    return {
        StackName: stackName,
        ClientRequestToken: event.RequestId,
        TemplateURL: templateUrl,
        Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
        Parameters: [
            {
                ParameterKey: 'AppAccessLogBucket',
                ParameterValue: accessLogBucketName,
            },
        ],
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onCreate = async (event: CloudFormationCustomResourceCreateEvent): Promise<any> => {
    log({ message: 'Running onCreate' });
    const args = sdkArgsForCreateOrUpdate(event);
    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    const response = await cfn.createStack(args).promise();
    log({ message: 'Ran createStack', response });
    return {
        PhysicalResourceId: args.StackName,
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onUpdate = async (event: CloudFormationCustomResourceUpdateEvent): Promise<any> => {
    log({ message: 'Running onUpdate' });
    const args = sdkArgsForCreateOrUpdate(event);
    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    const response = await cfn.updateStack(args).promise();
    log({ message: 'Ran updateStack', response });
    return {
        PhysicalResourceId: args.StackName,
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onDelete = async (event: CloudFormationCustomResourceDeleteEvent): Promise<any> => {
    log({ message: 'Running onDelete' });

    const cfn = new AWS.CloudFormation({ region: 'us-east-1' });
    const response = await cfn
        .deleteStack({
            StackName: event.PhysicalResourceId,
            ClientRequestToken: event.RequestId,
        })
        .promise();
    log({ message: 'Ran deleteStack', response });
    return {
        PhysicalResourceId: event.PhysicalResourceId,
    };
};

export const onEvent = (event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> => {
    log({ message: 'Starting onEvent', event });
    try {
        switch (event.RequestType) {
            case 'Create':
                return onCreate(event as CloudFormationCustomResourceCreateEvent);
            case 'Update':
                return onUpdate(event as CloudFormationCustomResourceUpdateEvent);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isComplete = async (event: CloudFormationCustomResourceEvent): Promise<any> => {
    log({ message: 'Starting isComplete', event });
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
