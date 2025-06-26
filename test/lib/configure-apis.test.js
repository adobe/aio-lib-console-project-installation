const { configureAPIs } = require('../../src/lib/configure-apis')
const dataMocks = require('../data-mocks')

// console sdk mock setup
jest.mock('@adobe/aio-lib-console')
const consoleSDK = require('@adobe/aio-lib-console')
const mockConsoleSDKInstance = {
  getWorkspacesForProject: jest.fn(),
  getServicesForOrg: jest.fn(),
  subscribeCredentialToServices: jest.fn(),
  getSDKProperties: jest.fn(),
  getIntegration: jest.fn(),
  createOAuthServerToServerCredential: jest.fn(),
  createAdobeIdCredential: jest.fn(),
  getCredentials: jest.fn()
}
consoleSDK.init.mockResolvedValue(mockConsoleSDKInstance)

beforeEach(async () => {
  jest.clearAllMocks()
  // Mock sdk calls
  mockConsoleSDKInstance.getWorkspacesForProject.mockResolvedValue({ body: [dataMocks.workspaces[0]] })
  mockConsoleSDKInstance.getServicesForOrg.mockResolvedValue({ body: dataMocks.services })
  mockConsoleSDKInstance.getCredentials.mockResolvedValue({ body: dataMocks.integrations })
  mockConsoleSDKInstance.createOAuthServerToServerCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.createAdobeIdCredential.mockResolvedValue({ body: dataMocks.integrationCreateResponse })
  mockConsoleSDKInstance.subscribeCredentialToServices.mockResolvedValue({ body: dataMocks.subscribeServicesResponse })
})

describe('configureAPIs', () => {
  test('configures apis with product profile filter', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'AssetComputeSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'AssetComputeSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'AssetComputeSDK',
          licenseConfigs: [{ id: '0123456', op: 'add', productId: 'AAAAACCCCCCVV2EEEEE1E' }]
        })
      ])
    )
  })

  test('product profile filter for one sdk doesnt effect another', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'AssetComputeSDK'
      },
      {
        code: 'secondSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'AssetComputeSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'secondSDK',
          licenseConfigs: [
            {
              id: '1234567',
              productId: 'AAAAABBBBBVV2VVEEE1E',
              op: 'add'
            },
            {
              id: '7654321',
              productId: 'AAAAABBBBBVV2VVEEE1E',
              op: 'add'
            }
          ]
        })
      ])
    )
  })

  test('configures apis for sdks with no existing product profiles', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'thirdSDK'
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'thirdSDK',
          licenseConfigs: null
        })
      ])
    )
  })

  test('product profile filter for irrelevant api gets ignored', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'thirdSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'AssetComputeSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'thirdSDK',
          licenseConfigs: null
        })
      ])
    )
  })

  test('configure api for api with multiple credential types', async () => {
    const consoleClient = await consoleSDK.init()
    const apis = [
      {
        code: 'seventhSDK'
      }
    ]
    const productProfiles = [
      {
        sdkCode: 'seventhSDK',
        licenseConfigs: [
          {
            id: '0123456',
            name: 'config',
            productId: 'AAAAACCCCCCVV2EEEEE1E'
          }
        ]
      }
    ]
    await configureAPIs({
      consoleClient,
      orgId: dataMocks.project.org_id,
      projectId: dataMocks.project.id,
      apis,
      productProfiles
    })

    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledTimes(1)
    expect(consoleClient.subscribeCredentialToServices).toHaveBeenCalledWith(
      dataMocks.project.org_id,
      dataMocks.project.id,
      dataMocks.workspaces[0].id,
      dataMocks.integration.type,
      dataMocks.integration.id,
      expect.arrayContaining([
        expect.objectContaining({
          sdkCode: 'seventhSDK',
          licenseConfigs: null
        })
      ])
    )
  })
})
