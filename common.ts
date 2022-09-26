export interface WafSecurityAutomationsOptions {
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
    readonly requestThresholdPerFiveMinutes: number | undefined;
    readonly errorThresholdPerMinute: number | undefined;
    readonly wafBlockPeriodMinutes: number | undefined;
    readonly keepDataInOriginalS3Location: boolean | undefined;
}

export const optionsDefaults: WafSecurityAutomationsOptions = {
    templateVersion: 'v3.1.0',
    activateSqlInjectionProtection: true,
    activateCrossSiteScriptingProtection: true,
    activateHttpFloodProtection: true,
    httpFloodProtectionMethod: 'waf',
    activateScannersProbesProtection: true,
    scannersProbesProtectionMethod: 'lambda',
    activateReputationListsProtection: true,
    activateBadBotProtection: true,
    endpointType: 'cloudfront',
    requestThresholdPerFiveMinutes: 100,
    errorThresholdPerMinute: 50,
    wafBlockPeriodMinutes: 240,
    keepDataInOriginalS3Location: false,
};
