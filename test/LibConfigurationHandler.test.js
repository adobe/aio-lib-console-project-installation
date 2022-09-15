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

const fs = require('fs')
const path = require('path')
const { expect, describe, test, beforeEach } = require('@jest/globals')
const LibConfigurationHandler = require('../src/lib/configuration-handler')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('LibConfigurationHandler', () => {
  test('Successfully validate a JSON installation configuration file: Full example', async () => {
    const jsonConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '/fixtures/templateConfig-full-valid.json')))
    const templateConfiguration = LibConfigurationHandler.validate(jsonConfig)
    expect(templateConfiguration.valid).toEqual(true)
  })

  test('Successfully validate a JSON installation configuration file: Minimum example', async () => {
    const jsonConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '/fixtures/templateConfig-minimum-valid.json')))
    const templateConfiguration = LibConfigurationHandler.validate(jsonConfig)
    expect(templateConfiguration.valid).toEqual(true)
  })

  test('Successfully validate a YAML installation configuration file: Full example', () => {
    const templateConfiguration = LibConfigurationHandler.loadAndValidate(path.join(__dirname, '/fixtures/templateConfig-full-valid.yaml'))
    const expectedOutput = JSON.parse('{"format":"yaml","values":{"$id":"https://adobe.io/schemas/app-builder-templates/1","$schema":"http://json-schema.org/draft-07/schema","categories":["ui","action"],"extensions":[{"extensionPointId":"dx/excshell/1"}],"env":{"envKey1":"envValue1","envKey2":"envValue2"},"workspaces":["Stage","Production"],"apis":[{"code":"CC SDK","name":"Creative SDK"},{"code":"StockSDK","name":"Adobe Stock SDK"}],"runtime":false,"event":{"consumer":{"type":"some-type","provider":["event-type-1","event-type-2"]},"provider":{"name":"provider-name","description":"provider-description","event-types":["event-type-1","event-type-2"]}}}}')
    expect(templateConfiguration).toEqual(expectedOutput)
  })

  test('Successfully validate a YAML installation configuration file: Minimum example', async () => {
    const templateConfiguration = LibConfigurationHandler.loadAndValidate(path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    const expectedOutput = JSON.parse('{"format":"yaml","values":{"$id":"https://adobe.io/schemas/app-builder-templates/1","$schema":"http://json-schema.org/draft-07/schema","categories":["ui"]}}')
    expect(templateConfiguration).toEqual(expectedOutput)
  })

  test('Unsuccessfully validate a JSON installation configuration file: Minimum example', async () => {
    const fixturePath = path.join(__dirname, '/fixtures/templateConfig-minimum-invalid.json')
    expect(() => {
      LibConfigurationHandler.load(fixturePath)
    }).toThrow()
  })

  test('Unsuccessfully validate a YAML installation configuration file: Minimum example', async () => {
    const fixturePath = path.join(__dirname, '/fixtures/templateConfig-minimum-invalid.yaml')
    expect(() => {
      LibConfigurationHandler.load(fixturePath)
    }).toThrow()
  })

  test('Successfully validate an empty YAML installation configuration file', async () => {
    const templateConfiguration = LibConfigurationHandler.load(path.join(__dirname, '/fixtures/templateConfig-empty.yaml'))
    const expectedOutput = JSON.parse('{ "values": {}, "format": "json" }')
    expect(templateConfiguration).toEqual(expectedOutput)
  })

  test('Unsuccessfully validate a YAML installation configuration file with invalid keys', async () => {
    const fixturePath = path.join(__dirname, '/fixtures/templateConfig-minimum-invalid-keys.yaml')
    expect(() => {
      LibConfigurationHandler.loadAndValidate(fixturePath)
    }).toThrow()
  })

  test('Successfully validate a Buffer JSON installation configuration file: Minimum example', async () => {
    const buffer = Buffer.from('{}', 'utf-8')
    const templateConfiguration = LibConfigurationHandler.load(buffer)
    const expectedOutput = JSON.parse('{ "values": {}, "format": "json" }')
    expect(templateConfiguration).toEqual(expectedOutput)
  })

  test('Successfully validate an empty JSON installation configuration file: Minimum example', async () => {
    const templateConfiguration = LibConfigurationHandler.load()
    const expectedOutput = JSON.parse('{ "values": {}, "format": "json" }')
    expect(templateConfiguration).toEqual(expectedOutput)
  })

  test('Validate getting services required by a template from the configuration file', () => {
    const templateRequiredServices = LibConfigurationHandler.getTemplateRequiredServices(path.join(__dirname, '/fixtures/templateConfig-console-multiple-apis.yaml'))
    const expectedOutput = { runtime: true, apis: [{ code: 'GraphQLServiceSDK' }, { code: 'sixthSDK' }, { code: 'AssetComputeSDK' }, { code: 'secondSDK' }] }
    expect(templateRequiredServices).toEqual(expectedOutput)
  })

  test('Validate getting services required by a template from the configuration file with no services specified', () => {
    const templateRequiredServices = LibConfigurationHandler.getTemplateRequiredServices(path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    const expectedOutput = { runtime: false, apis: [] }
    expect(templateRequiredServices).toEqual(expectedOutput)
  })
})
