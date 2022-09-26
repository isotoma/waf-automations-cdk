import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib/core';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as path from 'path';
import { WafSecurityAutomationsOptions, optionsDefaults } from './common';

export class WafSecurityAutomationsProps {
    readonly options?: Partial<WafSecurityAutomationsOptions>;
    readonly accessLogBucket: s3.IBucket;
    readonly stackName: string;
}

export class WafSecurityAutomations extends Construct {
    public readonly accessLogBucket: s3.IBucket;
    public readonly stackName: string;
    public readonly resource: cdk.CustomResource;
    public readonly webAclName: string;
    public readonly webAclArn: string;
    public readonly webAclId: string;
    public readonly webAclDescription: string;

    constructor(scope: Construct, id: string, props: WafSecurityAutomationsProps) {
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

        this.webAclName = this.resource.getAttString('WebAclName');
        this.webAclArn = this.resource.getAttString('WebAclArn');
        this.webAclId = this.resource.getAttString('WebAclId');
        this.webAclDescription = this.resource.getAttString('WebAclDescription');
    }
}
