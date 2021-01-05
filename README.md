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

### Options

All are optional

| Attribute         | Default    | Description                                                                                                                                       |
| ---------         | -------    | -----------                                                                                                                                       |
| `templateVersion` | `'latest'` | See [releases](https://github.com/awslabs/aws-waf-security-automations/releases). Best to select a version rather than using the dynamic `latest` |

## Development

### Releasing a new version

Run
```
$ npm version (patch|minor|major)
$ git push origin main [tag you just created]
```
