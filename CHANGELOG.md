## [3.0.1](https://github.com/Sagacify/sqs-handler/compare/v3.0.0...v3.0.1) (2024-10-10)


### Bug Fixes

* **npm:** correct package.json main attribute ([4335b83](https://github.com/Sagacify/sqs-handler/commit/4335b834db086f00d44cc5c780c325ad486a83bf))

# [3.0.0](https://github.com/Sagacify/sqs-handler/compare/v2.0.1...v3.0.0) (2024-10-10)


### Features

* upgrade AWS sdk to v3 ([a9b8790](https://github.com/Sagacify/sqs-handler/commit/a9b8790138ae1b335d985c0988113ffe8149d3be))


### BREAKING CHANGES

* SQSHandler constructor takes a SQSClient from AWS sdk v3 now

## [2.0.1](https://github.com/Sagacify/sqs-handler/compare/v2.0.0...v2.0.1) (2022-06-04)


### Bug Fixes

* **types:** change Body & MessageBody to any ([d9f23e3](https://github.com/Sagacify/sqs-handler/commit/d9f23e3c4d7d310e21bc1b22ba58df79262fb916))

# [2.0.0](https://github.com/Sagacify/sqs-handler/compare/v1.2.1...v2.0.0) (2022-05-25)


### Features

* migrate to typescript ([87fa19e](https://github.com/Sagacify/sqs-handler/commit/87fa19ee250a045ca9297c266ae9a352125dedd4))


### BREAKING CHANGES

* stop using default export & require engine > 12.4.0
