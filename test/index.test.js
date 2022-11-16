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
const templateHandler = require('../src')
const TemplateInstallManager = require('../src/TemplateInstallManager')
jest.mock('@adobe/aio-lib-ims', () => ({
  getToken: jest.fn().mockResolvedValue('mock-access-token')
}))
beforeEach(() => {
  jest.clearAllMocks()
})

describe('index', () => {
  test('Successfully instantiate library', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    expect(templateManager).toBeInstanceOf(TemplateInstallManager)
  })

  test('Successfully instantiate library for stage', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)
    process.env.AIO_CLI_ENV = 'stage'

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    expect(templateManager).toBeInstanceOf(TemplateInstallManager)
  })

  test('Config file path does not exist', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const fixturePath = path.join(__dirname, '/fixtures/file-does-not-exist.yaml')
    await expect(templateHandler.init(accessToken, fixturePath)).rejects.toThrow()
  })

  test('Configifuration is invalid', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const fixturePath = path.join(__dirname, '/fixtures/templateConfig-minimum-invalid-keys.yaml')
    await expect(templateHandler.init(accessToken, fixturePath)).rejects.toThrow()
  })

  test('Config file path is a directory', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const fixturePath = path.join(__dirname, '/fixtures/')
    await expect(templateHandler.init(accessToken, fixturePath)).rejects.toThrow()
  })

  test('Load and validate YAML configuration', async () => {
    const templateConfiguration = await templateHandler.validate(path.join(__dirname, '/fixtures/templateConfig-full-valid.yaml'))
    const expectedOutput = JSON.parse('{"$id":"https://adobe.io/schemas/app-builder-templates/1","$schema":"http://json-schema.org/draft-07/schema","categories":["ui","action"],"extensions":[{"extensionPointId":"dx/excshell/1"}],"env":{"envKey1":"envValue1","envKey2":"envValue2"},"workspaces":["Stage","Production"],"apis":[{"code":"CC SDK","name":"Creative SDK"},{"code":"StockSDK","name":"Adobe Stock SDK"}],"runtime":false,"event":{"consumer":{"type":"some-type","provider":["event-type-1","event-type-2"]},"provider":{"name":"provider-name","description":"provider-description","event-types":["event-type-1","event-type-2"]}}}')
    expect(templateConfiguration.configuration).toEqual(expectedOutput)
  })
})
