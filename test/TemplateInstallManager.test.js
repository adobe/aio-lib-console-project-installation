/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const path = require('path')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { expect, describe, test, beforeEach } = require('@jest/globals')
const { getToken } = require('@adobe/aio-lib-ims')
const apiKey = 'aio-cli-console-auth'
const sdk = require('@adobe/aio-lib-console')
const templateHandler = require('../src')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('TemplateInstallManager', () => {
  test('Successfully install a template', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)
    const client = await sdk.init(accessToken, apiKey)

    // Instantiate App Builder Template Manager
    const templateManager = templateHandler.init(client, path.join(__dirname, '/fixtures/templateConfig-console-api-full.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    const templateSuccess = await templateManager.installTemplate('343284', '4566206088344794932')
    expect(templateSuccess).toEqual('done')
  })
})
