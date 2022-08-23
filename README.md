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

This is an internal helper library to create and configure remote Developer Console resources, like services and credentials, based on a template's `install.yaml` configuration file.

The following keys are supported in the `install.yaml` file:

- `categories`: (Required) Categories are informational and at least one category must be defined. See a list of supported categories [here](https://git.corp.adobe.com/CNA/aio-template-support/blob/main/categories.json).
- `workspaces`: (Optional) A list of workspace names to create. Runtime namespaces are added by default for each workspace, if the runtime key is set to true. Staging and Production workspaces are created by default if not defined.
- `runtime`: (Optional) Defines whether Runtime should be configured for each workspace. If not defined, the default is `false`.
- `apis`: (Optional) A list of Adobe services, identified by their SDK code required by the template to work. By default, all services are attached to all configured workspaces.

> A note on `apis`:
> Developer Console supports three types of services: AdobeIO, Enterprise and Analytics.
> Currently, only AdobeIO and Enterprise services are supported for configuration by this library.

### Installing

```bash
$ npm install @adobe/aio-lib-console-project-installation
```

### Usage
1) Initialize the template handler

```javascript
const { getToken } = require('@adobe/aio-lib-ims')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const templateHandler = require('@adobe/aio-lib-console-project-installation')

// Instantiate Adobe Developer Console SDK
const accessToken = await getToken(CLI)

// Instantiate App Builder Template Manager
const installConfigFile = 'install.yml'
const templateManager = await templateHandler.init(accessToken, installConfigFile)
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

## Functions

<dl>
<dt><a href="#validate">validate(configJson)</a> ⇒ <code>object</code></dt>
<dd><p>Validate the config json</p>
</dd>
<dt><a href="#load">load(fileOrBuffer)</a> ⇒ <code>object</code></dt>
<dd><p>Load a config file</p>
</dd>
<dt><a href="#loadAndValidate">loadAndValidate(fileOrBuffer)</a> ⇒ <code>object</code></dt>
<dd><p>Load and validate a config file</p>
</dd>
</dl>

<a name="validate"></a>

## validate(configJson) ⇒ <code>object</code>
Validate the config json

**Kind**: global function  
**Returns**: <code>object</code> - with keys valid (boolean) and errors (object). errors is null if no errors  

| Param | Type | Description |
| --- | --- | --- |
| configJson | <code>object</code> | the json to validate |

<a name="load"></a>

## load(fileOrBuffer) ⇒ <code>object</code>
Load a config file

**Kind**: global function  
**Returns**: <code>object</code> - object with properties `value` and `format`  

| Param | Type | Description |
| --- | --- | --- |
| fileOrBuffer | <code>string</code> | the path to the config file or a Buffer |

<a name="loadAndValidate"></a>

## loadAndValidate(fileOrBuffer) ⇒ <code>object</code>
Load and validate a config file

**Kind**: global function  
**Returns**: <code>object</code> - object with properties `value` and `format`  

| Param | Type | Description |
| --- | --- | --- |
| fileOrBuffer | <code>string</code> | the path to the config file or a Buffer |

### Debug Logs

```bash
LOG_LEVEL=debug <your_call_here>
```

Prepend the `LOG_LEVEL` environment variable and `debug` value to the call that invokes your function, on the command line. This should output a lot of debug data for your SDK calls.

### Contributing

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
