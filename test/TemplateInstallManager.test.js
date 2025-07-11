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
  createOAuthServerToServerCredential: jest.fn(),
  createAdobeIdCredential: jest.fn(),
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
  mockConsoleSDKInstance.createOAuthServerToServerCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.createAdobeIdCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.subscribeCredentialToServices.mockResolvedValue({ body: dataMocks.subscribeServicesResponse })
})

describe('TemplateInstallManager', () => {
  test('Successfully install a template', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-full.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(2)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledTimes(5)
  })

  test('Successfully install a template, minimum config', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-minimum-valid.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
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
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
  })

  test('Successfully install a template with configured workspaces', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-workspaces.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
  })

  test('Successfully install a template, existing oauth creds', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Mock sdk calls
    mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: dataMocks.integrationOAuth })
    mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dataMocks.servicesNoProperties })

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-no-runtime.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
  })

  test('Successfully install a template, existing jwt and oauth creds', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Mock sdk calls
    mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: dataMocks.integrationsOAuthAndJwt })
    mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dataMocks.servicesNoProperties })

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-no-runtime.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
  })

  test('Successfully install a template with runtime disabled', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-runtime.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
  })

  test('Successfully install a template with AdobeId API', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-adobeid.yaml'))

    // covers a case when no adobeid credentials created for a workspace yet
    mockConsoleSDKInstance.getCredentials.mockResolvedValueOnce({ body: [] })

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(2)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledTimes(5)
  })

  test('Successfully install a template with multiple API Types', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-multiple-apis.yaml'))

    // covers a case when no adobeid credentials created for a workspace yet
    mockConsoleSDKInstance.getCredentials.mockResolvedValueOnce({ body: [] })

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(6)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).resolves.toBeUndefined()

    const adobeidServicesInfo = [{ licenseConfigs: null, name: 'API Mesh for Adobe Developer App Builder', roles: null, sdkCode: 'GraphQLServiceSDK' }, { licenseConfigs: null, name: 'Sixth SDK', roles: null, sdkCode: 'sixthSDK' }]
    const entpServicesInfo = [{
      licenseConfigs: [{ id: '0123456', op: 'add', productId: 'AAAAACCCCCCVV2EEEEE1E' }, { id: '0123457', op: 'add', productId: 'AAAAACCCCCCVV2EEEEE1E' }],
      name: 'First SDK',
      roles: [{ code: 'ent_somerole', id: 1000, name: null }, { code: 'ent_role_a', id: 1100, name: null }],
      sdkCode: 'AssetComputeSDK'
    },
    {
      licenseConfigs: [{ id: '1234567', op: 'add', productId: 'AAAAABBBBBVV2VVEEE1E' }, { id: '7654321', op: 'add', productId: 'AAAAABBBBBVV2VVEEE1E' }],
      name: 'Second SDK',
      roles: [{ code: 'ent_someotherrole', id: 1001, name: null }, { code: 'ent_someotherrole', id: 1002, name: null }],
      sdkCode: 'secondSDK'
    }]

    // Production workspace
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledWith('343284', '4566206088344794932', '1111111111111111111', 'entp', '222222', entpServicesInfo)
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledWith('343284', '4566206088344794932', '1111111111111111111', 'adobeid', '44444', adobeidServicesInfo)

    // Staging workspace
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledWith('343284', '4566206088344794932', '1111111111111111112', 'entp', '222222', entpServicesInfo)
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledWith('343284', '4566206088344794932', '1111111111111111112', 'adobeid', '44444', adobeidServicesInfo)
    expect(mockConsoleSDKInstance.subscribeCredentialToServices).toHaveBeenCalledTimes(10)
  })

  test('Try to install a template with an unsupported service type', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-unsupported-service-type.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    expect.assertions(1)
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).rejects.toThrow('Service code "UnsupportedSDK" with one of the following types entp,adobeid not found in the organization.')
  })

  test('Try to install a template with missing service code', async () => {
    // Instantiate Adobe Developer Console SDK
    const accessToken = await getToken(CLI)

    // Instantiate App Builder Template Manager
    const templateManager = await templateHandler.init(accessToken, path.join(__dirname, '/fixtures/templateConfig-console-api-service-code.yaml'))

    // Org: DevX Acceleration Prod, Project: Commerce IO Extensions
    await expect(templateManager.installTemplate('343284', '4566206088344794932')).rejects.toThrow('Service code "CampaignSDK" with one of the following types entp,adobeid not found in the organization.')
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
