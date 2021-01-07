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

const filterUndefined = <A>(items: Array<A | undefined>): Array<A> => {
    const filtered: Array<A> = [];
    for (const item of items) {
        if (typeof item !== 'undefined') {
            filtered.push(item);
        }
    }
    return filtered;
};

const getTemplateUrl = (version: string): string => {
    return `https://s3.amazonaws.com/solutions-reference/aws-waf-security-automations/${version}/aws-waf-security-automations.template`;
};

interface CloudformationParameter {
    readonly ParameterKey: string;
    readonly ParameterValue: string;
}

const simpleBooleanValue = (value: unknown): string | undefined => {
    if (typeof value === 'boolean') {
        return value ? 'yes' : 'no';
    }

    return undefined;
};

const capitalise = (value: string): string => {
    return value.charAt(0).toUpperCase() + value.slice(1);
};

const simpleBooleanValueCapitalised = (value: unknown): string | undefined => {
    const val = simpleBooleanValue(value);
    if (typeof val !== 'string') {
        return val;
    }

    return capitalise(val);
};

const simpleConfigValue = (options: Record<string, string>) => (selectedOption: unknown): string | undefined => {
    if (typeof selectedOption === 'string') {
        const foundOption = options[selectedOption];

        if (typeof foundOption === 'undefined') {
            log({ message: 'Invalid selected option', selectedOption, options });
            throw new Error(`Invalid selected option, ${selectedOption}`);
        }

        return foundOption;
    }
    return undefined;
};

const booleanValueWithConfig = (options: Record<string, string>) => (value: unknown, selectedOption: unknown): string | undefined => {
    if (typeof value === 'boolean' && !value) {
        return 'no';
    }
    if (typeof selectedOption === 'string') {
        const foundOption = options[selectedOption];

        if (typeof foundOption === 'undefined') {
            log({ message: 'Invalid selected option', selectedOption, options });
            throw new Error(`Invalid selected option, ${selectedOption}`);
        }

        return `yes - ${foundOption}`;
    }
    return undefined;
};

const numberValue = (value: unknown): string | undefined => {
    if (typeof value === 'number') {
        return `${value}`;
    }
    return undefined;
};

const activateHttpFloodProtectionValue = booleanValueWithConfig({
    waf: 'AWS WAF rate based rule',
    lamda: 'AWS Lambda log parser',
    athena: 'Amazon Athena log parser',
});

const activateScannersProbesProtectionValue = booleanValueWithConfig({
    lambda: 'AWS Lambda log parser',
    athena: 'Amazon Athena log parser',
});

const endpointTypeValue = simpleConfigValue({
    cloudfront: 'CloudFront',
    alb: 'ALB',
});

const createParameter = (name: string, value: string | undefined): CloudformationParameter | undefined => {
    if (typeof value === 'undefined') {
        return undefined;
    }
    return {
        ParameterKey: name,
        ParameterValue: value,
    };
};

const loadParametersFromOptions = (optionsJson: unknown): Array<CloudformationParameter> => {
    log({ message: 'Parsing options', optionsJson });
    if (typeof optionsJson !== 'string') {
        log({ message: 'Received options not a string' });
        return [];
    }
    let parsedOptions: unknown;
    try {
        parsedOptions = JSON.parse(optionsJson);
    } catch (err) {
        log({ message: 'Received options not parsable JSON' });
        return [];
    }

    if (typeof parsedOptions !== 'object') {
        log({ message: 'Received options not JSON object' });
        return [];
    }

    if (!parsedOptions) {
        log({ message: 'Received options is null' });
        return [];
    }

    const options: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsedOptions)) {
        options[key] = value;
    }

    log({ message: 'Parsed from JSON', options });

    const params: Array<CloudformationParameter | undefined> = [
        createParameter('ActivateSqlInjectionProtectionParam', simpleBooleanValue(options.activateSqlInjectionProtection)),
        createParameter('ActivateCrossSiteScriptingProtectionParam', simpleBooleanValue(options.activateCrossSiteScriptingProtection)),
        createParameter('ActivateHttpFloodProtectionParam', activateHttpFloodProtectionValue(options.activateHttpFloodProtection, options.httpFloodProtectionMethod)),
        createParameter('ActivateScannersProbesProtectionParam', activateScannersProbesProtectionValue(options.activateScannersProbesProtection, options.scannersProbesProtectionMethod)),
        createParameter('ActivateReputationListsProtectionParam', simpleBooleanValue(options.activateReputationListsProtection)),
        createParameter('ActivateBadBotProtectionParam', simpleBooleanValue(options.activateBadBotProtection)),
        createParameter('EndpointType', endpointTypeValue(options.endpointType)),
        createParameter('ErrorThreshold', numberValue(options.errorThresholdPerMinute)),
        createParameter('RequestThreshold', numberValue(options.requestThresholdPerFiveMinutes)),
        createParameter('WAFBlockPeriod', numberValue(options.wafBlockPeriodMinutes)),
        createParameter('KeepDataInOriginalS3Location', simpleBooleanValueCapitalised(options.keepDataInOriginalS3Location)),
    ];

    log({ message: 'Parsed to Cloudformation params', params });
    return filterUndefined(params);
};

const sdkArgsForCreateOrUpdate = (
    event: CloudFormationCustomResourceCreateEvent | CloudFormationCustomResourceUpdateEvent,
): AWS.CloudFormation.Types.CreateStackInput & AWS.CloudFormation.Types.UpdateStackInput => {
    const accessLogBucketName = event.ResourceProperties.AccessLogBucketName;
    const stackName = event.ResourceProperties.StackName;
    const templateUrl = getTemplateUrl(event.ResourceProperties.TemplateVersion ?? 'latest');
    const parameters = loadParametersFromOptions(event.ResourceProperties.Options ?? '');

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
            ...parameters,
        ],
    };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onCreate = async (event: CloudFormationCustomResourceCreateEvent): Promise<any> => {
    log({ message: 'Running onCreate' });
    const args = sdkArgsForCreateOrUpdate(event);
    log({ message: 'Running createStack', args });
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
    log({ message: 'Running updateStack', args });
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
                return onCreate(event);
            case 'Update':
                return onUpdate(event);
            case 'Delete':
                return onDelete(event);
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
