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
const fs = require('fs')
const { expect, describe, test, beforeEach } = require('@jest/globals')
const { getToken } = require('@adobe/aio-lib-ims')
const templateHandler = require('../src')
const TemplateInstallManager = require('../src/TemplateInstallManager')
const appConfigFixture = path.join(__dirname, '/fixtures/app.config.yaml')
const appConfigFile = path.join('/tmp/app.config.yaml')
const templateName = '@adobe/mock-template'

jest.mock('@adobe/aio-lib-ims', () => ({
  getToken: jest.fn().mockResolvedValue('mock-access-token')
}))

beforeEach(() => {
  jest.clearAllMocks()

  // Copy app config fixture to tmp directory
  fs.copyFileSync(appConfigFixture, appConfigFile)
})

describe('index', () => {
  test('Successfully instantiate library', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, appConfigFile, templateName, path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    expect(templateManager).toBeInstanceOf(TemplateInstallManager)
  })

  test('Successfully instantiate library for stage', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)
    process.env.AIO_CLI_ENV = 'stage'

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, appConfigFile, templateName, path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    expect(templateManager).toBeInstanceOf(TemplateInstallManager)
  })

  test('Config file path does not exist', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const fixturePath = path.join(__dirname, '/fixtures/file-does-not-exist.yaml')
    await expect(templateHandler.init(accessToken, appConfigFile, templateName, fixturePath)).rejects.toThrow()
  })

  test('Config file path is a directory', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const fixturePath = path.join(__dirname, '/fixtures/')
    await expect(templateHandler.init(accessToken, appConfigFile, templateName, fixturePath)).rejects.toThrow()
  })
})
