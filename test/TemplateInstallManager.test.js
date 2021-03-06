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

const dataMocks = require('./data-mocks')
const path = require('path')
const { CLI } = require('@adobe/aio-lib-ims/src/context')
const { expect, describe, test, beforeEach } = require('@jest/globals')
const { getToken } = require('@adobe/aio-lib-ims')
const templateHandler = require('../src')
jest.mock('@adobe/aio-lib-ims', () => ({
  getToken: jest.fn().mockResolvedValue('mock-access-token')
}))
// console sdk mock setup
jest.mock('@adobe/aio-lib-console')
const consoleSDK = require('@adobe/aio-lib-console')
const mockConsoleSDKInstance = {
  getOrganizations: jest.fn(),
  getProjectsForOrg: jest.fn(),
  getWorkspacesForProject: jest.fn(),
  getServicesForOrg: jest.fn(),
  createWorkspace: jest.fn(),
  createProject: jest.fn(),
  getWorkspace: jest.fn(),
  getProject: jest.fn(),
  createRuntimeNamespace: jest.fn(),
  downloadWorkspaceJson: jest.fn(),
  subscribeCredentialToServices: jest.fn(),
  getSDKProperties: jest.fn(),
  getIntegration: jest.fn(),
  createEnterpriseCredential: jest.fn(),
  getCredentials: jest.fn(),
  getEndPointsInWorkspace: jest.fn(),
  updateEndPointsInWorkspace: jest.fn(),
  getAllExtensionPoints: jest.fn(),
  checkOrgDevTerms: jest.fn(),
  getDevTerms: jest.fn(),
  acceptOrgDevTerms: jest.fn(),
  getBindingsForIntegration: jest.fn(),
  uploadAndBindCertificate: jest.fn(),
  deleteBinding: jest.fn()
}
consoleSDK.init.mockResolvedValue(mockConsoleSDKInstance)

beforeEach(async () => {
  jest.clearAllMocks()
  // Mock sdk calls
  mockConsoleSDKInstance.getWorkspacesForProject.mockResolvedValue({ body: dataMocks.workspaces })
  mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dataMocks.services })
  mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: dataMocks.integrations })
  mockConsoleSDKInstance.createRuntimeNamespace.mockResolvedValue({ body: dataMocks.runtimeNamespace })
  mockConsoleSDKInstance.createWorkspace.mockResolvedValue({ body: dataMocks.workspace })
  mockConsoleSDKInstance.createEnterpriseCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.subscribeCredentialToServices.mockResolvedValue({ body: dataMocks.subscribeServicesResponse })
})

describe('TemplateInstallManager', () => {
  test('Successfully install a template', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-full.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    const templateSuccess = await templateManager.installTemplate('343284', '4566206088344794932')
    expect(templateSuccess).toEqual('done')
  })

  test('Successfully install a template, minimum config', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    const templateSuccess = await templateManager.installTemplate('343284', '4566206088344794932')
    expect(templateSuccess).toEqual('done')
  })

  test('Successfully install a template, no credentials', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Mock sdk calls
    mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: [] })
    mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dataMocks.servicesNoProperties })

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-no-runtime.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    const templateSuccess = await templateManager.installTemplate('343284', '4566206088344794932')
    expect(templateSuccess).toEqual('done')
  })

  test('Successfully install a template with configured workspaces', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-workspaces.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    const templateSuccess = await templateManager.installTemplate('343284', '4566206088344794932')
    expect(templateSuccess).toEqual('done')
  })

  test('Successfully install a template with runtime disabled', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-runtime.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    const templateSuccess = await templateManager.installTemplate('343284', '4566206088344794932')
    expect(templateSuccess).toEqual('done')
  })

  test('Try to install a template with missing service code', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-service-code.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).rejects.toThrow('Service code "CampaignSDK" not found in the organization.')
  })

  test('Fail to subscribe API', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Mock sdk calls
    mockConsoleSDKInstance.subscribeCredentialToServices.mockImplementation(() => {
      throw new Error('Failed to subscribe API')
    })

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-full.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).rejects.toThrow()
  })
})
