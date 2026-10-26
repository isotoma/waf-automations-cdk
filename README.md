# waf-automations-cdk

## Usage

```typescript
const wafAutomations = new WafSecurityAutomations(this, 'waf-security-automations', {
    stackName: 'waf-security-automations',
    accessLogBucket: myLogBucket,
    options: {
        // See below
    },
});

// Can now use the following:
wafAutomations.webAclName  // string, the name of the created webAcl, will match stackName due to implementation of the cfn template
wafAutomations.webAclArn  // string, arn of the created webAcl, pass this to a Cloudfront distribution
wafAutomations.webAclId   // string
wafAutomations.webAclDescription  // string
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
| `endpointType`                         | `'cloudfront'` | Select the type of resource being used, alternative: `'alb'` (Note, see https://github.com/isotoma/waf-automations-cdk/issues/14)                                     |
| `errorThresholdPerMinute`              | 50             | If `activateScannersProbesProtection` is enabled, enter the maximum acceptable bad requests per minute per IP.                                                        |
| `requestThresholdPerFiveMinutes`       | 100            | If `activateHttpFloodProtection` is enabled, enter the maximum acceptable requests per FIVE-minute period per IP address. >=100 if using WAF, >0 if Lambda or Athena. |
| `wafBlockPeriodMinutes`                | 240            | If `activateScannersProbesProtection` or `activateHttpFloodProtection` is enabled, enter the period (in minutes) to block applicable IP addresses.                    |
| `keepDataInOriginalS3Location`         | `false`        | By default log files will be moved from their original location to a partitioned folder structure in s3. Set to `true` to copy instead.                               |

## Development

### Releasing a new version

Run
```
$ npm version (patch|minor|major)
$ git push origin main [tag you just created]
```

The tag triggers a GitHub Actions job that stages the release on npm.

#### Approving the release

Pushing the tag does not put anything in front of consumers. The workflow uses
[staged publishing](https://docs.npmjs.com/staged-publishing/): the version lands
in the registry but is not installable until a maintainer approves it with 2FA.

After the tag job goes green, approve it in the Staged Packages tab on npmjs.com,
or from the CLI:

```bash
npm stage list
npm stage approve <stage-id>
```

`npm stage reject` discards it instead. A staged version occupies its version
number, so to stage the same version again, reject the existing stage first.

#### Authentication

Publishing uses [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
over OIDC, so there is no `NPM_TOKEN` secret. The job requests `id-token: write`
and the npm CLI exchanges that for a short-lived token, which also generates
provenance attestations automatically.

The trust relationship is configured on npmjs.com under the package's settings,
naming the organisation, the repository, and the workflow filename
(`publish.yaml`). Existing configurations cannot be edited, only deleted and
recreated.

Staged publishing needs npm 11.15.0 or later, above what Node 24 bundles, so the
workflow installs npm explicitly and asserts the version. Below that floor the
CLI falls back to token authentication and fails with a misleading `E404`.

OIDC covers `npm publish` and `npm stage publish` only. The approve, reject, list
and view subcommands need interactive authentication and cannot use it.
