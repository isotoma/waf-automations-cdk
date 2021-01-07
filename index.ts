import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaJs from '@aws-cdk/aws-lambda-nodejs';
import * as cdk from '@aws-cdk/core';
import * as cr from '@aws-cdk/custom-resources';
import * as path from 'path';

interface WafSecurityAutomationsOptions {
    // See https://github.com/awslabs/aws-waf-security-automations/releases for released versions
    readonly templateVersion: string;
    readonly activateSqlInjectionProtection: boolean | undefined;
    readonly activateCrossSiteScriptingProtection: boolean | undefined;
    readonly activateHttpFloodProtection: boolean | undefined;
    readonly httpFloodProtectionMethod: 'waf' | 'lambda' | 'athena' | undefined;
    readonly activateScannersProbesProtection: boolean | undefined;
    readonly scannersProbesProtectionMethod: 'lambda' | 'athena' | undefined;
    readonly activateReputationListsProtection: boolean | undefined;
    readonly activateBadBotProtection: boolean | undefined;
    readonly endpointType: 'cloudfront' | 'alb' | undefined;
    readonly requestThreshold: number | undefined;
    readonly errorThreshold: number | undefined;
    readonly wafBlockPeriod: number | undefined;
    readonly keepDataInOriginalS3Location: boolean | undefined;
}

const optionsDefaults: WafSecurityAutomationsOptions = {
    templateVersion: 'v3.1.0',
    activateSqlInjectionProtection: undefined,
    activateCrossSiteScriptingProtection: undefined,
    activateHttpFloodProtection: undefined,
    httpFloodProtectionMethod: undefined,
    activateScannersProbesProtection: undefined,
    scannersProbesProtectionMethod: undefined,
    activateReputationListsProtection: undefined,
    activateBadBotProtection: undefined,
    endpointType: undefined,
    requestThreshold: undefined,
    errorThreshold: undefined,
    wafBlockPeriod: undefined,
    keepDataInOriginalS3Location: undefined,
};

export class WafSecurityAutomationsProps {
    readonly options?: Partial<WafSecurityAutomationsOptions>;
    readonly accessLogBucket: s3.IBucket;
    readonly stackName: string;
}

export class WafSecurityAutomations extends cdk.Construct {
    public readonly accessLogBucket: s3.IBucket;
    public readonly stackName: string;
    public readonly resource: cdk.CustomResource;

    constructor(scope: cdk.Construct, id: string, props: WafSecurityAutomationsProps) {
        super(scope, id);
        if (!props.accessLogBucket) {
            throw new Error('No log bucket specified');
        }
        this.accessLogBucket = props.accessLogBucket;
        this.stackName = props.stackName ?? 'AWSWafSecurityAutomations';

        const options = {
            ...optionsDefaults,
            ...(props.options ?? {}),
        };

        const providerFunctionShared = {
            entry: path.join(__dirname, 'provider', 'index.ts'),
            runtime: lambda.Runtime.NODEJS_12_X,
            timeout: cdk.Duration.minutes(15),
            initialPolicy: [
                new iam.PolicyStatement({
                    resources: ['*'],
                    actions: ['*'],
                }),
            ],
        };

        const onEventHandler = new lambdaJs.NodejsFunction(this, 'waf-automations-event', {
            ...providerFunctionShared,
            handler: 'onEvent',
        });

        const isCompleteHandler = new lambdaJs.NodejsFunction(this, 'waf-automations-complete', {
            ...providerFunctionShared,
            handler: 'isComplete',
        });

        const provider = new cr.Provider(this, 'waf-automations-provider', {
            onEventHandler,
            isCompleteHandler,
        });

        this.resource = new cdk.CustomResource(this, 'waf-automations', {
            serviceToken: provider.serviceToken,
            properties: {
                StackName: this.stackName,
                AccessLogBucketName: this.accessLogBucket.bucketName,
                TemplateVersion: options.templateVersion,
                Options: JSON.stringify(options),
            },
        });
    }
}
