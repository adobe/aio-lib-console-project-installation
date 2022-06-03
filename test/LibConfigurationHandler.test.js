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
    console.log(templateConfiguration)
    expect(templateConfiguration.valid).toEqual(true)
  })

  test('Successfully validate a JSON installation configuration file: Minimum example', async () => {
    const jsonConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '/fixtures/templateConfig-minimum-valid.json')))
    const templateConfiguration = LibConfigurationHandler.validate(jsonConfig)
    console.log(templateConfiguration)
    expect(templateConfiguration.valid).toEqual(true)
  })

  test('Successfully validate a YAML installation configuration file: Full example', async () => {
    const templateConfiguration = LibConfigurationHandler.loadAndValidate(path.join(__dirname, '/fixtures/templateConfig-full-valid.yaml'))
    const expectedOutput = JSON.parse('{"format":"yaml","values":{"categories":["ui","action"],"extension":{"serviceCode":"dx/excshell/1"},"env":{"envKey1":"envValue1","envKey2":"envValue2"},"workspaces":["Stage","Production"],"apis":[{"code":"CC SDK","name":"Creative SDK"},{"code":"StockSDK","name":"Adobe Stock SDK"}],"runtime":false,"event":{"consumer":{"type":"some-type","provider":["event-type-1","event-type-2"]},"provider":{"name":"provider-name","description":"provider-description","event-types":["event-type-1","event-type-2"]}}}}')
    expect(templateConfiguration).toEqual(expectedOutput)
  })

  test('Successfully validate a YAML installation configuration file: Minimum example', async () => {
    const templateConfiguration = LibConfigurationHandler.loadAndValidate(path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))
    const expectedOutput = JSON.parse('{"format":"yaml","values":{"categories":["ui"]}}')
    expect(templateConfiguration).toEqual(expectedOutput)
  })
})
