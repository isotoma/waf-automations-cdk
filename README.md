# waf-automations-cdk

## Usage

```typescript
new WafSecurityAutomations(this, 'waf-security-automations', {
    stackName: 'waf-security-automations',
    accessLogBucket: myLogBucket,
    options: {
        // See below
    },
});
```

This creates a WAFv2 WebACL named matching the `stackName`.

### Options

All are optional

| Attribute                              | Default        | Description                                                                                                                                                           |
| ---------                              | -------        | -----------                                                                                                                                                           |
| `templateVersion`                      | `'v3.1.0'`     | See [releases](https://github.com/awslabs/aws-waf-security-automations/releases).                                                                                     |
| `activateSqlInjectionProtection`       | `true`         | Enables the component designed to block common SQL injection attacks                                                                                                  |
| `activateCrossSiteScriptingProtection` | `true`         | Enables the component designed to block common XSS attacks                                                                                                            |
| `activateHttpFloodProtection`          | `true`         | Enables the component designed to block HTTP flood attacks                                                                                                            |
| `httpFloodProtectionMethod`            | `'waf'`        | Alternatives: `'lambda'` or `'athena'`                                                                                                                                |
| `activateScannersProbesProtection`     | `true`         | Enables the component designed to block scanners and probes                                                                                                           |
| `scannersProbesProtectionMethod`       | `'lambda'`     | Alternative: `'athena'`                                                                                                                                               |
| `activateReputationListsProtection`    | `true`         | Enable to block requests from IP addresses on third-party reputation lists (supported lists: spamhaus, torproject, and emergingthreats).                              |
| `activateBadBotProtection`             | `true`         | Enables the component designed to block bad bots and content scrapers                                                                                                 |
| `endpointType`                         | `'cloudfront'` | Select the type of resource being used, alternative: `'alb'`                                                                                                          |
| `errorThreshold`                       | 50             | If `activateScannersProbesProtection` is enabled, enter the maximum acceptable bad requests per minute per IP.                                                        |
| `requestThreshold`                     | 100            | If `activateHttpFloodProtection` is enabled, enter the maximum acceptable requests per FIVE-minute period per IP address. >=100 if using WAF, >0 if Lambda or Athena. |
| `wafBlockPeriod`                       | 240            | If `activateScannersProbesProtection` or `activateHttpFloodProtection` is enabled, enter the period (in minutes) to block applicable IP addresses.                    |
| `keepDataInOriginalS3Location`         | `false`        | By default log files will be moved from their original location to a partitioned folder structure in s3. Set to `true` to copy instead.                               |

## Development

### Releasing a new version

Run
```
$ npm version (patch|minor|major)
$ git push origin main [tag you just created]
```
