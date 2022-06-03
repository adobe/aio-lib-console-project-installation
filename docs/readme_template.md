<!--
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
-->

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# Adobe I/O Lib Console Project Installation

### Installing

```bash
$ npm install @adobe/aio-lib-console-project-installation
```

### Usage
1) Initialize the template handler

```javascript
const { getToken } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const sdk = require('@adobe/aio-lib-console')
const templateHandler = require('@adobe/aio-lib-console-project-installation')

// Instantiate Adobe Developer Console SDK
const accessToken = await getToken(CLI)
const apiKey = 'aio-cli-console-auth'
const client = await sdk.init(accessToken, apiKey)

// Instantiate App Builder Template Manager
const installConfigFile = 'install.yml'
const templateManager = templateHandler.init(client, installConfigFile)
```

2) Call methods using the initialized Template Manager

```javascript
  // Install the template
  try {
    const orgId = 'org-id'
    const templateId = 'template-id'
    const result = await templateManager.installTemplate(orgId, templateId)
    console.log(result)

  } catch (e) {
    console.error(e)
  }
```

{{>main-index~}}
{{>all-docs~}}


### Debug Logs

```bash
LOG_LEVEL=debug <your_call_here>
```

Prepend the `LOG_LEVEL` environment variable and `debug` value to the call that invokes your function, on the command line. This should output a lot of debug data for your SDK calls.

### Contributing

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
